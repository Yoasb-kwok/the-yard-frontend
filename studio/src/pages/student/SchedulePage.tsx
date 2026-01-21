import { useEffect, useState, useMemo } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../../lib/utils';
import { formatDateTime as formatDateTimeUtil } from '../../lib/utils';
import { Calendar, Clock, FileText, X, CheckCircle, MoreVertical, ChevronDown, ChevronUp } from 'lucide-react';

interface Enrollment {
  id: string;
  status: string;
  class: {
    id: string;
    name: string;
    instructor: string;
    start_time: string;
    end_time: string;
    program_code?: string;
  };
  extension_application?: {
    status: 'pending' | 'approved' | 'rejected';
    applied_date?: string;
  };
  sick_leave_application?: {
    status: 'pending' | 'approved' | 'rejected';
    applied_date?: string;
  };
}

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'extension' | 'sickLeave';
  enrollment: Enrollment;
  onSubmit: (enrollmentId: string, type: 'extension' | 'sickLeave', reason: string) => void;
}

// Profile-specific mock enrollments for testing (each child has different courses)
function getMockEnrollmentsForProfile(profileId: string | undefined): Enrollment[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const hour = 60 * 60 * 1000;
  const cls = (id: string, name: string, inst: string, start: number, dur: number, code: string) => ({
    id,
    class: {
      id,
      name,
      instructor: inst,
      start_time: new Date(start).toISOString(),
      end_time: new Date(start + dur).toISOString(),
      program_code: code,
    },
  });
  if (profileId === 'student-001') {
    return [
      { ...cls('1', 'Yoga Basics', 'Jane Smith', now + 1 * day, hour, 'YG001'), status: 'enrolled' },
      { ...cls('2', 'Pilates Intermediate', 'John Doe', now + 3 * day, 90 * 60000, 'PL002'), status: 'enrolled' },
      { ...cls('3', '補課 - Yoga Basics', 'Jane Smith', now + 5 * day, hour, 'YG001-MAKEUP'), status: 'enrolled' },
      { ...cls('4', 'Yoga Basics', 'Jane Smith', now - 2 * day, hour, 'YG001'), status: 'attended' },
      { ...cls('5', 'Pilates Intermediate', 'John Doe', now - 7 * day, 90 * 60000, 'PL002'), status: 'attended' },
      { ...cls('6', '補課 - Yoga Basics', 'Jane Smith', now - 14 * day, hour, 'YG001-MAKEUP'), status: 'missed' },
    ];
  }
  if (profileId === 'student-001-sub-2') {
    return [
      { ...cls('1', '韓風小明星KPOP班', 'Shirley', now + 2 * day, hour, 'KPW1L1'), status: 'enrolled' },
      { ...cls('2', '幼兒街舞入門班', 'Wawa', now + 4 * day, hour, 'PSW6R3'), status: 'enrolled' },
      { ...cls('3', 'KPOP 進階', 'Shirley', now - 3 * day, hour, 'KPW2L1'), status: 'attended' },
      { ...cls('4', '幼兒街舞', 'Wawa', now - 10 * day, hour, 'PSW6R3'), status: 'attended' },
    ];
  }
  if (profileId === 'student-001-sub-3') {
    return [
      { ...cls('1', '進階街舞', 'C+', now + 1 * day + 12 * hour, hour, 'BSW6R9'), status: 'enrolled' },
      { ...cls('2', 'Hip Hop 基礎', 'John', now + 5 * day, hour, 'HH001'), status: 'enrolled' },
      { ...cls('3', '進階街舞', 'C+', now - 1 * day, hour, 'BSW6R9'), status: 'attended' },
      { ...cls('4', 'Hip Hop', 'John', now - 8 * day, hour, 'HH001'), status: 'missed' },
    ];
  }
  return [
    { ...cls('1', 'Yoga Basics', 'Jane Smith', now + 1 * day, hour, 'YG001'), status: 'enrolled' },
    { ...cls('2', 'Yoga Basics', 'Jane Smith', now - 2 * day, hour, 'YG001'), status: 'attended' },
  ];
}

