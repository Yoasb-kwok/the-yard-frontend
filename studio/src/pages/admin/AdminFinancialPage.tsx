import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { formatCurrency } from '../../lib/utils';
import { api } from '../../lib/api';
import { PieChart as PieChartIcon, Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  FALLBACK_FINANCIAL,
  CHART_COLORS,
  formatMonthLabel,
  reportMonthOptions,
  type FinancialDashboardData,
} from '../../lib/adminReportData';

/** Order row from GET /api/admin/orders (purchase records). */
interface OrderRow {
  id?: string;
  order_id?: string;
  total?: number;
  subtotal?: number;
  discount?: number;
  payment_status?: string;
  payment_method?: string | null;
  package_id?: string;
  package_name?: string;
  created_at?: string;
  paid_at?: string | null;
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/** Get YYYY-MM for a date (order's paid_at or created_at). */
function getMonthKey(isoOrDateStr: string | null | undefined): string | null {
  if (!isoOrDateStr) return null;
  const d = new Date(isoOrDateStr);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function isPaid(status: string | undefined): boolean {
  return status === 'paid' || status === 'not_required';
}

/** Build financial dashboard from purchase records (orders). Revenue = sum of total for paid orders. */
function buildFinancialFromOrders(
  orders: OrderRow[],
  reportMonth: string
): FinancialDashboardData {
  const paid = orders.filter((o) => isPaid(o.payment_status));
  const [y, m] = reportMonth.split('-').map(Number);
  const thisMonthStart = new Date(y, m - 1, 1);
  const thisMonthEnd = new Date(y, m, 0, 23, 59, 59);
  const lastMonthStart = new Date(y, m - 2, 1);
  const lastMonthEnd = new Date(y, m - 1, 0, 23, 59, 59);
  const sameMonthLastYearStart = new Date(y - 1, m - 1, 1);
  const sameMonthLastYearEnd = new Date(y - 1, m, 0, 23, 59, 59);

  const inMonth = (d: Date, start: Date, end: Date) => d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
  const toDate = (o: OrderRow) => (o.paid_at ? new Date(o.paid_at) : o.created_at ? new Date(o.created_at) : null);

  let revenueThisMonth = 0;
  let revenueLastMonth = 0;
  let revenueSameMonthLastYear = 0;
  let totalDiscountThisMonth = 0;
  const byPackage: Record<string, number> = {};
  const byPayment: Record<string, { total: number; count: number }> = {};
  const byMonth: Record<string, number> = {};

  for (const o of paid) {
    const total = Number(o.total) || 0;
    const discount = Number(o.discount) || 0;
    const date = toDate(o);
    if (!date) continue;
    const monthKey = getMonthKey(date.toISOString());
    if (monthKey) byMonth[monthKey] = (byMonth[monthKey] || 0) + total;

    if (inMonth(date, thisMonthStart, thisMonthEnd)) {
      revenueThisMonth += total;
      totalDiscountThisMonth += discount;
      const pkg = o.package_name || o.package_id || 'other';
      byPackage[pkg] = (byPackage[pkg] || 0) + total;
      const method = o.payment_method || 'other';
      if (!byPayment[method]) byPayment[method] = { total: 0, count: 0 };
      byPayment[method].total += total;
      byPayment[method].count += 1;
    } else if (inMonth(date, lastMonthStart, lastMonthEnd)) {
      revenueLastMonth += total;
    } else if (inMonth(date, sameMonthLastYearStart, sameMonthLastYearEnd)) {
      revenueSameMonthLastYear += total;
    }
  }

  const revenueByPackage = Object.entries(byPackage).map(([name, total]) => ({ name, total }));
  const paymentMethodDistribution = Object.entries(byPayment).map(([method, v]) => ({
    method,
    total: v.total,
    count: v.count,
  }));

  const trendMonths = reportMonthOptions()
    .filter((opt) => opt.value <= reportMonth)
    .slice(-12)
    .map((opt) => opt.value);
  const monthlyTrend = trendMonths.map((month) => ({
    month,
    revenue: byMonth[month] || 0,
  }));

  const revenueWithDiscount = revenueThisMonth + totalDiscountThisMonth;
  const discountPercentage = revenueWithDiscount > 0 ? (totalDiscountThisMonth / revenueWithDiscount) * 100 : 0;

  return {
    revenueThisMonth,
    revenueLastMonth,
    revenueSameMonthLastYear,
    totalDiscountThisMonth,
    discountPercentage,
    revenueByPackage,
    paymentMethodDistribution,
    monthlyTrend,
  };
}

export default function AdminFinancialPage() {
  const { t, i18n } = useTranslation();
  const [financial, setFinancial] = useState<FinancialDashboardData | null>(null);
  const [reportMonth, setReportMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const [y, m] = reportMonth.split('-').map(Number);
    const fromDate = new Date(y, m - 1 - 12, 1);
    const toDate = new Date(y, m, 0);
    const fromStr = fromDate.toISOString().slice(0, 10);
    const toStr = toDate.toISOString().slice(0, 10);

    api
      .get<OrderRow[]>('/admin/orders', { from: fromStr, to: toStr })
      .then((res: any) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        setFinancial(buildFinancialFromOrders(list, reportMonth));
      })
      .catch(() => setFinancial(FALLBACK_FINANCIAL))
      .finally(() => setLoading(false));
  }, [reportMonth]);

