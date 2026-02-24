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

/** Demo: 每月收入 */
const DEMO_MONTHLY_REVENUE = (() => {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { month: label, revenue: 38000 + Math.round(Math.random() * 12000) };
  });
})();

/** Demo: 每班出席率 */
const DEMO_CLASS_ATTENDANCE = [
  { name: '兒童芭蕾 A', rate: 92, attended: 22, total: 24 },
  { name: '兒童爵士 B', rate: 88, attended: 14, total: 16 },
  { name: '幼兒律動', rate: 95, attended: 19, total: 20 },
  { name: '青少年街舞', rate: 85, attended: 17, total: 20 },
  { name: '中國舞 C', rate: 90, attended: 18, total: 20 },
];

/** Demo: 試堂轉正價比例 */
const DEMO_TRIAL_CONVERSION = { trials: 48, enrolled: 18, rate: 37.5 };

/** Demo: 代幣消耗（近月） */
const DEMO_TOKEN_CONSUMPTION = (() => {
  const now = new Date();
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (4 - i), 1);
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { month: label, consumed: 120 + Math.round(Math.random() * 40), purchased: 150 + Math.round(Math.random() * 30) };
  });
})();

const PIE_COLORS = ['#1a365d', '#2c5282', '#2b6cb0', '#3182ce', '#4299e1'];

export default function ReportsPage() {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ month: string; revenue: number }[]>([]);
  const [classAttendance, setClassAttendance] = useState<{ name: string; rate: number; attended: number; total: number }[]>([]);
  const [trialConversion, setTrialConversion] = useState(DEMO_TRIAL_CONVERSION);
  const [tokenConsumption, setTokenConsumption] = useState<{ month: string; consumed: number; purchased: number }[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [revRes, attRes, tokRes] = await Promise.all([
          api.get<{ monthly: { month: string; revenue: number }[] }>('/admin/reports/monthly-revenue?demo=1').catch(() => ({ data: { monthly: DEMO_MONTHLY_REVENUE } })),
          api.get<{ byClass: { name: string; rate: number; attended: number; total: number }[] }>('/admin/reports/class-attendance?demo=1').catch(() => ({ data: { byClass: DEMO_CLASS_ATTENDANCE } })),
          api.get<{ monthly: { month: string; consumed: number; purchased: number }[] }>('/admin/reports/token-consumption?demo=1').catch(() => ({ data: { monthly: DEMO_TOKEN_CONSUMPTION } })),
        ]);
        const revData = (revRes as any).data?.monthly ?? DEMO_MONTHLY_REVENUE;
        const attData = (attRes as any).data?.byClass ?? DEMO_CLASS_ATTENDANCE;
        const tokData = (tokRes as any).data?.monthly ?? DEMO_TOKEN_CONSUMPTION;
        setMonthlyRevenue(Array.isArray(revData) ? revData : DEMO_MONTHLY_REVENUE);
        setClassAttendance(Array.isArray(attData) ? attData : DEMO_CLASS_ATTENDANCE);
        setTokenConsumption(Array.isArray(tokData) ? tokData : DEMO_TOKEN_CONSUMPTION);
      } catch {
        setMonthlyRevenue(DEMO_MONTHLY_REVENUE);
        setClassAttendance(DEMO_CLASS_ATTENDANCE);
        setTokenConsumption(DEMO_TOKEN_CONSUMPTION);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
                {classAttendance.map((row) => (
                  <tr key={row.name} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{row.name}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-900">{row.rate}%</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-600">{row.attended} / {row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
