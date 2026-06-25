import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { formatDateTime, formatDateTimeRange, formatMobileForDisplay } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { dedupeLatestEnrollmentPerStudent } from '../../lib/adminClassEnrollments';
import { ArrowLeft, Search, X, AlertTriangle, Users, RefreshCw } from 'lucide-react';
import { TablePaginationBar, useTablePagination } from '../../components/TablePagination';

interface Class {
  id: string;
  name: string;
  class_code: string;
  instructor: string;
  substitute_instructor?: string | null;
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
  status: 'enrolled' | 'attended' | 'absent' | 'sick_leave' | 'cancelled';
  check_in_time: string | null;
  check_out_time: string | null;
  sick_leave_document_url: string | null;
  created_at: string;
  reassigned_to_class_id?: string | null;
  reassigned_to_class_name?: string | null;
  reassigned_to_class_code?: string | null;
  reassigned_to_class_start_time?: string | null;
  reassigned_to_class_end_time?: string | null;
}

function toTimeString(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatCheckInTime(value: string | null, locale: string): string {
  if (!value) return '-';
  if (value.includes('T') || value.includes('-')) return formatDateTime(value, locale);
  return value;
}

export default function ClassAttendancePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { classId } = useParams<{ classId: string }>();
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cancelModal, setCancelModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [refundModal, setRefundModal] = useState<{
    isOpen: boolean;
    enrollmentId: string;
    userId: string;
    userName: string;
    remarks: string;
  }>({ isOpen: false, enrollmentId: '', userId: '', userName: '', remarks: '' });

  useEffect(() => {
    if (classId) {
      loadClassAndEnrollments(classId);
    } else {
      setLoading(false);
    }
  }, [classId]);

  async function loadClassAndEnrollments(classId: string) {
    try {
      const [classRes, enrollRes] = await Promise.all([
        api.get<any>(`/admin/classes/${classId}`),
        api.get<any[]>(`/admin/classes/${classId}/enrollments`),
      ]);
      if (classRes.success && classRes.data) {
        const c = classRes.data;
        setSelectedClass({
          id: String(c.id),
          name: c.name ?? '',
          class_code: c.class_code ?? c.program_code ?? '',
          instructor: c.instructor ?? '',
          substitute_instructor: c.substitute_instructor ?? null,
          start_time: c.start_time ?? '',
          end_time: c.end_time ?? '',
          capacity: Number(c.capacity) || 0,
          enrolled_count: Number(c.enrolled_count) ?? 0,
          is_internal: c.is_internal === 1 || c.is_internal === true,
          is_cancelled: c.is_cancelled === 1 || c.is_cancelled === true,
          location: c.location,
          attendance_confirmed: c.attendance_confirmed === 1 || c.attendance_confirmed === true,
        });
      } else {
        setSelectedClass(null);
      }
      if (enrollRes.success && Array.isArray(enrollRes.data)) {
        setEnrollments(
          dedupeLatestEnrollmentPerStudent(
            enrollRes.data.map((e: any) => ({
              id: String(e.id),
              class_id: classId,
              user_id: e.user_id ?? '',
              user_name: e.user_name ?? '',
              user_mobile: e.user_mobile ?? null,
              status: (e.status && e.status !== '' ? e.status : 'absent') as Enrollment['status'],
              check_in_time: e.check_in_time ?? null,
              check_out_time: e.check_out_time ?? null,
              sick_leave_document_url: e.sick_leave_document_url ?? null,
              created_at: e.created_at ?? '',
            })),
          ),
        );
      } else {
        setEnrollments([]);
      }
    } catch {
      setSelectedClass(null);
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  }

  async function updateAttendanceStatus(enrollmentId: string, newStatus: 'enrolled' | 'attended' | 'absent' | 'sick_leave') {
    const now = new Date();
    const payload: any = { status: newStatus };
    if (newStatus === 'attended') {
      payload.check_in_time = toTimeString(now);
      payload.check_out_time = toTimeString(now);
    }
    try {
      await api.patch(`/admin/class-enrollments/${enrollmentId}`, payload);
      setEnrollments((prev) =>
        prev.map((e) =>
          e.id === enrollmentId
            ? {
                ...e,
                status: newStatus,
                check_in_time: newStatus === 'attended' ? payload.check_in_time : e.check_in_time,
                check_out_time: newStatus === 'attended' ? payload.check_out_time : e.check_out_time,
              }
            : e
        )
      );
    } catch (err) {
      console.error('Failed to update attendance:', err);
      alert((err as Error).message || t('common.error'));
    }
  }

  async function handleMarkMultipleAttended(enrollmentIds: string[]) {
    const now = new Date();
    const checkIn = toTimeString(now);
    const checkOut = toTimeString(now);
    try {
      await Promise.all(
        enrollmentIds.map((id) =>
          api.patch(`/admin/class-enrollments/${id}`, { status: 'attended', check_in_time: checkIn, check_out_time: checkOut })
        )
      );
      setEnrollments((prev) =>
        prev.map((e) =>
          enrollmentIds.includes(e.id)
            ? { ...e, status: 'attended' as const, check_in_time: checkIn, check_out_time: checkOut }
            : e
        )
      );
    } catch (err) {
      console.error('Failed to mark as attended:', err);
      alert((err as Error).message || t('common.error'));
    }
  }

  async function handleRefundToken(enrollmentId: string, userId: string, userName: string, remarks: string) {
    if (!selectedClass) return;
    try {
      await api.post('admin/refund-records', {
        enrollment_id: enrollmentId,
        user_id: userId,
        user_name: userName,
        class_id: selectedClass.id,
        class_name: selectedClass.name,
        class_code: selectedClass.class_code ?? '',
        tokens_refunded: 1,
        remarks,
        refunded_by: profile?.full_name ?? 'Admin',
      });
      window.dispatchEvent(new CustomEvent('refund-record-added'));
      alert(t('admin.attendance.tokenRefunded', { name: userName }));
    } catch (err) {
      console.error('Refund record failed:', err);
      alert((err as Error).message || t('common.error'));
    }
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


  function openCancelModal() {
    setCancelModal(true);
  }

  function closeCancelModal() {
    setCancelModal(false);
  }

  async function handleCancelClass() {
    if (!selectedClass) return;
    
    if (!confirm(t('admin.attendance.confirmCancelClass'))) return;
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mark class as cancelled
    // Keep enrollments so we can reassign them later
    setSelectedClass({
      ...selectedClass,
      is_cancelled: true,
    });
    
    alert(t('admin.attendance.classCancelled'));
    closeCancelModal();
  }


  const getLocationLabel = (location?: string): string => {
    if (!location) return '-';
    return t(`home.locations.${location}`);
  };


  const enrolledStudents = enrollments.filter(
    e => e.class_id === selectedClass?.id && e.status === 'enrolled'
  );

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
  const {
    page: attPage,
    setPage: setAttPage,
    totalPages: attTotalPages,
    pageSize: attPageSize,
    totalItems: attTotalItems,
    paginatedItems: paginatedEnrollments,
  } = useTablePagination(filteredEnrollments, undefined, [searchTerm]);

  const selectableOnPage = paginatedEnrollments.filter((e) => e.status !== 'attended');
  const allSelectedOnPage =
    selectableOnPage.length > 0 && selectableOnPage.every((e) => selectedIds.has(e.id));

  const selectedCount = filteredEnrollments.filter((e) => selectedIds.has(e.id)).length;
  const canMarkAttended = filteredEnrollments.some((e) => e.status !== 'attended');

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleSelectAllOnPage() {
    const ids = selectableOnPage.map((e) => e.id);
    if (ids.length === 0) return;
    if (allSelectedOnPage) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
    }
  }
  async function onMarkSelectedAsAttended() {
    const ids = filteredEnrollments.filter((e) => selectedIds.has(e.id)).map((e) => e.id);
    if (ids.length === 0) return;
    await handleMarkMultipleAttended(ids);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
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
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{selectedClass.name}</h2>
              <div className="flex gap-2">
                {!selectedClass.is_cancelled ? (
                  <button
                    onClick={openCancelModal}
                    className="px-4 py-2 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    {t('admin.attendance.cancelClass')}
                  </button>
                ) : enrolledStudents.length > 0 ? (
                  <button
                    onClick={() => navigate(`/admin/classes/${selectedClass.id}/reassign`)}
                    className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-white hover:bg-primary-dark flex items-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    {t('admin.attendance.reassignStudents')}
                  </button>
                ) : null}
              </div>
            </div>
            {selectedClass.is_cancelled && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">{t('admin.attendance.classCancelledWarning')}</span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">{t('admin.attendance.classCode')}:</span> {selectedClass.class_code}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">{t('admin.attendance.instructor')}:</span> {selectedClass.instructor}
                </p>
                {selectedClass.substitute_instructor && (
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">{t('admin.attendance.substituteInstructor')}:</span> {selectedClass.substitute_instructor}
                  </p>
                )}
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">{t('admin.attendance.time')}:</span>{' '}
                  {formatDateTimeRange(selectedClass.start_time, selectedClass.end_time, getLocale())}
                </p>
                {selectedClass.location && (
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">{t('admin.attendance.location')}:</span> {getLocationLabel(selectedClass.location)}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">{t('admin.attendance.expectedCount', '應到')}:</span> {selectedClass.enrolled_count} / {selectedClass.capacity}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">{t('admin.attendance.attended')}:</span>{' '}
                  {enrollments.filter(e => e.status === 'attended').length}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">{t('admin.attendance.absent')}:</span>{' '}
                  {enrollments.filter(e => e.status === 'absent').length}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">{t('admin.attendance.leaveCount', '請假')}:</span>{' '}
                  {enrollments.filter(e => e.status === 'sick_leave').length}
                </p>
                {enrollments.filter(e => e.status === 'sick_leave').length > 0 && (
                  <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-100">
                    <p className="text-xs font-medium text-amber-800 mb-1">{t('admin.attendance.leaveListTitle', '請假學生名單')}</p>
                    <ul className="text-sm text-amber-900 space-y-0.5">
                      {enrollments.filter(e => e.status === 'sick_leave').map((e) => (
                        <li key={e.id}>{e.user_name}（{t('admin.attendance.statuses.sick_leave', '病假')}）</li>
                      ))}
                    </ul>
                  </div>
                )}
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
              <p className="text-xs text-gray-500 mt-1">{t('admin.attendance.confirmAttendanceNote')}</p>
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
            {canMarkAttended && (
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <button type="button" onClick={toggleSelectAllOnPage} className="text-sm text-primary hover:underline">
                  {allSelectedOnPage ? t('admin.attendance.unselectAll') : t('admin.attendance.selectAll')}
                </button>
                {selectedCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkSelectedAsAttended}
                    className="px-3 py-1.5 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700"
                  >
                    {t('admin.attendance.markSelectedAsAttended')} ({selectedCount})
                  </button>
                )}
              </div>
            )}

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
                        <th className="px-2 py-3 w-10">
                          <input
                            type="checkbox"
                            checked={allSelectedOnPage}
                            onChange={toggleSelectAllOnPage}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                            aria-label={t('admin.attendance.selectAll')}
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.attendance.studentName')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.attendance.mobile')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.attendance.status')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.attendance.checkIn')}</th>
                        {selectedClass.is_cancelled && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.attendance.reassignedTo')}</th>
                        )}
                        {!selectedClass.attendance_confirmed && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.attendance.actions')}</th>
                        )}
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.attendance.refund')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paginatedEnrollments.map((enrollment) => (
                        <tr key={enrollment.id}>
                          <td className="px-2 py-3 w-10">
                            {enrollment.status !== 'attended' && (
                              <input
                                type="checkbox"
                                checked={selectedIds.has(enrollment.id)}
                                onChange={() => toggleSelect(enrollment.id)}
                                className="rounded border-gray-300 text-primary focus:ring-primary"
                                aria-label={enrollment.user_name}
                              />
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{enrollment.user_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{formatMobileForDisplay(enrollment.user_mobile, '-')}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(enrollment.status)}`}>
                              {getStatusLabel(enrollment.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {formatCheckInTime(enrollment.check_in_time, getLocale())}
                          </td>
                          {selectedClass.is_cancelled && (
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {enrollment.reassigned_to_class_name ? (
                                <div className="flex flex-col gap-1">
                                  <span className="font-medium text-primary">{enrollment.reassigned_to_class_name}</span>
                                  <span className="text-xs text-gray-500">{enrollment.reassigned_to_class_code}</span>
                                  {enrollment.reassigned_to_class_start_time && (
                                    <span className="text-xs text-gray-500">
                                      {enrollment.reassigned_to_class_end_time
                                        ? formatDateTimeRange(
                                            enrollment.reassigned_to_class_start_time,
                                            enrollment.reassigned_to_class_end_time,
                                            getLocale()
                                          )
                                        : formatDateTime(enrollment.reassigned_to_class_start_time, getLocale())}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">{t('admin.attendance.notReassigned')}</span>
                              )}
                            </td>
                          )}
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
                          <td className="px-4 py-3 text-sm">
                            <button
                              onClick={() => setRefundModal({
                                isOpen: true,
                                enrollmentId: enrollment.id,
                                userId: enrollment.user_id,
                                userName: enrollment.user_name,
                                remarks: '',
                              })}
                              className="px-3 py-1.5 text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 rounded-md flex items-center gap-1.5 transition-colors"
                              title={t('admin.attendance.refundToken')}
                            >
                              <RefreshCw className="h-4 w-4" />
                              {t('admin.attendance.refund')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <TablePaginationBar
                    page={attPage}
                    totalPages={attTotalPages}
                    totalItems={attTotalItems}
                    pageSize={attPageSize}
                    onPageChange={setAttPage}
                    className="hidden md:flex"
                  />
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {paginatedEnrollments.map((enrollment) => (
                    <div key={enrollment.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-gray-900 mb-1">{enrollment.user_name}</h3>
                          <p className="text-xs text-gray-600">{formatMobileForDisplay(enrollment.user_mobile, '-')}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(enrollment.status)}`}>
                          {getStatusLabel(enrollment.status)}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 font-medium">{t('admin.attendance.checkIn')}:</span>
                          <span className="text-gray-900">
                            {formatCheckInTime(enrollment.check_in_time, getLocale())}
                          </span>
                        </div>
                        {selectedClass.is_cancelled && (
                          <div className="pt-2 border-t border-gray-200">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-500 font-medium">{t('admin.attendance.reassignedTo')}:</span>
                              <span className="text-gray-900 text-right">
                                {enrollment.reassigned_to_class_name ? (
                                  <div className="flex flex-col items-end">
                                    <span className="font-medium text-primary">{enrollment.reassigned_to_class_name}</span>
                                    <span className="text-gray-500">{enrollment.reassigned_to_class_code}</span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic">{t('admin.attendance.notReassigned')}</span>
                                )}
                              </span>
                            </div>
                            {enrollment.reassigned_to_class_name && enrollment.reassigned_to_class_start_time && (
                              <div className="flex items-center justify-between text-xs mt-1">
                                <span className="text-gray-500 font-medium">{t('admin.attendance.time')}:</span>
                                <span className="text-gray-900 text-right">
                                  {enrollment.reassigned_to_class_end_time
                                    ? formatDateTimeRange(
                                        enrollment.reassigned_to_class_start_time,
                                        enrollment.reassigned_to_class_end_time,
                                        getLocale()
                                      )
                                    : formatDateTime(enrollment.reassigned_to_class_start_time, getLocale())}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
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
                        <div className="pt-2 border-t border-gray-200">
                          <button
                            onClick={() => setRefundModal({
                              isOpen: true,
                              enrollmentId: enrollment.id,
                              userId: enrollment.user_id,
                              userName: enrollment.user_name,
                              remarks: '',
                            })}
                            className="w-full px-3 py-2 text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 rounded-md flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <RefreshCw className="h-4 w-4" />
                            {t('admin.attendance.refund')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <TablePaginationBar
                  page={attPage}
                  totalPages={attTotalPages}
                  totalItems={attTotalItems}
                  pageSize={attPageSize}
                  onPageChange={setAttPage}
                  className="md:hidden border-t border-gray-200"
                />
              </>
            )}
          </div>
        )}

        {/* Refund Token Confirmation Modal */}
        {refundModal.isOpen && selectedClass && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <RefreshCw className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">{t('admin.attendance.refundToken')}</h3>
                </div>
                <button
                  onClick={() => setRefundModal({ isOpen: false, enrollmentId: '', userId: '', userName: '', remarks: '' })}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 font-medium mb-2">{t('admin.attendance.refundWarning')}</p>
                <p className="text-sm text-yellow-700">{t('admin.attendance.refundWarningDesc')}</p>
              </div>
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">{t('admin.attendance.studentInfo')}</h4>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">{t('admin.attendance.studentName')}:</span> {refundModal.userName}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">{t('admin.attendance.class')}:</span> {selectedClass.name} ({selectedClass.class_code})
                </p>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.attendance.refundRemarks')}</label>
                <textarea
                  value={refundModal.remarks}
                  onChange={(e) => setRefundModal((prev) => ({ ...prev, remarks: e.target.value }))}
                  placeholder={t('admin.attendance.refundRemarksPlaceholder')}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setRefundModal({ isOpen: false, enrollmentId: '', userId: '', userName: '', remarks: '' })}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 rounded-md transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={async () => {
                    if (!refundModal.remarks.trim()) return;
                    await handleRefundToken(refundModal.enrollmentId, refundModal.userId, refundModal.userName, refundModal.remarks.trim());
                    setRefundModal({ isOpen: false, enrollmentId: '', userId: '', userName: '', remarks: '' });
                  }}
                  disabled={!refundModal.remarks.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="h-4 w-4" />
                  {t('admin.attendance.confirmRefund')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Class Modal */}
        {cancelModal && selectedClass && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">{t('admin.attendance.cancelClass')}</h3>
                </div>
                <button
                  onClick={closeCancelModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Warning Message */}
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  {t('admin.attendance.cancelClassWarning')}
                </p>
              </div>

              {/* Class Information */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">{t('admin.attendance.classToCancel')}</h4>
                <p className="text-sm text-gray-600">{selectedClass.name} ({selectedClass.class_code})</p>
                <p className="text-sm text-gray-600">
                  {formatDateTimeRange(selectedClass.start_time, selectedClass.end_time, getLocale())}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={closeCancelModal}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleCancelClass}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  {t('admin.attendance.cancelClass')}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}

