import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { formatMobileForDisplay } from '../../lib/utils';
import { api } from '../../lib/api';
import { UserMinus, Calendar, Download } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { FALLBACK_RENEWAL_CHURN, formatMonthLabel, reportMonthOptions, type RenewalChurnData } from '../../lib/adminReportData';
import { TablePaginationBar, useTablePagination } from '../../components/TablePagination';

/** User from GET /admin/users with tokens for expiry. */
interface UserWithTokens {
  id: string;
  full_name?: string;
  mobile?: string | null;
  user_tokens?: { expiry_date?: string; remaining_tokens?: number; expires_at?: string }[];
}

/** Order row for renewal check: paid in a given month => user renewed. */
interface OrderForRenewal {
  user_id?: string;
  user_ID?: string | number;
  userId?: string;
  user_name?: string;
  user_mobile?: string | null;
  payment_status?: string | number;
  paid_at?: string | null;
  created_at?: string;
}

function getMonthKey(isoOrDateStr: string | null | undefined): string | null {
  if (!isoOrDateStr) return null;
  const d = new Date(isoOrDateStr);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function isPaid(status: string | number | undefined): boolean {
  if (status === undefined || status === null) return false;
  if (status === 'paid' || status === 'not_required') return true;
  if (status === 1 || status === '1' || status === true) return true;
  return false;
}

/** Extract user id from order (backend may use user_id, user_ID, userId). */
function orderUserId(o: OrderForRenewal): string | null {
  const id = o.user_id ?? o.user_ID ?? o.userId;
  if (id != null && id !== '') return String(id);
  return null;
}

/** Default token validity in months when deriving expiry from order date (fallback when user_tokens not in API). */
const DEFAULT_TOKEN_VALIDITY_MONTHS = 6;

/** Normalize token expiry date string from various possible keys. */
function tokenExpiryStr(t: { expiry_date?: string; expires_at?: string }): string | undefined {
  const s = t.expiry_date ?? t.expires_at;
  if (!s || typeof s !== 'string') return undefined;
  return s.slice(0, 10);
}

/** Build renewal/churn from DB: users (with token expiry) + orders. Compares current month vs previous month. */
function buildRenewalChurnFromData(
  users: UserWithTokens[],
  orders: OrderForRenewal[],
  reportMonth: string
): RenewalChurnData {
  const [y, m] = reportMonth.split('-').map(Number);
  const prevMonthNum = m === 1 ? 12 : m - 1;
  const prevYear = m === 1 ? y - 1 : y;
  const prevMonthKey = `${prevYear}-${String(prevMonthNum).padStart(2, '0')}`;
  const prevPrevMonthNum = prevMonthNum === 1 ? 12 : prevMonthNum - 1;
  const prevPrevYear = prevMonthNum === 1 ? prevYear - 1 : prevYear;
  const prevPrevMonthKey = `${prevPrevYear}-${String(prevPrevMonthNum).padStart(2, '0')}`;

  const tokenExpiresInMonth = (expiryDate: string | undefined, monthKey: string): boolean => {
    if (!expiryDate) return false;
    const exp = expiryDate.slice(0, 7);
    return exp === monthKey;
  };

  /** Users who have at least one token expiring in monthKey (from user_tokens). */
  const userIdsExpiringInMonthFromTokens = (monthKey: string): Set<string> => {
    const set = new Set<string>();
    users.forEach((u) => {
      const tokens = u.user_tokens || [];
      const hasExpiryInMonth = tokens.some((t) => tokenExpiresInMonth(tokenExpiryStr(t), monthKey));
      if (hasExpiryInMonth) set.add(String(u.id));
    });
    return set;
  };

  /** Users who "have token expiring in monthKey" derived from orders (each order date + validity). Fallback when user_tokens empty. */
  const userIdsExpiringInMonthFromOrders = (monthKey: string): Set<string> => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (!isPaid(o.payment_status)) return;
      const uid = orderUserId(o);
      if (!uid) return;
      const date = o.paid_at ? new Date(o.paid_at) : o.created_at ? new Date(o.created_at) : null;
      if (!date || Number.isNaN(date.getTime())) return;
      const expiry = new Date(date.getFullYear(), date.getMonth() + DEFAULT_TOKEN_VALIDITY_MONTHS, date.getDate());
      const expKey = `${expiry.getFullYear()}-${String(expiry.getMonth() + 1).padStart(2, '0')}`;
      if (expKey === monthKey) set.add(uid);
    });
    return set;
  };

  const hasAnyTokenExpiryFromUsers = users.some((u) => (u.user_tokens || []).some((t) => tokenExpiryStr(t)));
  const userIdsExpiringInMonth = (monthKey: string): Set<string> =>
    hasAnyTokenExpiryFromUsers ? userIdsExpiringInMonthFromTokens(monthKey) : userIdsExpiringInMonthFromOrders(monthKey);

  const userIdsWhoPaidInMonth = (monthKey: string): Set<string> => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (!isPaid(o.payment_status)) return;
      const uid = orderUserId(o);
      if (!uid) return;
      const date = o.paid_at ? new Date(o.paid_at) : o.created_at ? new Date(o.created_at) : null;
      if (!date) return;
      const key = getMonthKey(date.toISOString());
      if (key === monthKey) set.add(uid);
    });
    return set;
  };

  const totalExpiring = userIdsExpiringInMonth(reportMonth).size;
  const expiredLastMonth = userIdsExpiringInMonth(prevMonthKey);
  const renewedInCurrent = userIdsWhoPaidInMonth(reportMonth);
  const renewedCount = [...expiredLastMonth].filter((id) => renewedInCurrent.has(id)).length;
  const churnCount = expiredLastMonth.size - renewedCount;
  const base = renewedCount + churnCount;
  const renewalRate = base > 0 ? (renewedCount / base) * 100 : 0;
  const churnRate = base > 0 ? (churnCount / base) * 100 : 0;

  const churnedUserIds = new Set([...expiredLastMonth].filter((id) => !renewedInCurrent.has(id)));
  const userById = new Map(users.map((u) => [String(u.id), u]));
  const orderUserInfo = new Map<string, { name: string; mobile: string }>();
  orders.forEach((o) => {
    const uid = orderUserId(o);
    if (!uid) return;
    const name = (o.user_name ?? '').trim() || (orderUserInfo.get(uid)?.name ?? '');
    const mobile = o.user_mobile ?? (orderUserInfo.get(uid)?.mobile ?? '');
    if (name || mobile) orderUserInfo.set(uid, { name: name || (orderUserInfo.get(uid)?.name ?? ''), mobile: mobile || (orderUserInfo.get(uid)?.mobile ?? '') });
  });
  const churnList: RenewalChurnData['churnList'] = [];
  churnedUserIds.forEach((userId) => {
    const u = userById.get(userId);
    const fromOrder = orderUserInfo.get(userId);
    const full_name = u?.full_name ?? fromOrder?.name ?? '';
    const mobile = u?.mobile ?? fromOrder?.mobile ?? '';
    let expiry_date = `${prevMonthKey}-01`;
    if (u?.user_tokens?.length) {
      const tokens = (u.user_tokens || []).filter((t) => tokenExpiresInMonth(tokenExpiryStr(t), prevMonthKey));
      if (tokens[0]) expiry_date = tokenExpiryStr(tokens[0]) ?? expiry_date;
    }
    churnList.push({
      id: userId,
      full_name,
      mobile,
      expiry_date: expiry_date.slice(0, 10),
      churn_reason: 'other',
    });
  });

  const monthlyTrend: RenewalChurnData['monthlyTrend'] = [
    {
      month: prevMonthKey,
      expiring: userIdsExpiringInMonth(prevMonthKey).size,
      renewed: [...userIdsExpiringInMonth(prevPrevMonthKey)].filter((id) => userIdsWhoPaidInMonth(prevMonthKey).has(id)).length,
      churned: userIdsExpiringInMonth(prevPrevMonthKey).size - [...userIdsExpiringInMonth(prevPrevMonthKey)].filter((id) => userIdsWhoPaidInMonth(prevMonthKey).has(id)).length,
    },
    {
      month: reportMonth,
      expiring: totalExpiring,
      renewed: renewedCount,
      churned: churnCount,
    },
  ];

  return {
    totalExpiring,
    renewedCount,
    renewalRate,
    churnCount,
    churnRate,
    churnReasons: churnCount > 0 ? [{ reason: 'other', reasonKey: 'other', count: churnCount }] : [],
    monthlyTrend,
    churnList,
  };
}