  if (loading || !financial) {
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
            <PieChartIcon className="h-7 w-7 text-primary" />
            {t('admin.dashboard.financialDashboard')}
          </h1>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <select
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              aria-label={t('admin.dashboard.reportMonth')}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[140px]"
            >
              {reportMonthOptions().map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
              <h3 className="text-sm font-medium text-gray-600">{t('admin.dashboard.revenueThisMonth')}</h3>
              <div className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(financial.revenueThisMonth)}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-medium text-gray-600">{t('admin.dashboard.vsLastMonth')}</h3>
              {(() => {
                const pct = pctChange(financial.revenueThisMonth, financial.revenueLastMonth);
                const Icon = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus;
                const color = pct > 0 ? 'text-green-600' : pct < 0 ? 'text-red-600' : 'text-gray-500';
                return (
                  <div className={`flex items-center gap-1 mt-1 text-xl font-bold ${color}`}>
                    <Icon className="h-5 w-5" />
                    {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
                  </div>
                );
              })()}
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-medium text-gray-600">{t('admin.dashboard.vsSameMonthLastYear')}</h3>
              {(() => {
                const pct = pctChange(financial.revenueThisMonth, financial.revenueSameMonthLastYear);
                const Icon = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus;
                const color = pct > 0 ? 'text-green-600' : pct < 0 ? 'text-red-600' : 'text-gray-500';
                return (
                  <div className={`flex items-center gap-1 mt-1 text-xl font-bold ${color}`}>
                    <Icon className="h-5 w-5" />
                    {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">{t('admin.dashboard.monthlyTrend')}</h3>
              {financial.monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={financial.monthlyTrend.map((d) => ({ ...d, label: formatMonthLabel(d.month) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']} labelFormatter={(l) => l} />
                    <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-sm py-8 text-center">{t('admin.dashboard.noData')}</p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">{t('admin.dashboard.revenueByPackage')}</h3>
              {financial.revenueByPackage.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={financial.revenueByPackage}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {financial.revenueByPackage.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-sm py-8 text-center">{t('admin.dashboard.noData')}</p>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">{t('admin.dashboard.discountTotalAndShare')}</h3>
              <div className="flex gap-6">
                <div>
                  <span className="text-xs text-gray-500">{t('admin.dashboard.totalDiscount')}</span>
                  <div className="text-lg font-semibold text-gray-900">{formatCurrency(financial.totalDiscountThisMonth)}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">{t('admin.dashboard.discountShare')}</span>
                  <div className="text-lg font-semibold text-gray-900">{financial.discountPercentage.toFixed(1)}%</div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">{t('admin.dashboard.paymentMethodDistribution')}</h3>
              {financial.paymentMethodDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={financial.paymentMethodDistribution.map((d) => ({ name: d.method || 'other', value: d.total }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {financial.paymentMethodDistribution.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-sm py-6 text-center">{t('admin.dashboard.noData')}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
