import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { formatDate, formatDateTime, isExpiringSoon } from '../../lib/utils';
import { Calendar, Coins, AlertCircle, MoreVertical, Clock, FileText, X, Home } from 'lucide-react';

interface UserToken {
  id: string;
  remaining_tokens: number;
  total_tokens: number;
  expiry_date: string;
}

interface UpcomingClass {
  id: string;
  status: string;
  class: {
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
  enrollment: UpcomingClass;
  onSubmit: (enrollmentId: string, type: 'extension' | 'sickLeave', reason: string) => void;
}

// Profile-specific mock data for testing (each child has different tokens and courses)
function getMockTokensForProfile(profileId: string | undefined): UserToken[] {
  const base = Date.now();
  const day = 24 * 60 * 60 * 1000;
  if (profileId === 'student-001') {
    return [
      { id: 't1', remaining_tokens: 5, total_tokens: 10, expiry_date: new Date(base + 30 * day).toISOString().split('T')[0] },
      { id: 't2', remaining_tokens: 8, total_tokens: 8, expiry_date: new Date(base + 60 * day).toISOString().split('T')[0] },
    ];
  }
  if (profileId === 'student-001-sub-2') {
    return [
      { id: 't1', remaining_tokens: 12, total_tokens: 12, expiry_date: new Date(base + 45 * day).toISOString().split('T')[0] },
    ];
  }
  if (profileId === 'student-001-sub-3') {
    return [
      { id: 't1', remaining_tokens: 3, total_tokens: 10, expiry_date: new Date(base + 7 * day).toISOString().split('T')[0] },
      { id: 't2', remaining_tokens: 15, total_tokens: 15, expiry_date: new Date(base + 90 * day).toISOString().split('T')[0] },
    ];
  }
  return [
    { id: 't1', remaining_tokens: 6, total_tokens: 10, expiry_date: new Date(base + 20 * day).toISOString().split('T')[0] },
  ];
}

function getMockUpcomingClassesForProfile(profileId: string | undefined): UpcomingClass[] {
  const base = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const hour = 60 * 60 * 1000;
  if (profileId === 'student-001') {
    return [
      { id: 'u1', status: 'enrolled', class: { name: 'Yoga Basics', instructor: 'Jane Smith', start_time: new Date(base + 1 * day).toISOString(), end_time: new Date(base + 1 * day + hour).toISOString(), program_code: 'YG001' } },
      { id: 'u2', status: 'enrolled', class: { name: 'Pilates Intermediate', instructor: 'John Doe', start_time: new Date(base + 3 * day).toISOString(), end_time: new Date(base + 3 * day + 90 * 60000).toISOString(), program_code: 'PL002' } },
    ];
  }
  if (profileId === 'student-001-sub-2') {
    return [
      { id: 'u1', status: 'enrolled', class: { name: '韓風小明星KPOP班', instructor: 'Shirley', start_time: new Date(base + 2 * day).toISOString(), end_time: new Date(base + 2 * day + hour).toISOString(), program_code: 'KPW1L1' } },
      { id: 'u2', status: 'enrolled', class: { name: '幼兒街舞入門班', instructor: 'Wawa', start_time: new Date(base + 4 * day).toISOString(), end_time: new Date(base + 4 * day + hour).toISOString(), program_code: 'PSW6R3' } },
    ];
  }
  if (profileId === 'student-001-sub-3') {
    return [
      { id: 'u1', status: 'enrolled', class: { name: '進階街舞', instructor: 'C+', start_time: new Date(base + 1 * day + 12 * hour).toISOString(), end_time: new Date(base + 1 * day + 13 * hour).toISOString(), program_code: 'BSW6R9' } },
      { id: 'u2', status: 'enrolled', class: { name: 'Hip Hop 基礎', instructor: 'John', start_time: new Date(base + 5 * day).toISOString(), end_time: new Date(base + 5 * day + hour).toISOString(), program_code: 'HH001' } },
    ];
  }
  return [
    { id: 'u1', status: 'enrolled', class: { name: 'Yoga Basics', instructor: 'Jane Smith', start_time: new Date(base + 1 * day).toISOString(), end_time: new Date(base + 1 * day + hour).toISOString(), program_code: 'YG001' } },
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

export default function DashboardPage() {
  const { profile } = useAuth();
  const { t, i18n } = useTranslation();
  const [tokens, setTokens] = useState<UserToken[]>([]);
  const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [applicationModal, setApplicationModal] = useState<{
    isOpen: boolean;
    type: 'extension' | 'sickLeave' | null;
    enrollment: UpcomingClass | null;
  }>({ isOpen: false, type: null, enrollment: null });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Map i18n language codes to locale strings for date formatting
  const getLocale = (): string => {
    const langMap: { [key: string]: string } = {
      'en': 'en-US',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
    };
    return langMap[i18n.language] || i18n.language || 'en-US';
  };

  // Generate tutor profile image URL from UI Avatars
  const getTutorImageUrl = (name: string): string => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=128&background=random&color=fff&bold=true`;
  };

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [profile?.id]);

  async function loadData() {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setTokens(getMockTokensForProfile(profile?.id));
    setUpcomingClasses(getMockUpcomingClassesForProfile(profile?.id));
    setLoading(false);
  }

  const totalTokens = tokens.reduce((sum, t) => sum + t.remaining_tokens, 0);
  const expiringTokens = tokens.filter(t => isExpiringSoon(t.expiry_date));
  
  // Get the earliest expiry date from all tokens
  const earliestExpiryDate = tokens.length > 0 
    ? tokens.reduce((earliest, token) => {
        return new Date(token.expiry_date) < new Date(earliest) ? token.expiry_date : earliest;
      }, tokens[0].expiry_date)
    : null;

  const handleApplicationSubmit = (enrollmentId: string, type: 'extension' | 'sickLeave', reason: string) => {
    setUpcomingClasses(prev => prev.map(enrollment => {
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

  const openApplicationModal = (enrollment: UpcomingClass, type: 'extension' | 'sickLeave') => {
    setApplicationModal({ isOpen: true, type, enrollment });
  };

  const closeApplicationModal = () => {
    setApplicationModal({ isOpen: false, type: null, enrollment: null });
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
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center gap-3">
          <Home className="h-6 w-6 md:h-8 md:w-8 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {profile?.full_name ? t('dashboard.titleFor', { name: profile.full_name }) : t('dashboard.title')}
          </h1>
        </div>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
            {successMessage}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">{t('dashboard.tokenBalance')}</h2>
              <Coins className="h-6 w-6 md:h-8 md:w-8 text-yellow-500" />
            </div>
            <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{totalTokens}</div>
            <p className="text-gray-600 text-sm mb-3">{t('dashboard.availableTokens')}</p>
            
            {earliestExpiryDate && (
              <div className="text-sm text-gray-600 mb-3">
                {t('dashboard.expires')}: {formatDate(earliestExpiryDate, getLocale())}
              </div>
            )}

            {expiringTokens.length > 0 && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  {expiringTokens.length} {t('dashboard.tokensExpiring')}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">{t('dashboard.allUpcomingLessons')}</h2>
              <Calendar className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            </div>
            <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{upcomingClasses.length}</div>
            <p className="text-gray-600 text-sm">{t('dashboard.classesScheduled')}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">{t('dashboard.upcomingClasses')}</h2>
          {upcomingClasses.length === 0 ? (
            <p className="text-gray-600">{t('dashboard.noUpcomingClasses')}</p>
          ) : (
            <div className="space-y-0">
              {upcomingClasses.map((enrollment, index) => {
                const showActions = enrollment.status === 'enrolled' && 
                  (!enrollment.extension_application || !enrollment.sick_leave_application);
                const isDropdownOpen = openDropdown === enrollment.id;

                return (
                  <div key={enrollment.id}>
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <img
                        src={getTutorImageUrl(enrollment.class.instructor)}
                        alt={enrollment.class.instructor}
                        className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover flex-shrink-0 border-2 border-primary-lighter"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-medium text-gray-900">{enrollment.class.name}</div>
                          {enrollment.class.program_code && (
                            <span className="text-xs font-medium text-primary bg-primary-lighter px-2 py-0.5 rounded">
                              {enrollment.class.program_code}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          {enrollment.class.instructor}
                        </div>
                        <div className="text-sm text-gray-500">
                          {(() => {
                            const startDate = new Date(enrollment.class.start_time);
                            const endDate = new Date(enrollment.class.end_time);
                            const dateStr = startDate.toLocaleDateString(getLocale(), {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            });
                            const startTime = startDate.toLocaleTimeString(getLocale(), {
                              hour: '2-digit',
                              minute: '2-digit',
                            });
                            const endTime = endDate.toLocaleTimeString(getLocale(), {
                              hour: '2-digit',
                              minute: '2-digit',
                            });
                            return `${dateStr} ${startTime} - ${endTime}`;
                          })()}
                        </div>
                      </div>
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
                    {index < upcomingClasses.length - 1 && (
                      <div className="h-px bg-gray-200 my-3"></div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {applicationModal.isOpen && applicationModal.enrollment && applicationModal.type && (
          <ApplicationModal
            isOpen={applicationModal.isOpen}
            onClose={closeApplicationModal}
            type={applicationModal.type}
            enrollment={applicationModal.enrollment}
            onSubmit={handleApplicationSubmit}
          />
        )}
      </div>
    </Layout>
  );
}
