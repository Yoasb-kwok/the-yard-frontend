import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { formatDateTime } from '../../lib/utils';
import { ArrowLeft, Search } from 'lucide-react';

interface Class {
  id: string;
  name: string;
  class_code: string;
  instructor: string;
  start_time: string;
  end_time: string;
  capacity: number;
  enrolled_count: number;
  is_internal: boolean;
  is_cancelled: boolean;
  location?: 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui';
  attendance_confirmed?: boolean;
}

interface Enrollment {
  id: string;
  class_id: string;
  user_id: string;
  user_name: string;
  user_mobile: string | null;
  status: 'enrolled' | 'attended' | 'absent' | 'sick_leave';
  check_in_time: string | null;
  check_out_time: string | null;
  sick_leave_document_url: string | null;
  created_at: string;
}

// Mock classes data
const MOCK_CLASSES: Class[] = [
  {
    id: '1',
    name: 'Yoga Basics',
    class_code: 'YB001',
    instructor: 'Jane Smith',
    start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    capacity: 12,
    enrolled_count: 8,
    is_internal: false,
    is_cancelled: false,
    location: 'sanpokong',
    attendance_confirmed: false,
  },
  {
    id: '2',
    name: 'Pilates Intermediate',
    class_code: 'PI002',
    instructor: 'John Doe',
    start_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
    capacity: 15,
    enrolled_count: 10,
    is_internal: false,
    is_cancelled: false,
    location: 'causewaybay',
    attendance_confirmed: true,
  },
];

