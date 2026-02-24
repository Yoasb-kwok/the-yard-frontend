import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { api } from '../../lib/api';
import { DollarSign, Users, AlertCircle, LayoutDashboard, Filter, UserPlus, Calendar, BookOpen, ClipboardList } from 'lucide-react';

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

const FALLBACK_STATS: Stats = { totalRevenue: 12500, totalUsers: 3, expiringStudents: 1, lowTokenStudents: 1 };
const FALLBACK_UPCOMING: UpcomingClass[] = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(14, 0, 0, 0);
  return [
    { id: 'c1', name: 'Kids Ballet A', program_code: 'KB-A', instructor: '李老師', start_time: d.toISOString(), enrolled_count: 8, capacity: 12, location: 'sanpokong' },
    { id: 'c2', name: 'Teen Hip Hop', program_code: 'THH', instructor: '陳老師', start_time: new Date(d.getTime() + 86400000).toISOString(), enrolled_count: 10, capacity: 15, location: 'causewaybay' },
  ];
})();

export default function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState<Stats>(FALLBACK_STATS);
  const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClass[]>(FALLBACK_UPCOMING);
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const getLocale = () => (i18n.language === 'zh-CN' ? 'zh-CN' : i18n.language === 'zh-TW' ? 'zh-TW' : 'en-US');
  const getLocationLabel = (loc?: string) => (loc ? t(`home.locations.${loc}`) : '-');
  const filteredClasses = upcomingClasses.filter((c) => locationFilter === 'all' || c.location === locationFilter);
  const locations = Array.from(new Set(upcomingClasses.map((c) => c.location).filter(Boolean))) as string[];

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<{ totalRevenue: number; totalUsers: number; expiringStudents: number; lowTokenStudents: number; upcomingClasses: UpcomingClass[] }>('admin/dashboard-stats?demo=1').catch(() => ({ success: true, data: null }));
        if (res?.data) {
          setStats({
            totalRevenue: res.data.totalRevenue ?? FALLBACK_STATS.totalRevenue,
            totalUsers: res.data.totalUsers ?? FALLBACK_STATS.totalUsers,
            expiringStudents: res.data.expiringStudents ?? FALLBACK_STATS.expiringStudents,
            lowTokenStudents: res.data.lowTokenStudents ?? FALLBACK_STATS.lowTokenStudents,
          });
          setUpcomingClasses(res.data.upcomingClasses ?? FALLBACK_UPCOMING);
        }
      } catch {
        setStats(FALLBACK_STATS);
        setUpcomingClasses(FALLBACK_UPCOMING);
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
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <LayoutDashboard className="h-7 w-7 text-primary" />
          {t('admin.dashboard.sectionOverview')}
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">{t('admin.dashboard.totalRevenue')}</h3>
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">{t('admin.dashboard.totalUsers')}</h3>
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalUsers}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">{t('admin.dashboard.expiringSoon')}</h3>
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.expiringStudents}</div>
            <p className="text-xs text-gray-500 mt-1">{t('admin.dashboard.expiringStudents')}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">{t('admin.dashboard.lowTokens')}</h3>
              <Users className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.lowTokenStudents}</div>
            <p className="text-xs text-gray-500 mt-1">{t('admin.dashboard.lowTokenStudents')}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{t('admin.dashboard.upcomingClassesList')}</h2>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">{t('admin.classes.allLocations')}</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>{getLocationLabel(loc)}</option>
                ))}
              </select>
            </div>
          </div>
          {filteredClasses.length === 0 ? (
            <p className="text-gray-600">{t('admin.dashboard.noUpcomingClasses')}</p>
          ) : (
            <ul className="space-y-3">
              {filteredClasses.map((c) => (
                <li key={c.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{c.name}</span>
                      {c.program_code && (
                        <span className="text-xs px-2 py-0.5 bg-primary-lighter text-primary rounded">{c.program_code}</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">{t('admin.dashboard.with')} {c.instructor}</div>
                    <div className="text-sm text-gray-500">{formatDateTime(c.start_time, getLocale())}</div>
                    {c.location && <div className="text-xs text-gray-400 mt-1">{getLocationLabel(c.location)}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{c.enrolled_count} / {c.capacity}</div>
                    <div className="text-xs text-gray-500">{t('admin.dashboard.enrolled')}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-sm text-gray-500">
          {t('admin.dashboard.useSidebarHint')}
        </p>
      </div>
    </Layout>
  );
}
