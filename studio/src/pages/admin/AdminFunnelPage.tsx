import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { formatCurrency } from '../../lib/utils';
import { api } from '../../lib/api';
import { Target, Calendar } from 'lucide-react';
import { FALLBACK_FUNNEL, reportMonthOptions, type ConversionFunnelData } from '../../lib/adminReportData';

export default function AdminFunnelPage() {
  const { t } = useTranslation();
  const [funnel, setFunnel] = useState<ConversionFunnelData | null>(null);
  const [reportMonth, setReportMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const monthParam = reportMonth ? `&month=${encodeURIComponent(reportMonth)}` : '';
    api.get<ConversionFunnelData>(`admin/conversion-funnel?demo=1${monthParam}`)
      .then((res: any) => {
        if (res?.success && res?.data) setFunnel(res.data);
        else setFunnel(FALLBACK_FUNNEL);
      })
      .catch(() => setFunnel(FALLBACK_FUNNEL))
      .finally(() => setLoading(false));
  }, [reportMonth]);

  if (loading || !funnel) {
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
            <Target className="h-7 w-7 text-primary" />
            {t('admin.dashboard.conversionFunnel')}
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

        <div className="space-y-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
              <h3 className="text-sm font-medium text-gray-600">{t('admin.dashboard.totalTrials')}</h3>
              <div className="text-2xl font-bold text-gray-900 mt-1">{funnel.totalTrialCount}</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
              <h3 className="text-sm font-medium text-gray-600">{t('admin.dashboard.trialToEnrollmentRate')}</h3>
              <div className="text-2xl font-bold text-primary mt-1">{funnel.trialToEnrollmentRate.toFixed(1)}%</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
              <h3 className="text-sm font-medium text-gray-600">{t('admin.dashboard.newEnrollments')}</h3>
              <div className="text-2xl font-bold text-gray-900 mt-1">{funnel.newEnrollmentCount}</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
              <h3 className="text-sm font-medium text-gray-600">{t('admin.dashboard.relatedRevenue')}</h3>
              <div className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(funnel.relatedRevenue)}</div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">{t('admin.dashboard.conversionFunnel')}</h3>
              {funnel.funnelStages.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500 mb-3">{t('admin.dashboard.conversionFunnelDesc')}</p>
                  <div className="flex flex-col sm:flex-row items-stretch gap-3">
                    {funnel.funnelStages.map((stage) => (
                      <div key={stage.nameKey} className="flex-1 flex flex-col items-center justify-center rounded-lg border-2 border-primary/30 bg-primary/5 p-4 min-h-[100px]">
                        <span className="text-2xl font-bold text-primary">{stage.value}</span>
                        <span className="text-sm font-medium text-gray-700 mt-1">{t(`admin.dashboard.funnelStage.${stage.nameKey}`)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-center pt-2">
                    <span className="text-sm font-semibold text-primary">{t('admin.dashboard.trialToEnrollmentRate')}: {funnel.trialToEnrollmentRate.toFixed(1)}%</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm py-8 text-center">{t('admin.dashboard.noData')}</p>
              )}
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">{t('admin.dashboard.trialsByChannel')}</h3>
              {funnel.byChannel.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-600">
                        <th className="py-2 pr-4">{t('admin.dashboard.channel')}</th>
                        <th className="py-2 pr-4">{t('admin.dashboard.trialCount')}</th>
                        <th className="py-2 pr-4">{t('admin.dashboard.enrollmentCount')}</th>
                        <th className="py-2 pr-4">{t('admin.dashboard.conversionRate')}</th>
                        <th className="py-2">{t('admin.dashboard.revenue')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {funnel.byChannel.map((row, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-2 pr-4 font-medium text-gray-900">{row.channel}</td>
                          <td className="py-2 pr-4">{row.trialCount}</td>
                          <td className="py-2 pr-4">{row.enrollmentCount}</td>
                          <td className="py-2 pr-4">{row.conversionRate.toFixed(1)}%</td>
                          <td className="py-2">{formatCurrency(row.revenue)}</td>
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
        </div>
      </div>
    </Layout>
  );
}
