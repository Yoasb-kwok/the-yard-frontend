import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { TableSortButton, type SortDir } from '../../components/TableSortButton';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { api } from '../../lib/api';
import { DollarSign, Users, AlertCircle, LayoutDashboard, Filter, UserPlus, TrendingUp, TrendingDown, Minus, PieChart as PieChartIcon, Target, UserMinus, Download, BookOpen, GraduationCap } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  FunnelChart,
  Funnel,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

interface UpcomingClass {
  id: string;
  name: string;
  program_code?: string;
  instructor: string;
  start_time: string;
  enrolled_count: number;
  capacity: number;
  location?: string;
}

interface Stats {
  totalRevenue: number;
  totalUsers: number;
  expiringStudents: number;
  lowTokenStudents: number;
}

interface FinancialDashboardData {
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueSameMonthLastYear: number;
  totalDiscountThisMonth: number;
  discountPercentage: number;
  revenueByPackage: { name: string; total: number }[];
  paymentMethodDistribution: { method: string; total: number; count: number }[];
  monthlyTrend: { month: string; revenue: number }[];
}

interface ConversionFunnelData {
  byChannel: { channel: string; channelKey: string; trialCount: number; enrollmentCount: number; conversionRate: number; revenue: number }[];
  trialToEnrollmentRate: number;
  totalTrialCount: number;
  newEnrollmentCount: number;
  relatedRevenue: number;
  funnelStages: { name: string; nameKey: string; value: number }[];
}

interface RenewalChurnData {
  totalExpiring: number;
  renewedCount: number;
  renewalRate: number;
  churnCount: number;
  churnRate: number;
  churnReasons: { reason: string; reasonKey: string; count: number }[];
  monthlyTrend: { month: string; expiring: number; renewed: number; churned: number }[];
  churnList: { id: string; full_name: string; mobile: string; expiry_date: string; churn_reason: string }[];
}

interface ClassHealthData {
  byClass: { classId: string; className: string; programCode: string; instructor: string; avgAttendance: number; capacity: number; fillRate: number }[];
  lowAttendanceClasses: { classId: string; className: string; programCode: string; instructor: string; avgAttendance: number; capacity: number; fillRate: number }[];
  lowAttendanceThreshold: number;
  byInstructor: { instructor: string; classCount: number; totalStudents: number }[];
}

interface InstructorPerformanceRow {
  instructorId: string;
  instructor: string;
  totalHours: number;
  totalSessions: number;
  totalStudents: number;
  avgClassSize: number;
  avgRenewalRate: number;
  attendanceRate: number;
}

interface InstructorPerformanceData {
  byInstructor: InstructorPerformanceRow[];
}

