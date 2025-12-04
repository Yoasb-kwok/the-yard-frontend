import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { Calendar, DollarSign, Users, AlertCircle, LayoutDashboard, Filter, UserPlus } from 'lucide-react';

interface TodayClass {
  id: string;
  name: string;
  class_code: string;
  instructor: string;
  start_time: string;
  enrolled_count: number;
  capacity: number;
  location?: 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui';
}

interface Stats {
  todayRevenue: number;
  newUsersThisMonth: number;
  expiringStudents: number;
  lowTokenStudents: number;
}

// Mock data
const MOCK_TODAY_CLASSES: TodayClass[] = [
  {
    id: '1',
    name: 'Yoga Basics',
    class_code: 'YB-001',
    instructor: 'Jane Smith',
    start_time: new Date().toISOString(),
    enrolled_count: 8,
    capacity: 12,
    location: 'sanpokong',
  },
  {
    id: '2',
    name: 'Pilates Intermediate',
    class_code: 'PI-002',
    instructor: 'John Doe',
    start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    enrolled_count: 10,
    capacity: 15,
    location: 'causewaybay',
  },
  {
    id: '3',
    name: 'Dance Fundamentals',
    class_code: 'DF-003',
    instructor: 'Alice Johnson',
    start_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    enrolled_count: 6,
    capacity: 10,
    location: 'fotan',
  },
];

export default function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);
  const [locationFilter, setLocationFilter] = useState<'all' | 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui'>('all');
  const [stats, setStats] = useState<Stats>({
    todayRevenue: 0,
    newUsersThisMonth: 0,
    expiringStudents: 0,
    lowTokenStudents: 0,
  });
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

  const filteredClasses = todayClasses.filter(classItem => {
    if (locationFilter === 'all') return true;
    return classItem.location === locationFilter;
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Use mock data
    setTodayClasses(MOCK_TODAY_CLASSES);
    setStats({
      todayRevenue: 1250.00,
      newUsersThisMonth: 12,
      expiringStudents: 3,
      lowTokenStudents: 5,
    });
    setLoading(false);
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <LayoutDashboard className="h-8 w-8 text-primary" />
          {t('admin.dashboard.title')}
        </h1>

        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">{t('admin.dashboard.todaysRevenue')}</h3>
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats.todayRevenue)}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">{t('admin.dashboard.newUsersThisMonth')}</h3>
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.newUsersThisMonth}</div>
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
            <h2 className="text-xl font-semibold text-gray-900">{t('admin.dashboard.todaysClassesList')}</h2>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value as typeof locationFilter)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">{t('admin.classes.allLocations')}</option>
                <option value="sanpokong">{getLocationLabel('sanpokong')}</option>
                <option value="causewaybay">{getLocationLabel('causewaybay')}</option>
                <option value="fotan">{getLocationLabel('fotan')}</option>
                <option value="sheungshui">{getLocationLabel('sheungshui')}</option>
              </select>
            </div>
          </div>
          {filteredClasses.length === 0 ? (
            <p className="text-gray-600">{t('admin.dashboard.noClassesToday')}</p>
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
                      <span className="text-xs px-2 py-0.5 bg-primary-lighter text-primary rounded">
                        {classItem.class_code}
                      </span>
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
      </div>
    </Layout>
  );
}