// Mock enrollments data
const MOCK_ENROLLMENTS: Enrollment[] = [
  {
    id: '1',
    class_id: '1',
    user_id: 'user1',
    user_name: '張三',
    user_mobile: '91234567',
    status: 'attended',
    check_in_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
    check_out_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    sick_leave_document_url: null,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    class_id: '1',
    user_id: 'user2',
    user_name: '李四',
    user_mobile: '98765432',
    status: 'attended',
    check_in_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 25 * 60 * 1000).toISOString(),
    check_out_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 55 * 60 * 1000).toISOString(),
    sick_leave_document_url: null,
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    class_id: '1',
    user_id: 'user3',
    user_name: '王五',
    user_mobile: '92345678',
    status: 'absent',
    check_in_time: null,
    check_out_time: null,
    sick_leave_document_url: null,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    class_id: '1',
    user_id: 'user4',
    user_name: '陳六',
    user_mobile: '93456789',
    status: 'sick_leave',
    check_in_time: null,
    check_out_time: null,
    sick_leave_document_url: 'https://example.com/sick-leave-doc.pdf',
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    class_id: '1',
    user_id: 'user5',
    user_name: '劉七',
    user_mobile: '94567890',
    status: 'enrolled',
    check_in_time: null,
    check_out_time: null,
    sick_leave_document_url: null,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function ClassAttendancePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { classId } = useParams<{ classId: string }>();
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (classId) {
      loadClassAndEnrollments(classId);
    } else {
      setLoading(false);
    }
  }, [classId]);

  async function loadClassAndEnrollments(classId: string) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Find the class
    const foundClass = MOCK_CLASSES.find(c => c.id === classId);
    if (foundClass) {
      setSelectedClass(foundClass);
      // Load enrollments for this class
      await loadEnrollments(classId);
    }
    setLoading(false);
  }

  async function loadEnrollments(classId: string) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    const classEnrollments = MOCK_ENROLLMENTS.filter(e => e.class_id === classId);
    setEnrollments(classEnrollments);
  }

  async function updateAttendanceStatus(enrollmentId: string, newStatus: 'enrolled' | 'attended' | 'absent' | 'sick_leave') {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));

    setEnrollments(enrollments.map(e => {
      if (e.id === enrollmentId) {
        const now = new Date().toISOString();
        return {
          ...e,
          status: newStatus,
          check_in_time: newStatus === 'attended' ? (e.check_in_time || now) : e.check_in_time,
          check_out_time: newStatus === 'attended' ? (e.check_out_time || now) : e.check_out_time,
        };
      }
      return e;
    }));
  }

  async function toggleAttendanceConfirmation() {
    if (!selectedClass) return;
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));

    setSelectedClass({
      ...selectedClass,
      attendance_confirmed: !selectedClass.attendance_confirmed,
    });
  }

  // Format mobile number with country code
  function formatMobile(mobile: string | null): string {
    if (!mobile) return '-';
    
    // Check if mobile starts with country codes: 852, 853, or 86
    if (mobile.startsWith('852')) {
      return `+852 ${mobile.substring(3)}`;
    } else if (mobile.startsWith('853')) {
      return `+853 ${mobile.substring(3)}`;
    } else if (mobile.startsWith('86')) {
      return `+86 ${mobile.substring(2)}`;
    }
    
    // If no country code detected, default to +852 (Hong Kong)
    return `+852 ${mobile}`;
  }

  const getLocale = (): string => {
    const langMap: { [key: string]: string } = {
      'en': 'en-US',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
    };
    return langMap[i18n.language] || i18n.language || 'en-US';
  };

  const getStatusLabel = (status: string): string => {
    return t(`admin.attendance.statuses.${status}`);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'attended':
        return 'bg-green-100 text-green-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      case 'sick_leave':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredEnrollments = enrollments.filter(e =>
    e.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.user_mobile?.includes(searchTerm)
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!selectedClass) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/classes')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{t('admin.attendance.title')}</h1>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-center text-gray-600 py-8">{t('admin.attendance.classNotFound')}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => navigate('/admin/classes')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{t('admin.attendance.title')}</h1>
        </div>

        {/* Class Information */}
        {selectedClass && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">{selectedClass.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">{t('admin.attendance.classCode')}:</span> {selectedClass.class_code}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">{t('admin.attendance.instructor')}:</span> {selectedClass.instructor}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">{t('admin.attendance.time')}:</span>{' '}
                  {formatDateTime(selectedClass.start_time, getLocale())} - {formatDateTime(selectedClass.end_time, getLocale())}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">{t('admin.attendance.enrolled')}:</span> {selectedClass.enrolled_count} / {selectedClass.capacity}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">{t('admin.attendance.attended')}:</span>{' '}
                  {enrollments.filter(e => e.status === 'attended').length}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">{t('admin.attendance.absent')}:</span>{' '}
                  {enrollments.filter(e => e.status === 'absent').length}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Attendance List */}
        {selectedClass && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{t('admin.attendance.attendanceList')}</h2>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ${
                    selectedClass.attendance_confirmed
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedClass.attendance_confirmed
                      ? t('admin.attendance.confirmed')
                      : t('admin.attendance.notConfirmed')}
                  </span>
                  {!selectedClass.attendance_confirmed && (
                    <button
                      onClick={toggleAttendanceConfirmation}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium bg-primary text-white hover:bg-primary-dark whitespace-nowrap"
                    >
                      {t('admin.attendance.confirmAttendanceStatus')}
                    </button>
                  )}
                  {selectedClass.attendance_confirmed && (
                    <button
                      onClick={toggleAttendanceConfirmation}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200 whitespace-nowrap"
                    >
                      {t('admin.attendance.markAsUnconfirmed')}
                    </button>
                  )}
                </div>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
                <input
                  type="text"
                  placeholder={t('admin.attendance.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {filteredEnrollments.length === 0 ? (
              <div className="text-center py-8 text-gray-600 text-sm sm:text-base">
                {searchTerm ? t('admin.attendance.noResults') : t('admin.attendance.noEnrollments')}
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.attendance.studentName')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.attendance.mobile')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.attendance.status')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.attendance.checkIn')}</th>
                        {!selectedClass.attendance_confirmed && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.attendance.actions')}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredEnrollments.map((enrollment) => (
                        <tr key={enrollment.id}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{enrollment.user_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{formatMobile(enrollment.user_mobile)}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(enrollment.status)}`}>
                              {getStatusLabel(enrollment.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {enrollment.check_in_time ? formatDateTime(enrollment.check_in_time, getLocale()) : '-'}
                          </td>
                          {!selectedClass.attendance_confirmed && (
                            <td className="px-4 py-3 text-sm">
                              <select
                                value={enrollment.status}
                                onChange={(e) => updateAttendanceStatus(enrollment.id, e.target.value as 'enrolled' | 'attended' | 'absent' | 'sick_leave')}
                                className="text-sm border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
                              >
                                <option value="enrolled">{t('admin.attendance.statuses.enrolled')}</option>
                                <option value="attended">{t('admin.attendance.statuses.attended')}</option>
                                <option value="absent">{t('admin.attendance.statuses.absent')}</option>
                                <option value="sick_leave">{t('admin.attendance.statuses.sick_leave')}</option>
                              </select>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {filteredEnrollments.map((enrollment) => (
                    <div key={enrollment.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-gray-900 mb-1">{enrollment.user_name}</h3>
                          <p className="text-xs text-gray-600">{formatMobile(enrollment.user_mobile)}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(enrollment.status)}`}>
                          {getStatusLabel(enrollment.status)}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 font-medium">{t('admin.attendance.checkIn')}:</span>
                          <span className="text-gray-900">
                            {enrollment.check_in_time ? formatDateTime(enrollment.check_in_time, getLocale()) : '-'}
                          </span>
                        </div>
                        {!selectedClass.attendance_confirmed && (
                          <div className="pt-2 border-t border-gray-200">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              {t('admin.attendance.status')}:
                            </label>
                            <select
                              value={enrollment.status}
                              onChange={(e) => updateAttendanceStatus(enrollment.id, e.target.value as 'enrolled' | 'attended' | 'absent' | 'sick_leave')}
                              className="w-full text-sm border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="enrolled">{t('admin.attendance.statuses.enrolled')}</option>
                              <option value="attended">{t('admin.attendance.statuses.attended')}</option>
                              <option value="absent">{t('admin.attendance.statuses.absent')}</option>
                              <option value="sick_leave">{t('admin.attendance.statuses.sick_leave')}</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