export default function AdminRenewalChurnPage() {
  const { t } = useTranslation();
  const [renewalChurn, setRenewalChurn] = useState<RenewalChurnData | null>(null);
  const [reportMonth, setReportMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const [y, m] = reportMonth.split('-').map(Number);
    const prevYear = m === 1 ? y - 1 : y;
    const prevMonth = m === 1 ? 12 : m - 1;
    const fromDate = new Date(prevYear, prevMonth - 1 - 1, 1);
    const toDate = new Date(y, m, 0);
    const fromStr = fromDate.toISOString().slice(0, 10);
    const toStr = toDate.toISOString().slice(0, 10);

    Promise.all([
      api.get<UserWithTokens[]>('/admin/users', { demo: '1' }).then((r: any) => (Array.isArray(r?.data) ? r.data : [])),
      api.get<OrderForRenewal[]>('/admin/orders', { from: fromStr, to: toStr, demo: '1' }).then((r: any) => (Array.isArray(r?.data) ? r.data : [])),
    ])
      .then(([users, orders]) => {
        setRenewalChurn(buildRenewalChurnFromData(users, orders, reportMonth));
      })
      .catch(() => setRenewalChurn(FALLBACK_RENEWAL_CHURN))
      .finally(() => setLoading(false));
  }, [reportMonth]);

  const getChurnReasonLabel = (key: string) => {
    const map: Record<string, string> = {
      price: t('admin.dashboard.reasonPrice'),
      schedule: t('admin.dashboard.reasonSchedule'),
      relocation: t('admin.dashboard.reasonRelocation'),
      other: t('admin.dashboard.reasonOther'),
    };
    return map[key] || key;
  };

  const exportChurnListCsv = () => {
    if (!renewalChurn?.churnList?.length) return;
    const headers = [t('admin.dashboard.name'), t('admin.dashboard.mobile'), t('admin.dashboard.expiryDate'), t('admin.dashboard.churnReason')];
    const rows = renewalChurn.churnList.map((r) => [
      r.full_name,
      formatMobileForDisplay(r.mobile, ''),
      r.expiry_date,
      getChurnReasonLabel(r.churn_reason),
    ]);
    const csv = [headers.join(','), ...rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `churn-list-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const churnListRows = renewalChurn?.churnList ?? [];
  const {
    page: churnPage,
    setPage: setChurnPage,
    totalPages: churnTotalPages,
    pageSize: churnPageSize,
    totalItems: churnTotalItems,
    paginatedItems: paginatedChurn,
  } = useTablePagination(churnListRows, undefined, [reportMonth]);

  if (loading || !renewalChurn) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <UserMinus className="h-7 w-7 text-primary" />
            {t('admin.dashboard.renewalChurn')}
          </h1>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <select
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[140px]"
            >
              {reportMonthOptions().map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={exportChurnListCsv}
              disabled={!renewalChurn?.churnList?.length}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              {t('admin.dashboard.exportCsv')}
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-600">{t('admin.dashboard.renewalChurnDesc')}</p>
        <p className="text-xs text-gray-500">{t('admin.dashboard.renewalChurnDataSource')}</p>

        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600">{t('admin.dashboard.totalExpiring')}</h3>
            <div className="text-2xl font-bold text-gray-900 mt-1">{renewalChurn.totalExpiring}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border border-green-100 bg-green-50/50">
            <h3 className="text-sm font-medium text-gray-600">{t('admin.dashboard.renewedCount')}</h3>
            <div className="text-2xl font-bold text-gray-900 mt-1">{renewalChurn.renewedCount}</div>
            <div className="text-sm text-green-600 mt-0.5">{renewalChurn.renewalRate.toFixed(1)}% {t('admin.dashboard.renewalRate')}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border border-red-100 bg-red-50/50">
            <h3 className="text-sm font-medium text-gray-600">{t('admin.dashboard.churnCount')}</h3>
            <div className="text-2xl font-bold text-gray-900 mt-1">{renewalChurn.churnCount}</div>
            <div className="text-sm text-red-600 mt-0.5">{renewalChurn.churnRate.toFixed(1)}% {t('admin.dashboard.churnRate')}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600">{t('admin.dashboard.churnReasons')}</h3>
            <div className="text-lg font-bold text-gray-900 mt-1">{renewalChurn.churnReasons.length} {t('admin.dashboard.churnReasons')}</div>
          </div>
        </div>

        {renewalChurn.monthlyTrend.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">{t('admin.dashboard.monthlyTrendRenewalChurn')}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={renewalChurn.monthlyTrend.map((d) => ({ ...d, label: formatMonthLabel(d.month) }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="expiring" name={t('admin.dashboard.totalExpiring')} fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="renewed" name={t('admin.dashboard.renewedCount')} fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="churned" name={t('admin.dashboard.churnCount')} fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-700">{t('admin.dashboard.churnListDetail')}</h3>
            <button
              type="button"
              onClick={exportChurnListCsv}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary/5"
            >
              <Download className="h-4 w-4" />
              {t('admin.dashboard.exportChurnList')}
            </button>
          </div>
          {renewalChurn.churnList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-600">
                    <th className="py-2 pr-4">{t('admin.dashboard.name')}</th>
                    <th className="py-2 pr-4">{t('admin.dashboard.mobile')}</th>
                    <th className="py-2 pr-4">{t('admin.dashboard.expiryDate')}</th>
                    <th className="py-2">{t('admin.dashboard.churnReason')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedChurn.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100">
                      <td className="py-2 pr-4 font-medium text-gray-900">{r.full_name}</td>
                      <td className="py-2 pr-4">{formatMobileForDisplay(r.mobile, '–')}</td>
                      <td className="py-2 pr-4">{r.expiry_date}</td>
                      <td className="py-2">{getChurnReasonLabel(r.churn_reason)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <TablePaginationBar
                page={churnPage}
                totalPages={churnTotalPages}
                totalItems={churnTotalItems}
                pageSize={churnPageSize}
                onPageChange={setChurnPage}
              />
            </div>
          ) : (
            <p className="text-gray-500 text-sm py-8 text-center">{t('admin.dashboard.noData')}</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
