import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../../lib/utils';
import { api } from '../../lib/api';
import { Calendar, Clock, User } from 'lucide-react';

/** Enrolled class from student/upcoming-classes – course picked for this student */
interface EnrolledClass {
  id: string;
  status: string;
  user_id?: string;
  user_name?: string;
  class: {
    name: string;
    instructor: string;
    start_time: string;
    end_time: string;
    program_code?: string;
  };
}

export default function SchedulePage() {
  const { profile } = useAuth();
  const { t, i18n } = useTranslation();
  const [enrollments, setEnrollments] = useState<EnrolledClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id) loadEnrolledClasses();
  }, [profile?.id]);

  /** Fetch enrolled classes for the account; we filter by active profile for course picked details */
  async function loadEnrolledClasses() {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<EnrolledClass[]>('student/upcoming-classes');
      const data = (response as any).data ?? response;
      const list = Array.isArray(data) ? data : [];
      setEnrollments(list);
    } catch (err) {
      console.error('Error loading enrolled classes:', err);
      setEnrollments([]);
      setError(err instanceof Error ? err.message : 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }

  /** Only show enrollments for the active student (course picked details) */
  const myEnrollments = useMemo(() => {
    if (!profile?.id) return [];
    return enrollments
      .filter((e) => (e.user_id || '').trim() === (profile.id || '').trim())
      .sort((a, b) => new Date(a.class.start_time).getTime() - new Date(b.class.start_time).getTime());
  }, [enrollments, profile?.id]);

  const getLocale = (): string => {
    const langMap: { [key: string]: string } = {
      'en': 'en-US',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
    };
    return langMap[i18n.language] || i18n.language || 'en-US';
  };

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
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('schedule.title')}</h1>
          </div>
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-lighter text-primary font-medium hover:bg-primary/20 transition-colors"
          >
            <User className="h-5 w-5" />
            {t('schedule.personalProfile')}
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('schedule.coursePickedDetails')}</h2>
          {myEnrollments.length === 0 && !error ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">{t('schedule.noUpcomingClasses')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myEnrollments.map((e) => (
                <div
                  key={e.id}
                  className="bg-white rounded-lg shadow-md p-4 md:p-6 border border-gray-100"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{e.class.name}</h3>
                      {e.class.program_code && (
                        <span className="inline-block text-xs font-medium text-primary bg-primary-lighter px-2 py-0.5 rounded mb-2">
                          {e.class.program_code}
                        </span>
                      )}
                      <p className="text-gray-600 mb-1">{e.class.instructor}</p>
                      <p className="text-sm text-gray-500">
                        {formatDateTime(e.class.start_time, getLocale())} – {formatDateTime(e.class.end_time, getLocale())}
                      </p>
                      <span className={`inline-block mt-2 text-xs font-medium px-2 py-1 rounded ${
                        e.status === 'attended' ? 'bg-green-100 text-green-800' :
                        e.status === 'sick_leave' ? 'bg-amber-100 text-amber-800' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {e.status}
                      </span>
                    </div>
                    <Clock className="h-5 w-5 text-gray-400 flex-shrink-0" />
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