function ApplicationModal({ isOpen, onClose, type, enrollment, onSubmit }: ApplicationModalProps) {
  const { t, i18n } = useTranslation();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Map i18n language codes to locale strings for date formatting
  const getLocale = (): string => {
    const langMap: { [key: string]: string } = {
      'en': 'en-US',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
    };
    return langMap[i18n.language] || i18n.language || 'en-US';
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
    onSubmit(enrollment.id, type, reason);
    setReason('');
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-900">
            {type === 'extension' ? t('schedule.applyExtension') : t('schedule.applySickLeave')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              {t('schedule.class')}: <span className="font-medium">{enrollment.class.name}</span>
            </p>
            <p className="text-sm text-gray-600">
              {t('schedule.date')}: <span className="font-medium">{formatDateTime(enrollment.class.start_time, getLocale())}</span>
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('schedule.reason')}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t('schedule.reasonPlaceholder')}
              required
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? t('trial.submitting') : t('common.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const { profile } = useAuth();
  const { t, i18n } = useTranslation();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [applicationModal, setApplicationModal] = useState<{
    isOpen: boolean;
    type: 'extension' | 'sickLeave' | null;
    enrollment: Enrollment | null;
  }>({ isOpen: false, type: null, enrollment: null });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [pastLessonsExpanded, setPastLessonsExpanded] = useState(false);

  useEffect(() => {
    if (profile) {
      loadSchedule();
    }
  }, [profile?.id]);

  async function loadSchedule() {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setEnrollments(getMockEnrollmentsForProfile(profile?.id));
    setLoading(false);
  }

  // Separate upcoming and past lessons
  const { upcomingLessons, pastLessons } = useMemo(() => {
    const now = new Date();
    const upcoming: Enrollment[] = [];
    const past: Enrollment[] = [];

    enrollments.forEach((enrollment) => {
      const classEndTime = new Date(enrollment.class.end_time);
      if (classEndTime >= now) {
        upcoming.push(enrollment);
      } else {
        past.push(enrollment);
      }
    });

    // Sort upcoming by start time (ascending)
    upcoming.sort((a, b) => 
      new Date(a.class.start_time).getTime() - new Date(b.class.start_time).getTime()
    );

    // Sort past by start time (descending - most recent first)
    past.sort((a, b) => 
      new Date(b.class.start_time).getTime() - new Date(a.class.start_time).getTime()
    );

    return { upcomingLessons: upcoming, pastLessons: past };
  }, [enrollments]);

  // Map i18n language codes to locale strings for date formatting
  const getLocale = (): string => {
    const langMap: { [key: string]: string } = {
      'en': 'en-US',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
    };
    return langMap[i18n.language] || i18n.language || 'en-US';
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'enrolled':
        return t('schedule.status.enrolled');
      case 'attended':
        return t('schedule.status.attended');
      case 'missed':
        return t('schedule.status.missed');
      default:
        return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'enrolled':
        return 'bg-primary-lighter text-primary-dark';
      case 'attended':
        return 'bg-green-100 text-green-800';
      case 'missed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleApplicationSubmit = (enrollmentId: string, type: 'extension' | 'sickLeave', reason: string) => {
    setEnrollments(prev => prev.map(enrollment => {
      if (enrollment.id === enrollmentId) {
        const applicationKey = type === 'sickLeave' ? 'sick_leave_application' : 'extension_application';
        return {
          ...enrollment,
          [applicationKey]: {
            status: 'pending' as const,
            applied_date: new Date().toISOString(),
          },
        };
      }
      return enrollment;
    }));

    const message = type === 'extension' 
      ? t('schedule.extensionApplied')
      : t('schedule.sickLeaveApplied');
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const openApplicationModal = (enrollment: Enrollment, type: 'extension' | 'sickLeave') => {
    setApplicationModal({ isOpen: true, type, enrollment });
  };

  const closeApplicationModal = () => {
    setApplicationModal({ isOpen: false, type: null, enrollment: null });
  };

  const getApplicationStatus = (application: { status: string } | undefined) => {
    if (!application) return null;
    switch (application.status) {
      case 'pending':
        return { label: t('schedule.status.pending'), class: 'bg-yellow-100 text-yellow-800' };
      case 'approved':
        return { label: t('schedule.status.approved'), class: 'bg-green-100 text-green-800' };
      case 'rejected':
        return { label: t('schedule.status.rejected'), class: 'bg-red-100 text-red-800' };
      default:
        return null;
    }
  };

  const renderLessonCard = (enrollment: Enrollment, isUpcoming: boolean = false) => {
    const extensionStatus = getApplicationStatus(enrollment.extension_application);
    const sickLeaveStatus = getApplicationStatus(enrollment.sick_leave_application);
    const showActions = isUpcoming && enrollment.status === 'enrolled' && 
      (!enrollment.extension_application || !enrollment.sick_leave_application);
    const isDropdownOpen = openDropdown === enrollment.id;

    return (
      <div key={enrollment.id} className="bg-white rounded-lg shadow-md p-6 relative">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-semibold text-gray-900">
                {enrollment.class.name}
              </h3>
              {enrollment.class.program_code && (
                <span className="text-sm font-medium text-primary bg-primary-lighter px-2 py-1 rounded">
                  {enrollment.class.program_code}
                </span>
              )}
            </div>
            <p className="text-gray-600 mb-1">
              {enrollment.class.instructor}
            </p>
            <p className="text-gray-600 mb-1">
              {formatDateTime(enrollment.class.start_time, getLocale())}
            </p>
            <p className="text-gray-600">
              {formatDateTime(enrollment.class.end_time, getLocale())}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusClass(enrollment.status)}`}>
              {getStatusLabel(enrollment.status)}
            </span>
            {showActions && (
              <div className="relative">
                <button
                  onClick={() => setOpenDropdown(isDropdownOpen ? null : enrollment.id)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
                {isDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setOpenDropdown(null)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 border">
                      {!enrollment.extension_application && (
                        <button
                          onClick={() => {
                            openApplicationModal(enrollment, 'extension');
                            setOpenDropdown(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                        >
                          <Clock className="h-4 w-4" />
                          {t('schedule.applyExtension')}
                        </button>
                      )}
                      {!enrollment.sick_leave_application && (
                        <button
                          onClick={() => {
                            openApplicationModal(enrollment, 'sickLeave');
                            setOpenDropdown(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                        >
                          <FileText className="h-4 w-4" />
                          {t('schedule.applySickLeave')}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Application Status Badges */}
        {(extensionStatus || sickLeaveStatus) && (
          <div className="mb-4 flex flex-wrap gap-2">
            {extensionStatus && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className={`px-2 py-1 rounded text-xs font-medium ${extensionStatus.class}`}>
                  {t('schedule.extension')}: {extensionStatus.label}
                </span>
              </div>
            )}
            {sickLeaveStatus && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-yellow-600" />
                <span className={`px-2 py-1 rounded text-xs font-medium ${sickLeaveStatus.class}`}>
                  {t('schedule.sickLeave')}: {sickLeaveStatus.label}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
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
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-gray-900">{t('schedule.title')}</h1>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            <span>{successMessage}</span>
          </div>
        )}

        {enrollments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">{t('schedule.noUpcomingClasses')}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Upcoming Lessons */}
            {upcomingLessons.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-gray-900">{t('schedule.upcomingLessons')}</h2>
                {upcomingLessons.map(enrollment => renderLessonCard(enrollment, true))}
              </div>
            )}

            {/* Past Lessons */}
            {pastLessons.length > 0 && (
              <div className="space-y-4">
                <button
                  onClick={() => setPastLessonsExpanded(!pastLessonsExpanded)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <h2 className="text-2xl font-semibold text-gray-900">{t('schedule.pastLessons')}</h2>
                  {pastLessonsExpanded ? (
                    <ChevronUp className="h-6 w-6 text-gray-600" />
                  ) : (
                    <ChevronDown className="h-6 w-6 text-gray-600" />
                  )}
                </button>
                {pastLessonsExpanded && (
                  <div className="space-y-4">
                    {pastLessons.map(enrollment => renderLessonCard(enrollment, false))}
                  </div>
                )}
              </div>
            )}

            {/* Show message if no lessons at all */}
            {upcomingLessons.length === 0 && pastLessons.length === 0 && (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">{t('schedule.noUpcomingClasses')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Application Modal */}
      {applicationModal.enrollment && applicationModal.type && (
        <ApplicationModal
          isOpen={applicationModal.isOpen}
          onClose={closeApplicationModal}
          type={applicationModal.type}
          enrollment={applicationModal.enrollment}
          onSubmit={handleApplicationSubmit}
        />
      )}
    </Layout>
  );
}
