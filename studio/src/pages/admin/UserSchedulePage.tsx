import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { formatDateTimeRange, formatMobileForDisplay } from '../../lib/utils';
import { api } from '../../lib/api';
import { ArrowLeft, Calendar, MapPin } from 'lucide-react';
import { TablePaginationBar, useTablePagination } from '../../components/TablePagination';

interface Enrollment {
  id: string;
  status: 'enrolled' | 'attended' | 'absent' | 'sick_leave';
  class: {
    id: string;
    name: string;
    class_code: string;
    instructor: string;
    start_time: string;
    end_time: string;
    location?: 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui';
    is_internal?: boolean;
    is_cancelled?: boolean;
  };
}

interface User {
  id: string;
  full_name: string;
  mobile: string | null;
}

function mapEnrollmentRow(raw: Record<string, unknown>): Enrollment | null {
  const cls = (raw.class ?? raw) as Record<string, unknown>;
  const classId = String(cls.id ?? raw.class_id ?? '');
  if (!classId) return null;
  const start = String(cls.start_time ?? raw.start_time ?? '');
  const end = String(cls.end_time ?? raw.end_time ?? start);
  if (!start) return null;
  return {
    id: String(raw.id ?? `${classId}-${start}`),
    status: (raw.status as Enrollment['status']) || 'enrolled',
    class: {
      id: classId,
      name: String(cls.name ?? cls.class_name ?? ''),
      class_code: String(cls.class_code ?? cls.program_code ?? ''),
      instructor: String(cls.instructor ?? ''),
      start_time: start,
      end_time: end,
      location: cls.location as Enrollment['class']['location'],
      is_internal: cls.is_internal === 1 || cls.is_internal === true,
      is_cancelled: cls.is_cancelled === 1 || cls.is_cancelled === true,
    },
  };
}

export default function UserSchedulePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  async function loadData() {
    if (!userId) return;
    setLoading(true);
    try {
      const [usersRes, enrollRes] = await Promise.all([
        api.get<Record<string, unknown>[]>('/admin/users'),
        api.get<Record<string, unknown>[]>(`/admin/users/${userId}/class-enrollments`),
      ]);
      const users = usersRes.success && Array.isArray(usersRes.data) ? usersRes.data : [];
      const raw = users.find((u) => String(u.id) === String(userId));
      if (!raw) {
        setUser(null);
        setEnrollments([]);
        return;
      }
      setUser({
        id: String(raw.id ?? userId),
        full_name: String(raw.full_name ?? raw.name ?? ''),
        mobile: raw.mobile != null ? String(raw.mobile) : null,
      });
      const list = enrollRes.success && Array.isArray(enrollRes.data) ? enrollRes.data : [];
      const now = new Date();
      const mapped = list
        .map((row) => mapEnrollmentRow(row))
        .filter((e): e is Enrollment => e !== null)
        .filter((e) => new Date(e.class.end_time) >= now);
      setEnrollments(mapped);
    } catch {
      setUser(null);
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  }

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

  const getStatusLabel = (status: Enrollment['status']) => {
    return t(`admin.attendance.statuses.${status}`);
  };

  const getStatusColor = (status: Enrollment['status']) => {
    switch (status) {
      case 'enrolled':
        return 'bg-blue-100 text-blue-800';
      case 'attended':
        return 'bg-green-100 text-green-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      case 'sick_leave':
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const sortedEnrollments = useMemo(() => {
    return [...enrollments].sort((a, b) =>
      new Date(a.class.start_time).getTime() - new Date(b.class.start_time).getTime()
    );
  }, [enrollments]);

  const {
    page: schedPage,
    setPage: setSchedPage,
    totalPages: schedTotalPages,
    pageSize: schedPageSize,
    totalItems: schedTotalItems,
    paginatedItems: paginatedEnrollments,
  } = useTablePagination(sortedEnrollments, undefined, [userId, enrollments]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="p-6">
          <p className="text-gray-600">{t('admin.users.userNotFound')}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/users')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>{t('common.back')}</span>
          </button>
          <div className="flex items-center gap-4">
            <Calendar className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('admin.users.upcomingClasses')}</h1>
              <p className="text-gray-600 mt-1">{user.full_name} ({formatMobileForDisplay(user.mobile, '-')})</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {sortedEnrollments.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              {t('admin.users.noUpcomingClasses')}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              <div className="hidden md:block">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.classes.className')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.classes.classCode')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.classes.instructor')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.classes.dateTime')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.classes.location')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.attendance.status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedEnrollments.map((enrollment) => (
                      <tr key={enrollment.id}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            {enrollment.class.name}
                            {enrollment.class.is_internal && (
                              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                                {t('admin.tokenAssignment.makeupClass')}
                              </span>
                            )}
                            {enrollment.class.is_cancelled && (
                              <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                                {t('admin.classes.cancelled')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{enrollment.class.class_code}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{enrollment.class.instructor}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDateTimeRange(enrollment.class.start_time, enrollment.class.end_time, getLocale())}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {enrollment.class.location ? getLocationLabel(enrollment.class.location) : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(enrollment.status)}`}>
                            {getStatusLabel(enrollment.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <TablePaginationBar
                  page={schedPage}
                  totalPages={schedTotalPages}
                  totalItems={schedTotalItems}
                  pageSize={schedPageSize}
                  onPageChange={setSchedPage}
                  className="hidden md:flex"
                />
              </div>

              <div className="md:hidden divide-y divide-gray-200">
                {paginatedEnrollments.map((enrollment) => (
                  <div key={enrollment.id} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{enrollment.class.name}</h3>
                          {enrollment.class.is_internal && (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                              {t('admin.tokenAssignment.makeupClass')}
                            </span>
                          )}
                          {enrollment.class.is_cancelled && (
                            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                              {t('admin.classes.cancelled')}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">{t('admin.classes.classCode')}:</span> {enrollment.class.class_code}
                        </p>
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">{t('admin.classes.instructor')}:</span> {enrollment.class.instructor}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(enrollment.status)}`}>
                        {getStatusLabel(enrollment.status)}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {formatDateTimeRange(enrollment.class.start_time, enrollment.class.end_time, getLocale())}
                        </span>
                      </div>
                      {enrollment.class.location && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="h-4 w-4" />
                          <span>{getLocationLabel(enrollment.class.location)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <TablePaginationBar
                page={schedPage}
                totalPages={schedTotalPages}
                totalItems={schedTotalItems}
                pageSize={schedPageSize}
                onPageChange={setSchedPage}
                className="md:hidden border-t border-gray-200"
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
