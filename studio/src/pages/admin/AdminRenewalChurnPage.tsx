import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { api } from '../../lib/api';
import { UserMinus, Calendar, Download } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { FALLBACK_RENEWAL_CHURN, formatMonthLabel, reportMonthOptions, type RenewalChurnData } from '../../lib/adminReportData';

export default function AdminRenewalChurnPage() {
  const { t } = useTranslation();
  const [renewalChurn, setRenewalChurn] = useState<RenewalChurnData | null>(null);
  const [reportMonth, setReportMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const monthParam = reportMonth ? `&month=${encodeURIComponent(reportMonth)}` : '';
    api.get<RenewalChurnData>(`admin/renewal-churn?demo=1${monthParam}`)
      .then((res: any) => {
        if (res?.success && res?.data) setRenewalChurn(res.data);
        else setRenewalChurn(FALLBACK_RENEWAL_CHURN);
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
      r.mobile,
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
          </div>
        </div>

        <p className="text-sm text-gray-600">{t('admin.dashboard.renewalChurnDesc')}</p>

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
                  {renewalChurn.churnList.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100">
                      <td className="py-2 pr-4 font-medium text-gray-900">{r.full_name}</td>
                      <td className="py-2 pr-4">{r.mobile}</td>
                      <td className="py-2 pr-4">{r.expiry_date}</td>
                      <td className="py-2">{getChurnReasonLabel(r.churn_reason)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-sm py-8 text-center">{t('admin.dashboard.noData')}</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
