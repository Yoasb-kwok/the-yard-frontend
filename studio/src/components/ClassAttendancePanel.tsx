import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateTime, formatProgramCodeDisplay } from '../lib/utils';
import { Search, X, AlertTriangle, Users, ChevronUp, RefreshCw } from 'lucide-react';

export interface Enrollment {
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
  reassigned_to_class_id?: string | null;
  reassigned_to_class_name?: string | null;
  reassigned_to_class_code?: string | null;
  reassigned_to_class_start_time?: string | null;
  reassigned_to_class_end_time?: string | null;
}

export interface ClassWithAttendance {
  id: string;
  name: string;
  class_code: string;
  lesson_number?: number | null;
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

interface ClassAttendancePanelProps {
  class: ClassWithAttendance;
  enrollments: Enrollment[];
  onUpdateStatus: (enrollmentId: string, status: 'enrolled' | 'attended' | 'absent' | 'sick_leave') => void;
  onToggleConfirmation: () => void;
  onCancelClass: () => void;
  onReassign: () => void;
  onRefundToken?: (enrollmentId: string, userId: string, userName: string, remarks: string) => void;
  onMarkMultipleAttended?: (enrollmentIds: string[]) => void | Promise<void>;
  onClose?: () => void;
  inline?: boolean;
}

function formatMobile(mobile: string | null): string {
  if (!mobile) return '-';
  if (mobile.startsWith('852')) return `+852 ${mobile.substring(3)}`;
  if (mobile.startsWith('853')) return `+853 ${mobile.substring(3)}`;
  if (mobile.startsWith('86')) return `+86 ${mobile.substring(2)}`;
  return `+852 ${mobile}`;
}

export default function ClassAttendancePanel({
  class: selectedClass,
  enrollments,
  onUpdateStatus,
  onToggleConfirmation,
  onCancelClass,
  onReassign,
  onRefundToken,
  onMarkMultipleAttended,
  onClose,
  inline = false,
}: ClassAttendancePanelProps) {
  const { t, i18n } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [cancelModal, setCancelModal] = useState(false);
  const [refundModal, setRefundModal] = useState<{
    isOpen: boolean;
    enrollmentId: string;
    userId: string;
    userName: string;
    remarks: string;
  }>({ isOpen: false, enrollmentId: '', userId: '', userName: '', remarks: '' });

  const enrolledStudents = enrollments.filter((e) => e.status === 'enrolled');

  const getLocale = (): string => {
    const langMap: { [key: string]: string } = {
      en: 'en-US',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
    };
    return langMap[i18n.language] || i18n.language || 'en-US';
  };

  const formatCheckInDisplay = (value: string | null): string => {
    if (!value) return '-';
    if (value.includes('T') || value.includes('-')) return formatDateTime(value, getLocale());
    return value;
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

  const filteredEnrollments = enrollments.filter(
    (e) =>
      e.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.user_mobile?.includes(searchTerm)
  );

  const canMarkAttended = filteredEnrollments.some((e) => e.status !== 'attended');
  const selectedCount = filteredEnrollments.filter((e) => selectedIds.has(e.id)).length;
  const allSelected = filteredEnrollments.length > 0 && selectedCount === filteredEnrollments.length;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredEnrollments.forEach((e) => next.delete(e.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredEnrollments.forEach((e) => next.add(e.id));
        return next;
      });
    }
  }

  async function handleMarkSelectedAsAttended() {
    const ids = filteredEnrollments.filter((e) => selectedIds.has(e.id)).map((e) => e.id);
    if (ids.length === 0) return;
    await onMarkMultipleAttended?.(ids);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  }