export default function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClass[]>([]);
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    totalUsers: 0,
    expiringStudents: 0,
    lowTokenStudents: 0,
  });
  const [financial, setFinancial] = useState<FinancialDashboardData | null>(null);
  const [financialIsDemo, setFinancialIsDemo] = useState(false);
  const [funnel, setFunnel] = useState<ConversionFunnelData | null>(null);
  const [funnelIsDemo, setFunnelIsDemo] = useState(false);
  const [renewalChurn, setRenewalChurn] = useState<RenewalChurnData | null>(null);
  const [renewalChurnIsDemo, setRenewalChurnIsDemo] = useState(false);
  const [classHealth, setClassHealth] = useState<ClassHealthData | null>(null);
  const [classHealthIsDemo, setClassHealthIsDemo] = useState(false);
  const [instructorPerformance, setInstructorPerformance] = useState<InstructorPerformanceData | null>(null);
  const [instructorPerformanceIsDemo, setInstructorPerformanceIsDemo] = useState(false);
  const [perfSortKey, setPerfSortKey] = useState<string | null>(null);
  const [perfSortDir, setPerfSortDir] = useState<SortDir>('asc');
  const [activeSection, setActiveSection] = useState<'overview' | 'financial' | 'funnel' | 'renewalChurn' | 'classHealth' | 'instructorPerformance'>('financial');
  const [loading, setLoading] = useState(true);

  const getLocale = (): string => {
    const langMap: { [key: string]: string } = {
      'en': 'en-US',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
    };
    return langMap[i18n.language] || i18n.language || 'en-US';
  };

  const getLocationLabel = (location?: string): string => {
    if (!location) return '-';
    return t(`home.locations.${location}`);
  };

  const filteredClasses = upcomingClasses.filter(classItem => {
    if (locationFilter === 'all') return true;
    return classItem.location === locationFilter;
  });

  // Unique locations from classes for filter dropdown
  const locations = Array.from(new Set(upcomingClasses.map(c => c.location).filter(Boolean))) as string[];

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [statsRes, financeRes, funnelRes, renewalChurnRes, classHealthRes, instructorPerfRes] = await Promise.all([
        api.get<{
          totalRevenue: number;
          totalUsers: number;
          expiringStudents: number;
          lowTokenStudents: number;
          upcomingClasses: UpcomingClass[];
        }>('admin/dashboard-stats'),
        api.get<FinancialDashboardData>('admin/financial-dashboard?demo=1').catch(() => ({ success: false, data: null })),
        api.get<ConversionFunnelData>('admin/conversion-funnel?demo=1').catch(() => ({ success: false, data: null })),
        api.get<RenewalChurnData>('admin/renewal-churn?demo=1').catch(() => ({ success: false, data: null })),
        api.get<ClassHealthData>('admin/class-health?demo=1').catch(() => ({ success: false, data: null })),
        api.get<InstructorPerformanceData>('admin/instructor-performance?demo=1').catch(() => ({ success: false, data: null })),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats({
          totalRevenue: statsRes.data.totalRevenue ?? 0,
          totalUsers: statsRes.data.totalUsers ?? 0,
          expiringStudents: statsRes.data.expiringStudents ?? 0,
          lowTokenStudents: statsRes.data.lowTokenStudents ?? 0,
        });
        setUpcomingClasses(statsRes.data.upcomingClasses ?? []);
      } else {
        setStats({ totalRevenue: 0, totalUsers: 0, expiringStudents: 0, lowTokenStudents: 0 });
        setUpcomingClasses([]);
      }

      if (financeRes.success && financeRes.data) {
        setFinancial(financeRes.data);
        setFinancialIsDemo(!!(financeRes as { _demo?: boolean })._demo);
      } else {
        setFinancial(null);
        setFinancialIsDemo(false);
      }
      if (funnelRes.success && funnelRes.data) {
        setFunnel(funnelRes.data);
        setFunnelIsDemo(!!(funnelRes as { _demo?: boolean })._demo);
      } else {
        setFunnel(null);
        setFunnelIsDemo(false);
      }
      if (renewalChurnRes.success && renewalChurnRes.data) {
        setRenewalChurn(renewalChurnRes.data);
        setRenewalChurnIsDemo(!!(renewalChurnRes as { _demo?: boolean })._demo);
      } else {
        setRenewalChurn(null);
        setRenewalChurnIsDemo(false);
      }
      if (classHealthRes.success && classHealthRes.data) {
        setClassHealth(classHealthRes.data);
        setClassHealthIsDemo(!!(classHealthRes as { _demo?: boolean })._demo);
      } else {
        setClassHealth(null);
        setClassHealthIsDemo(false);
      }
      if (instructorPerfRes.success && instructorPerfRes.data) {
        setInstructorPerformance(instructorPerfRes.data);
        setInstructorPerformanceIsDemo(!!(instructorPerfRes as { _demo?: boolean })._demo);
      } else {
        setInstructorPerformance(null);
        setInstructorPerformanceIsDemo(false);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setStats({ totalRevenue: 0, totalUsers: 0, expiringStudents: 0, lowTokenStudents: 0 });
      setUpcomingClasses([]);
      setFinancial(null);
      setFinancialIsDemo(false);
      setFunnel(null);
      setFunnelIsDemo(false);
      setRenewalChurn(null);
      setRenewalChurnIsDemo(false);
      setClassHealth(null);
      setClassHealthIsDemo(false);
      setInstructorPerformance(null);
      setInstructorPerformanceIsDemo(false);
    } finally {
      setLoading(false);
    }
  }

  const formatMonthLabel = (monthKey: string) => {
    const [y, m] = monthKey.split('-');
    const monthNum = parseInt(m, 10);
    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${shortMonths[monthNum - 1] || m} ${y}`;
  };

  const pctChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  const dashboardSections = [
    { id: 'overview' as const, icon: LayoutDashboard, label: t('admin.dashboard.sectionOverview') },
    { id: 'financial' as const, icon: PieChartIcon, label: t('admin.dashboard.sectionFinancial') },
    { id: 'funnel' as const, icon: Target, label: t('admin.dashboard.sectionConversionFunnel') },
    { id: 'renewalChurn' as const, icon: UserMinus, label: t('admin.dashboard.sectionRenewalChurn') },
    { id: 'classHealth' as const, icon: BookOpen, label: t('admin.dashboard.sectionClassHealth') },
    { id: 'instructorPerformance' as const, icon: GraduationCap, label: t('admin.dashboard.sectionInstructorPerformance') },
  ];

  const handlePerfSort = (key: string) => {
    if (perfSortKey === key) {
      setPerfSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setPerfSortKey(key);
      setPerfSortDir('asc');
    }
  };

  const sortedPerfRows = (() => {
    if (!instructorPerformance?.byInstructor?.length) return [];
    const rows = [...instructorPerformance.byInstructor];
    if (!perfSortKey || !perfSortDir) return rows;
    const key = perfSortKey as keyof InstructorPerformanceRow;
    rows.sort((a, b) => {
      const va = a[key];
      const vb = b[key];
      if (typeof va === 'number' && typeof vb === 'number') return perfSortDir === 'asc' ? va - vb : vb - va;
      const sa = String(va ?? '');
      const sb = String(vb ?? '');
      return perfSortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
    return rows;
  })();

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

  return (
    <Layout>
      <div className="flex gap-6">
        {/* Left column: section nav */}
        <div className="w-48 shrink-0">
          <div className="bg-white rounded-lg shadow-md p-2 sticky top-24">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
              {t('admin.dashboard.title')}
            </h2>
            <nav className="space-y-0.5">
              {dashboardSections.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveSection(id)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-left text-sm font-medium transition-colors ${
                    activeSection === id
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-6">
          {activeSection === 'overview' && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <LayoutDashboard className="h-7 w-7 text-primary" />
                {t('admin.dashboard.sectionOverview')}
              </h1>
              <div className="grid md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">{t('admin.dashboard.totalRevenue')}</h3>
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats.totalRevenue)}
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">{t('admin.dashboard.totalUsers')}</h3>
                    <UserPlus className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stats.totalUsers}</div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">{t('admin.dashboard.expiringSoon')}</h3>
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stats.expiringStudents}</div>
                  <p className="text-xs text-gray-500 mt-1">{t('admin.dashboard.expiringStudents')}</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">{t('admin.dashboard.lowTokens')}</h3>
                    <Users className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stats.lowTokenStudents}</div>
                  <p className="text-xs text-gray-500 mt-1">{t('admin.dashboard.lowTokenStudents')}</p>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">{t('admin.dashboard.upcomingClassesList')}</h2>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <select
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="all">{t('admin.classes.allLocations')}</option>
                      {locations.map(loc => (
                        <option key={loc} value={loc}>{getLocationLabel(loc)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {filteredClasses.length === 0 ? (
                  <p className="text-gray-600">{t('admin.dashboard.noUpcomingClasses')}</p>
                ) : (
                  <div className="space-y-3">
                    {filteredClasses.map((classItem) => (
                      <div
                        key={classItem.id}
                        className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-medium text-gray-900">{classItem.name}</div>
                            {(classItem.program_code || classItem.id) && (
                              <span className="text-xs px-2 py-0.5 bg-primary-lighter text-primary rounded">
                                {classItem.program_code || classItem.id}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {t('admin.dashboard.with')} {classItem.instructor}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDateTime(classItem.start_time, getLocale())}
                          </div>
                          {classItem.location && (
                            <div className="text-xs text-gray-400 mt-1">
                              {getLocationLabel(classItem.location)}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {classItem.enrolled_count} / {classItem.capacity}
                          </div>
                          <div className="text-xs text-gray-500">{t('admin.dashboard.enrolled')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeSection === 'financial' && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <PieChartIcon className="h-7 w-7 text-primary" />
                {t('admin.dashboard.financialDashboard')}
              </h1>
              {financial ? (
                <div className="bg-white rounded-lg shadow-md p-6">
                  {financialIsDemo && (
                    <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded border border-amber-200">
                        Sample data
                      </span>
                      {t('admin.dashboard.financialDashboardDesc')}
                    </p>
                  )}
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
                    <LineChart data={financial.monthlyTrend.map(d => ({ ...d, label: formatMonthLabel(d.month) }))}>
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
                        data={financial.paymentMethodDistribution.map(d => ({ name: d.method || 'other', value: d.total }))}
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
              ) : (
                <div className="bg-white rounded-lg shadow-md p-6 text-center py-12 text-gray-500">
                  {t('admin.dashboard.noData')}
                </div>
              )}
            </>
          )}

          {activeSection === 'funnel' && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Target className="h-7 w-7 text-primary" />
                {t('admin.dashboard.conversionFunnel')}
              </h1>
              {funnel ? (
                <div className="space-y-6">
                  {funnelIsDemo && (
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded border border-amber-200">
                        Sample data
                      </span>
                      {t('admin.dashboard.conversionFunnelDesc')}
                    </p>
                  )}
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
                      <h3 className="text-sm font-medium text-gray-700 mb-3">{t('admin.dashboard.conversionFunnel')} – {t('admin.dashboard.trialToEnrollmentRate')}</h3>
                      {funnel.funnelStages.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                          <FunnelChart>
                            <Tooltip />
                            <Funnel
                              dataKey="value"
                              nameKey="name"
                              data={funnel.funnelStages}
                              isAnimationActive
                              fill="#10b981"
                              stroke="#059669"
                            />
                          </FunnelChart>
                        </ResponsiveContainer>
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
              ) : (
                <div className="bg-white rounded-lg shadow-md p-6 text-center py-12 text-gray-500">
                  {t('admin.dashboard.noData')}
                </div>
              )}
            </>
          )}

          {activeSection === 'renewalChurn' && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <UserMinus className="h-7 w-7 text-primary" />
                {t('admin.dashboard.renewalChurn')}
              </h1>
              {renewalChurn ? (
                <div className="space-y-6">
                  {renewalChurnIsDemo && (
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded border border-amber-200">
                        Sample data
                      </span>
                      {t('admin.dashboard.renewalChurnDesc')}
                    </p>
                  )}
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
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg shadow-md p-6">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">{t('admin.dashboard.monthlyTrendRenewalChurn')}</h3>
                      {renewalChurn.monthlyTrend.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart
                            data={renewalChurn.monthlyTrend.map((d) => ({
                              ...d,
                              label: formatMonthLabel(d.month),
                            }))}
                            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="expiring" name={t('admin.dashboard.totalExpiring')} fill="#94a3b8" />
                            <Bar dataKey="renewed" name={t('admin.dashboard.renewedCount')} fill="#10b981" />
                            <Bar dataKey="churned" name={t('admin.dashboard.churnCount')} fill="#ef4444" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-gray-500 text-sm py-8 text-center">{t('admin.dashboard.noData')}</p>
                      )}
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-6">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">{t('admin.dashboard.churnReasons')}</h3>
                      {renewalChurn.churnReasons.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie
                              data={renewalChurn.churnReasons.map((r) => ({
                                name: getChurnReasonLabel(r.reasonKey),
                                value: r.count,
                              }))}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={90}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {renewalChurn.churnReasons.map((_, i) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v: number) => [v, t('admin.dashboard.churnCount')]} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-gray-500 text-sm py-8 text-center">{t('admin.dashboard.noData')}</p>
                      )}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-medium text-gray-700">{t('admin.dashboard.churnListDetail')}</h3>
                      <button
                        type="button"
                        onClick={exportChurnListCsv}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary/5"
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
                            {renewalChurn.churnList.map((row) => (
                              <tr key={row.id} className="border-b border-gray-100">
                                <td className="py-2 pr-4 font-medium text-gray-900">{row.full_name}</td>
                                <td className="py-2 pr-4">{row.mobile}</td>
                                <td className="py-2 pr-4">{row.expiry_date}</td>
                                <td className="py-2">{getChurnReasonLabel(row.churn_reason)}</td>
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
              ) : (
                <div className="bg-white rounded-lg shadow-md p-6 text-center py-12 text-gray-500">
                  {t('admin.dashboard.noData')}
                </div>
              )}
            </>
          )}

          {activeSection === 'classHealth' && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <BookOpen className="h-7 w-7 text-primary" />
                {t('admin.dashboard.classHealth')}
              </h1>
              {classHealth ? (
                <div className="space-y-6">
                  {classHealthIsDemo && (
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded border border-amber-200">
                        Sample data
                      </span>
                      {t('admin.dashboard.classHealthDesc')}
                    </p>
                  )}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg shadow-md p-6">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">{t('admin.dashboard.classFillRateChart')}</h3>
                      {classHealth.byClass.length > 0 ? (
                        <ResponsiveContainer width="100%" height={Math.max(220, classHealth.byClass.length * 36)}>
                          <BarChart
                            layout="vertical"
                            data={classHealth.byClass.map((c) => ({ ...c, label: c.className.length > 18 ? c.className.slice(0, 18) + '…' : c.className }))}
                            margin={{ top: 4, right: 24, left: 0, bottom: 4 }}
                          >
                            <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                            <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, t('admin.dashboard.fillRate')]} />
                            <Bar dataKey="fillRate" fill="#10b981" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-gray-500 text-sm py-8 text-center">{t('admin.dashboard.noData')}</p>
                      )}
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-6">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">{t('admin.dashboard.instructorClassCount')}</h3>
                      {classHealth.byInstructor.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200 text-left text-gray-600">
                                <th className="py-2 pr-4">{t('admin.dashboard.instructor')}</th>
                                <th className="py-2 pr-4">{t('admin.dashboard.classCount')}</th>
                                <th className="py-2">{t('admin.dashboard.totalStudents')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {classHealth.byInstructor.map((row, i) => (
                                <tr key={i} className="border-b border-gray-100">
                                  <td className="py-2 pr-4 font-medium text-gray-900">{row.instructor}</td>
                                  <td className="py-2 pr-4">{row.classCount}</td>
                                  <td className="py-2">{row.totalStudents}</td>
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
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      {t('admin.dashboard.className')} – {t('admin.dashboard.avgAttendance')} / {t('admin.dashboard.fillRate')}
                    </h3>
                    {classHealth.byClass.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 text-left text-gray-600">
                              <th className="py-2 pr-4">{t('admin.dashboard.className')}</th>
                              <th className="py-2 pr-4">{t('admin.dashboard.programCode')}</th>
                              <th className="py-2 pr-4">{t('admin.dashboard.instructor')}</th>
                              <th className="py-2 pr-4">{t('admin.dashboard.avgAttendance')}</th>
                              <th className="py-2 pr-4">{t('admin.dashboard.capacity')}</th>
                              <th className="py-2">{t('admin.dashboard.fillRate')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classHealth.byClass.map((row) => (
                              <tr key={row.classId} className="border-b border-gray-100">
                                <td className="py-2 pr-4 font-medium text-gray-900">{row.className}</td>
                                <td className="py-2 pr-4">{row.programCode}</td>
                                <td className="py-2 pr-4">{row.instructor}</td>
                                <td className="py-2 pr-4">{row.avgAttendance}</td>
                                <td className="py-2 pr-4">{row.capacity}</td>
                                <td className="py-2">{row.fillRate.toFixed(1)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm py-8 text-center">{t('admin.dashboard.noData')}</p>
                    )}
                  </div>
                  <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-amber-400">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      {t('admin.dashboard.lowAttendanceClasses')} — {t('admin.dashboard.lowAttendanceThreshold')}: {classHealth.lowAttendanceThreshold}
                    </h3>
                    {classHealth.lowAttendanceClasses.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 text-left text-gray-600">
                              <th className="py-2 pr-4">{t('admin.dashboard.className')}</th>
                              <th className="py-2 pr-4">{t('admin.dashboard.programCode')}</th>
                              <th className="py-2 pr-4">{t('admin.dashboard.instructor')}</th>
                              <th className="py-2 pr-4">{t('admin.dashboard.avgAttendance')}</th>
                              <th className="py-2 pr-4">{t('admin.dashboard.capacity')}</th>
                              <th className="py-2">{t('admin.dashboard.fillRate')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classHealth.lowAttendanceClasses.map((row) => (
                              <tr key={row.classId} className="border-b border-gray-100">
                                <td className="py-2 pr-4 font-medium text-gray-900">{row.className}</td>
                                <td className="py-2 pr-4">{row.programCode}</td>
                                <td className="py-2 pr-4">{row.instructor}</td>
                                <td className="py-2 pr-4 text-amber-600 font-medium">{row.avgAttendance}</td>
                                <td className="py-2 pr-4">{row.capacity}</td>
                                <td className="py-2">{row.fillRate.toFixed(1)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm py-4 text-center">{t('admin.dashboard.noData')}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-md p-6 text-center py-12 text-gray-500">
                  {t('admin.dashboard.noData')}
                </div>
              )}
            </>
          )}

          {activeSection === 'instructorPerformance' && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <GraduationCap className="h-7 w-7 text-primary" />
                {t('admin.dashboard.instructorPerformance')}
              </h1>
              {instructorPerformance ? (
                <div className="space-y-6">
                  {instructorPerformanceIsDemo && (
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded border border-amber-200">
                        Sample data
                      </span>
                      {t('admin.dashboard.instructorPerformanceDesc')}
                    </p>
                  )}
                  <div className="bg-white rounded-lg shadow-md p-6 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-left text-gray-600">
                          <TableSortButton
                            label={t('admin.dashboard.instructor')}
                            sortKey="instructor"
                            currentSortKey={perfSortKey}
                            sortDir={perfSortDir}
                            onSort={handlePerfSort}
                            className="py-2 pr-4"
                          />
                          <TableSortButton
                            label={t('admin.dashboard.totalTeachingHours')}
                            sortKey="totalHours"
                            currentSortKey={perfSortKey}
                            sortDir={perfSortDir}
                            onSort={handlePerfSort}
                            className="py-2 pr-4"
                          />
                          <TableSortButton
                            label={t('admin.dashboard.totalSessions')}
                            sortKey="totalSessions"
                            currentSortKey={perfSortKey}
                            sortDir={perfSortDir}
                            onSort={handlePerfSort}
                            className="py-2 pr-4"
                          />
                          <TableSortButton
                            label={t('admin.dashboard.totalStudentsInstructor')}
                            sortKey="totalStudents"
                            currentSortKey={perfSortKey}
                            sortDir={perfSortDir}
                            onSort={handlePerfSort}
                            className="py-2 pr-4"
                          />
                          <TableSortButton
                            label={t('admin.dashboard.avgClassSize')}
                            sortKey="avgClassSize"
                            currentSortKey={perfSortKey}
                            sortDir={perfSortDir}
                            onSort={handlePerfSort}
                            className="py-2 pr-4"
                          />
                          <TableSortButton
                            label={t('admin.dashboard.avgRenewalRate')}
                            sortKey="avgRenewalRate"
                            currentSortKey={perfSortKey}
                            sortDir={perfSortDir}
                            onSort={handlePerfSort}
                            className="py-2 pr-4"
                          />
                          <TableSortButton
                            label={t('admin.dashboard.attendanceRate')}
                            sortKey="attendanceRate"
                            currentSortKey={perfSortKey}
                            sortDir={perfSortDir}
                            onSort={handlePerfSort}
                            className="py-2"
                          />
                        </tr>
                      </thead>
                      <tbody>
                        {sortedPerfRows.map((row) => (
                          <tr key={row.instructorId} className="border-b border-gray-100">
                            <td className="py-2 pr-4 font-medium text-gray-900">{row.instructor}</td>
                            <td className="py-2 pr-4">{row.totalHours}</td>
                            <td className="py-2 pr-4">{row.totalSessions}</td>
                            <td className="py-2 pr-4">{row.totalStudents}</td>
                            <td className="py-2 pr-4">{row.avgClassSize.toFixed(1)}</td>
                            <td className="py-2 pr-4">{row.avgRenewalRate.toFixed(1)}%</td>
                            <td className="py-2">{row.attendanceRate.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-md p-6 text-center py-12 text-gray-500">
                  {t('admin.dashboard.noData')}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
