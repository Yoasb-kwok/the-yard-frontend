import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { Calendar, DollarSign, Users, AlertCircle } from 'lucide-react';

interface TodayClass {
  id: string;
  name: string;
  instructor: string;
  start_time: string;
  enrolled_count: number;
  capacity: number;
}

interface Stats {
  todayRevenue: number;
  todayClasses: number;
  expiringStudents: number;
  lowTokenStudents: number;
}

// Mock data
const MOCK_TODAY_CLASSES: TodayClass[] = [
  {
    id: '1',
    name: 'Yoga Basics',
    instructor: 'Jane Smith',
    start_time: new Date().toISOString(),
    enrolled_count: 8,
    capacity: 12,
  },
  {
    id: '2',
    name: 'Pilates Intermediate',
    instructor: 'John Doe',
    start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    enrolled_count: 10,
    capacity: 15,
  },
];

export default function AdminDashboard() {
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);
  const [stats, setStats] = useState<Stats>({
    todayRevenue: 0,
    todayClasses: 0,
    expiringStudents: 0,
    lowTokenStudents: 0,
  });
  const [loading, setLoading] = useState(true);

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
      todayClasses: MOCK_TODAY_CLASSES.length,
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
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>

        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Today's Revenue</h3>
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats.todayRevenue)}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Today's Classes</h3>
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.todayClasses}</div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Expiring Soon</h3>
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.expiringStudents}</div>
            <p className="text-xs text-gray-500 mt-1">Students with expiring tokens</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Low Tokens</h3>
              <Users className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.lowTokenStudents}</div>
            <p className="text-xs text-gray-500 mt-1">Students with ≤2 tokens</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Today's Classes</h2>
          {todayClasses.length === 0 ? (
            <p className="text-gray-600">No classes scheduled today</p>
          ) : (
            <div className="space-y-3">
              {todayClasses.map((classItem) => (
                <div
                  key={classItem.id}
                  className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">{classItem.name}</div>
                    <div className="text-sm text-gray-600">with {classItem.instructor}</div>
                    <div className="text-sm text-gray-500">
                      {formatDateTime(classItem.start_time)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {classItem.enrolled_count} / {classItem.capacity}
                    </div>
                    <div className="text-xs text-gray-500">enrolled</div>
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
