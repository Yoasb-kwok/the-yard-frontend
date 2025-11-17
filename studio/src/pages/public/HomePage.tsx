import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import { formatDateTime } from '../../lib/utils';
import { Calendar, Clock, Users } from 'lucide-react';

interface TodayClass {
  id: string;
  name: string;
  instructor: string;
  start_time: string;
  end_time: string;
  capacity: number;
  enrolled_count: number;
}

// Dummy data
const DUMMY_TODAY_CLASSES: TodayClass[] = [
  {
    id: '1',
    name: 'Morning Yoga',
    instructor: 'Jane Smith',
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    capacity: 15,
    enrolled_count: 10,
  },
  {
    id: '2',
    name: 'Pilates Core',
    instructor: 'John Doe',
    start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    capacity: 12,
    enrolled_count: 8,
  },
  {
    id: '3',
    name: 'Evening Stretch',
    instructor: 'Sarah Johnson',
    start_time: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
    capacity: 20,
    enrolled_count: 15,
  },
];

export default function HomePage() {
  const { t } = useTranslation();
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTodayClasses();
  }, []);

  async function loadTodayClasses() {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setTodayClasses(DUMMY_TODAY_CLASSES);
    setLoading(false);
  }

  return (
    <PublicLayout>
      <div className="relative bg-gradient-to-br from-primary to-primary-dark text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">
              {t('home.title')}
            </h1>
            <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
              {t('home.subtitle')}
            </p>
            <div className="flex justify-center gap-4">
              <Link
                to="/trial"
                className="bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-primary-lighter transition-colors"
              >
                {t('home.bookTrial')}
              </Link>
              <Link
                to="/login"
                className="bg-primary-dark text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary transition-colors border border-primary"
              >
                {t('home.signIn')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">{t('home.todaysClasses')}</h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : todayClasses.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">{t('home.noClassesToday')}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {todayClasses.map((classItem) => (
              <div key={classItem.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{classItem.name}</h3>
                <p className="text-gray-600 mb-4">with {classItem.instructor}</p>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    {formatDateTime(classItem.start_time)}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    {classItem.enrolled_count} / {classItem.capacity} {t('home.enrolled')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('home.expertInstructors')}</h3>
              <p className="text-gray-600">{t('home.expertInstructorsDesc')}</p>
            </div>
            <div>
              <div className="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('home.flexibleSchedule')}</h3>
              <p className="text-gray-600">{t('home.flexibleScheduleDesc')}</p>
            </div>
            <div>
              <div className="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('home.smallClassSizes')}</h3>
              <p className="text-gray-600">{t('home.smallClassSizesDesc')}</p>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