  function handleCancelClass() {
    if (!confirm(t('admin.attendance.confirmCancelClass'))) return;
    onCancelClass();
    setCancelModal(false);
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      {/* Header: title, collapse, actions */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">{t('admin.attendance.attendanceList')}</h3>
            {inline && onClose && (
              <button
                onClick={onClose}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-1"
                title={t('admin.classes.attendance')}
              >
                <ChevronUp className="h-4 w-4" />
                <span className="text-sm">{t('common.collapse')}</span>
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!selectedClass.is_cancelled ? (
              <button
                onClick={() => setCancelModal(true)}
                className="px-3 py-1.5 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 flex items-center gap-1.5"
              >
                <X className="h-4 w-4" />
                {t('admin.attendance.cancelClass')}
              </button>
            ) : (
              enrolledStudents.length > 0 && (
                <button
                  onClick={onReassign}
                  className="px-3 py-1.5 rounded-md text-sm font-medium bg-primary text-white hover:bg-primary-dark flex items-center gap-1.5"
                >
                  <Users className="h-4 w-4" />
                  {t('admin.attendance.reassignStudents')}
                </button>
              )
            )}
          </div>
        </div>
        {selectedClass.is_cancelled && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800 text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium">{t('admin.attendance.classCancelledWarning')}</span>
            </div>
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                selectedClass.attendance_confirmed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {selectedClass.attendance_confirmed
                ? t('admin.attendance.confirmed')
                : t('admin.attendance.notConfirmed')}
            </span>
            {!selectedClass.attendance_confirmed && (
              <button
                onClick={onToggleConfirmation}
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary-dark"
              >
                {t('admin.attendance.confirmAttendanceStatus')}
              </button>
            )}
            {selectedClass.attendance_confirmed && (
              <button
                onClick={onToggleConfirmation}
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
              >
                {t('admin.attendance.markAsUnconfirmed')}
              </button>
            )}
          </div>
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder={t('admin.attendance.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        {onMarkMultipleAttended && canMarkAttended && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-sm text-primary hover:underline"
            >
              {allSelected ? t('admin.attendance.unselectAll') : t('admin.attendance.selectAll')}
            </button>
            {selectedCount > 0 && (
              <button
                type="button"
                onClick={handleMarkSelectedAsAttended}
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-green-600 text-white hover:bg-green-700"
              >
                {t('admin.attendance.markSelectedAsAttended')} ({selectedCount})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table / Cards */}
      {filteredEnrollments.length === 0 ? (
        <div className="text-center py-6 text-gray-600 text-sm">
          {searchTerm ? t('admin.attendance.noResults') : t('admin.attendance.noEnrollments')}
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {onMarkMultipleAttended && (
                    <th className="px-2 py-2 text-left w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                        aria-label={t('admin.attendance.selectAll')}
                      />
                    </th>
                  )}
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.attendance.studentName')}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.attendance.mobile')}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.attendance.status')}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.attendance.checkIn')}</th>
                  {selectedClass.is_cancelled && (
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.attendance.reassignedTo')}</th>
                  )}
                  {!selectedClass.attendance_confirmed && (
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.attendance.actions')}</th>
                  )}
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.attendance.refund')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEnrollments.map((enrollment) => (
                  <tr key={enrollment.id}>
                    {onMarkMultipleAttended && (
                      <td className="px-2 py-2 w-10">
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
                    )}
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{enrollment.user_name}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{formatMobile(enrollment.user_mobile)}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(enrollment.status)}`}>
                        {getStatusLabel(enrollment.status)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {formatCheckInDisplay(enrollment.check_in_time)}
                    </td>
                    {selectedClass.is_cancelled && (
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {enrollment.reassigned_to_class_name ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-primary">{enrollment.reassigned_to_class_name}</span>
                            <span className="text-xs text-gray-500">{enrollment.reassigned_to_class_code}</span>
                            {enrollment.reassigned_to_class_start_time && (
                              <span className="text-xs text-gray-500">
                                {formatDateTime(enrollment.reassigned_to_class_start_time, getLocale())}
                                {enrollment.reassigned_to_class_end_time &&
                                  ` - ${formatDateTime(enrollment.reassigned_to_class_end_time, getLocale())}`}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-xs">{t('admin.attendance.notReassigned')}</span>
                        )}
                      </td>
                    )}
                    {!selectedClass.attendance_confirmed && (
                      <td className="px-4 py-2 text-sm">
                        <select
                          value={enrollment.status}
                          onChange={(e) => onUpdateStatus(enrollment.id, e.target.value as 'enrolled' | 'attended' | 'absent' | 'sick_leave')}
                          className="text-sm border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="enrolled">{t('admin.attendance.statuses.enrolled')}</option>
                          <option value="attended">{t('admin.attendance.statuses.attended')}</option>
                          <option value="absent">{t('admin.attendance.statuses.absent')}</option>
                          <option value="sick_leave">{t('admin.attendance.statuses.sick_leave')}</option>
                        </select>
                      </td>
                    )}
                    <td className="px-4 py-2 text-sm">
                      <button
                        onClick={() => {
                          if (onRefundToken) {
                            setRefundModal({
                              isOpen: true,
                              enrollmentId: enrollment.id,
                              userId: enrollment.user_id,
                              userName: enrollment.user_name,
                              remarks: '',
                            });
                          }
                        }}
                        disabled={!onRefundToken}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                          onRefundToken
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                        title={onRefundToken ? t('admin.attendance.refundToken') : ''}
                      >
                        <RefreshCw className="h-4 w-4" />
                        {t('admin.attendance.refund')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-2">
            {filteredEnrollments.map((enrollment) => (
              <div key={enrollment.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0 flex items-start gap-2">
                    {onMarkMultipleAttended && enrollment.status !== 'attended' && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(enrollment.id)}
                        onChange={() => toggleSelect(enrollment.id)}
                        className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                        aria-label={enrollment.user_name}
                      />
                    )}
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">{enrollment.user_name}</h4>
                      <p className="text-xs text-gray-600">{formatMobile(enrollment.user_mobile)}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${getStatusColor(enrollment.status)}`}>
                    {getStatusLabel(enrollment.status)}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">{t('admin.attendance.checkIn')}:</span>
                    <span className="text-gray-900">
                      {formatCheckInDisplay(enrollment.check_in_time)}
                    </span>
                  </div>
                  {selectedClass.is_cancelled && (
                    <div className="pt-1.5 border-t border-gray-200">
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-medium">{t('admin.attendance.reassignedTo')}:</span>
                        <span className="text-gray-900 text-right">
                          {enrollment.reassigned_to_class_name ? (
                            <span className="font-medium text-primary">{enrollment.reassigned_to_class_name}</span>
                          ) : (
                            <span className="text-gray-400 italic">{t('admin.attendance.notReassigned')}</span>
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                  {!selectedClass.attendance_confirmed && (
                    <div className="pt-1.5 border-t border-gray-200">
                      <label className="block text-xs font-medium text-gray-700 mb-1">{t('admin.attendance.status')}</label>
                      <select
                        value={enrollment.status}
                        onChange={(e) => onUpdateStatus(enrollment.id, e.target.value as 'enrolled' | 'attended' | 'absent' | 'sick_leave')}
                        className="w-full text-sm border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="enrolled">{t('admin.attendance.statuses.enrolled')}</option>
                        <option value="attended">{t('admin.attendance.statuses.attended')}</option>
                        <option value="absent">{t('admin.attendance.statuses.absent')}</option>
                        <option value="sick_leave">{t('admin.attendance.statuses.sick_leave')}</option>
                      </select>
                    </div>
                  )}
                  <div className="pt-1.5 border-t border-gray-200">
                    <button
                      onClick={() => {
                        if (onRefundToken) {
                          setRefundModal({
                            isOpen: true,
                            enrollmentId: enrollment.id,
                            userId: enrollment.user_id,
                            userName: enrollment.user_name,
                            remarks: '',
                          });
                        }
                      }}
                      disabled={!onRefundToken}
                      className={`w-full px-3 py-1.5 text-sm font-medium rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                        onRefundToken
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <RefreshCw className="h-4 w-4" />
                      {t('admin.attendance.refund')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Refund Token Confirmation Modal */}
      {refundModal.isOpen && (
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
                <span className="font-medium">{t('admin.attendance.class')}:</span> {selectedClass.name} ({formatProgramCodeDisplay(selectedClass.class_code, selectedClass.lesson_number) || selectedClass.class_code})
              </p>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.attendance.refundRemarks')}</label>
              <p className="text-xs text-gray-500 mb-2">{t('admin.attendance.refundRemarksHint')}</p>
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
                onClick={() => {
                  if (onRefundToken && refundModal.remarks.trim()) {
                    onRefundToken(refundModal.enrollmentId, refundModal.userId, refundModal.userName, refundModal.remarks.trim());
                    setRefundModal({ isOpen: false, enrollmentId: '', userId: '', userName: '', remarks: '' });
                  }
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
      {cancelModal && (
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
                onClick={() => setCancelModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">{t('admin.attendance.cancelClassWarning')}</p>
            </div>
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">{t('admin.attendance.classToCancel')}</h4>
              <p className="text-sm text-gray-600">
                {selectedClass.name} ({formatProgramCodeDisplay(selectedClass.class_code, selectedClass.lesson_number) || selectedClass.class_code})
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">{t('admin.attendance.instructor')}:</span> {selectedClass.instructor}
              </p>
              {selectedClass.substitute_instructor && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">{t('admin.attendance.substituteInstructor')}:</span> {selectedClass.substitute_instructor}
                </p>
              )}
              <p className="text-sm text-gray-600">
                {formatDateTime(selectedClass.start_time, getLocale())} - {formatDateTime(selectedClass.end_time, getLocale())}
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button onClick={() => setCancelModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">
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
  );
}
