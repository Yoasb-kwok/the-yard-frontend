import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { formatCurrency } from '../../lib/utils';
import { api } from '../../lib/api';
import { BarChart2, TrendingUp, Users, Coins, PieChart as PieChartIcon } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { TablePaginationBar, useTablePagination } from '../../components/TablePagination';

const PIE_COLORS = ['#1a365d', '#2c5282', '#2b6cb0', '#3182ce', '#4299e1'];

export default function ReportsPage() {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ month: string; revenue: number }[]>([]);
  const [classAttendance, setClassAttendance] = useState<{ name: string; rate: number; attended: number; total: number }[]>([]);
  const [trialConversion, setTrialConversion] = useState({ trials: 0, enrolled: 0, rate: 0 });
  const [tokenConsumption, setTokenConsumption] = useState<{ month: string; consumed: number; purchased: number }[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [revRes, attRes, tokRes] = await Promise.all([
          api.get<{ monthly: { month: string; revenue: number }[] }>('/admin/reports/monthly-revenue'),
          api.get<{ byClass: { name: string; rate: number; attended: number; total: number }[] }>('/admin/reports/class-attendance'),
          api.get<{ monthly: { month: string; consumed: number; purchased: number }[] }>('/admin/reports/token-consumption'),
        ]);
        const revData = (revRes as any).data?.monthly;
        const attData = (attRes as any).data?.byClass;
        const tokData = (tokRes as any).data?.monthly;
        setMonthlyRevenue(Array.isArray(revData) ? revData : []);
        setClassAttendance(Array.isArray(attData) ? attData : []);
        setTokenConsumption(Array.isArray(tokData) ? tokData : []);
      } catch {
        setMonthlyRevenue([]);
        setClassAttendance([]);
        setTokenConsumption([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const {
    page: reportAttPage,
    setPage: setReportAttPage,
    totalPages: reportAttTotalPages,
    pageSize: reportAttPageSize,
    totalItems: reportAttTotalItems,
    paginatedItems: paginatedClassAttendance,
  } = useTablePagination(classAttendance, undefined, [classAttendance]);

  if (loading) {
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
      <div className="space-y-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('admin.reports.title')}</h1>
        <p className="text-gray-600 text-sm">{t('admin.reports.description')}</p>

        {/* 每月收入 */}
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary" />
            {t('admin.reports.monthlyRevenue')}
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip formatter={(value: number) => [formatCurrency(value), t('admin.reports.revenue')]} labelFormatter={(l) => t('admin.reports.month') + ' ' + l} />
                <Bar dataKey="revenue" fill="#1a365d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 每班出席率 */}
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t('admin.reports.classAttendance')}
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.reports.className')}</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t('admin.reports.attendanceRate')}</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t('admin.reports.attendedTotal')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedClassAttendance.map((row) => (
                  <tr key={row.name} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{row.name}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-900">{row.rate}%</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-600">{row.attended} / {row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePaginationBar
              page={reportAttPage}
              totalPages={reportAttTotalPages}
              totalItems={reportAttTotalItems}
              pageSize={reportAttPageSize}
              onPageChange={setReportAttPage}
            />
          </div>
        </section>

        {/* 試堂轉正價比例 */}
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t('admin.reports.trialConversion')}
          </h2>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold text-primary">{trialConversion.rate}%</div>
              <div className="text-sm text-gray-600">
                {t('admin.reports.trialConversionDesc', { enrolled: trialConversion.enrolled, trials: trialConversion.trials })}
              </div>
            </div>
            <div className="h-32 w-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: t('admin.reports.trials'), value: trialConversion.trials - trialConversion.enrolled, fill: PIE_COLORS[1] },
                      { name: t('admin.reports.enrolled'), value: trialConversion.enrolled, fill: PIE_COLORS[0] },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={32}
                    outerRadius={48}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name} ${value}`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* 代幣消耗 */}
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            {t('admin.reports.tokenConsumption')}
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tokenConsumption} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="consumed" name={t('admin.reports.tokensConsumed')} fill="#2b6cb0" radius={[4, 4, 0, 0]} />
                <Bar dataKey="purchased" name={t('admin.reports.tokensPurchased')} fill="#4299e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </Layout>
  );
}
