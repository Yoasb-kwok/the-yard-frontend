import { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import PageLoading from '../../components/PageLoading';
import LoadErrorBanner from '../../components/LoadErrorBanner';
import EmptyState from '../../components/EmptyState';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { formatDateTime, getLessonDates, getLessonDatesSkipHolidays } from '../../lib/utils';
import { useHolidays } from '../../lib/useHolidays';
import { api } from '../../lib/api';
import { DEMO_PROFILE_IDS, getFallbackUpcomingClasses, type EnrolledClass } from '../../lib/studentEnrollments';
import { Calendar as CalendarIcon, Clock, User, ChevronLeft, ChevronRight, MoreVertical, FileText, X, MapPin } from 'lucide-react';
import { getLocationInfo } from '../../lib/locationInfo';
import { useModalA11y } from '../../lib/useModalA11y';

const FALLBACK_UPCOMING_CLASSES: EnrolledClass[] = getFallbackUpcomingClasses();

/** One color per course for calendar (same idea as admin location colors). */
const LESSON_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

/** Per-lesson leave: enrollmentId -> lessonIndex (0-based) -> { type, status, documentName? } */
type LessonLeaveRequest = { type: 'personal' | 'sick'; status: 'pending' | 'approved' | 'rejected'; documentName?: string };

interface LessonLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  enrollment: EnrolledClass;
  lessonIndex: number;
  lessonDate: Date;
  onSubmit: (enrollmentId: string, lessonIndex: number, type: 'personal' | 'sick', reason: string, documentFile?: File | null) => void;
}

function LessonLeaveModal({ isOpen, onClose, enrollment, lessonIndex, lessonDate, onSubmit }: LessonLeaveModalProps) {
  const { t, i18n } = useTranslation();
  const contentRef = useRef<HTMLDivElement>(null);
  const [type, setType] = useState<'personal' | 'sick'>('personal');
  const [reason, setReason] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const locale = ({ 'en': 'en-US', 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW' }[i18n.language] || 'en-US');
  useModalA11y(isOpen, onClose, contentRef);
  if (!isOpen) return null;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    if (type === 'sick' && !documentFile) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 500));
    onSubmit(enrollment.id, lessonIndex, type, reason, type === 'sick' ? documentFile : undefined);
    setReason('');
    setDocumentFile(null);
    setSubmitting(false);
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div ref={contentRef} className="bg-white rounded-xl shadow-xl max-w-md w-full" role="dialog" aria-modal="true" aria-labelledby="lesson-leave-title">
        <div className="flex justify-between p-6 border-b">
          <div>
            <h3 id="lesson-leave-title" className="text-xl font-semibold text-gray-900">{t('schedule.leaveForLesson')}</h3>
            <p className="text-sm text-gray-500 mt-1">{enrollment.class.name} · {t('schedule.lessonN', { n: lessonIndex + 1 })}</p>
            <p className="text-sm text-gray-600 mt-0.5">{lessonDate.toLocaleDateString(locale, { weekday: 'long', month: 'short', day: 'numeric' })} {lessonDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('schedule.reason')}</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="leaveType" checked={type === 'personal'} onChange={() => setType('personal')} className="text-primary focus:ring-primary" />
                <span>{t('schedule.personalLeave')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="leaveType" checked={type === 'sick'} onChange={() => setType('sick')} className="text-primary focus:ring-primary" />
                <span>{t('schedule.sickLeaveWithDoc')}</span>
              </label>
            </div>
            {type === 'sick' && <p className="text-xs text-amber-700 mt-1">{t('schedule.sickLeaveDocRequired')}</p>}
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('schedule.reason')}</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary" placeholder={t('schedule.reasonPlaceholder')} required />
          </div>
          {type === 'sick' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('schedule.uploadSickLeaveDoc')} <span className="text-red-600">*</span></label>
              <input type="file" accept="image/*,.pdf" onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-primary file:text-white" required={type === 'sick'} />
              {documentFile && <p className="text-xs text-green-600 mt-1">{documentFile.name}</p>}
            </div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">{t('common.cancel')}</button>
            <button type="submit" disabled={submitting || !reason.trim() || (type === 'sick' && !documentFile)} className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50">{submitting ? t('trial.submitting') : t('common.submit')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'extension' | 'sickLeave';
  enrollment: EnrolledClass;
  onSubmit: (enrollmentId: string, type: 'extension' | 'sickLeave', reason: string, documentFile?: File | null) => void;
}

function ApplicationModal({ isOpen, onClose, type, enrollment, onSubmit }: ApplicationModalProps) {
  const { t, i18n } = useTranslation();
  const contentRef = useRef<HTMLDivElement>(null);
  const [reason, setReason] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const getLocale = () => ({ 'en': 'en-US', 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW' }[i18n.language] || 'en-US');
  useModalA11y(isOpen, onClose, contentRef);
  if (!isOpen) return null;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 500));
    onSubmit(enrollment.id, type, reason, type === 'sickLeave' ? documentFile : undefined);
    setReason('');
    setDocumentFile(null);
    setSubmitting(false);
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div ref={contentRef} className="bg-white rounded-xl shadow-xl max-w-md w-full" role="dialog" aria-modal="true" aria-labelledby="application-modal-title">
        <div className="flex justify-between p-6 border-b">
          <div>
            <h3 id="application-modal-title" className="text-xl font-semibold text-gray-900">{type === 'extension' ? t('schedule.applyExtension') : t('schedule.applySickLeave')}</h3>
            <p className="text-sm text-gray-500 mt-1">{type === 'extension' ? t('schedule.extensionHint') : t('schedule.sickLeaveHint')}</p>
            <p className="text-sm text-primary/90 mt-2 font-medium">{t('schedule.noMakeupRefundNote')}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600">{t('schedule.class')}: <span className="font-medium">{enrollment.class.name}</span></p>
            <p className="text-sm text-gray-600">{t('schedule.date')}: <span className="font-medium">{formatDateTime(enrollment.class.start_time, getLocale())}</span></p>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('schedule.reason')}</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary" placeholder={t('schedule.reasonPlaceholder')} required />
          </div>
          {type === 'sickLeave' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('schedule.uploadSickLeaveDoc')}</label>
              <p className="text-xs text-gray-500 mb-2">{t('schedule.uploadSickLeaveDocHint')}</p>
              <input type="file" accept="image/*,.pdf" onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-primary file:text-white" />
              {documentFile && <p className="text-xs text-green-600 mt-1">{documentFile.name}</p>}
            </div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">{t('common.cancel')}</button>
            <button type="submit" disabled={submitting || !reason.trim()} className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50">{submitting ? t('trial.submitting') : t('common.submit')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const { profile } = useAuth();
  const { t, i18n } = useTranslation();
  const { getHolidayName, holidayDatesSet } = useHolidays();
  const [enrollments, setEnrollments] = useState<EnrolledClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [applicationModal, setApplicationModal] = useState<{ isOpen: boolean; type: 'extension' | 'sickLeave' | null; enrollment: EnrolledClass | null }>({ isOpen: false, type: null, enrollment: null });
  const [lessonLeaveRequests, setLessonLeaveRequests] = useState<Record<string, Record<number, LessonLeaveRequest>>>({});
  const [leaveLessonModal, setLeaveLessonModal] = useState<{ enrollment: EnrolledClass; lessonIndex: number; lessonDate: Date } | null>(null);
  const [lessonLeaveSuccess, setLessonLeaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id) loadEnrolledClasses();
  }, [profile?.id]);

  async function loadEnrolledClasses() {
    setLoading(true);
    setError(null);
    const isDemoProfile = profile?.id && DEMO_PROFILE_IDS.includes(profile.id);
    if (isDemoProfile) {
      setEnrollments(getFallbackUpcomingClasses(profile.id, profile.full_name ?? undefined));
      setLoading(false);
      return;
    }
    try {
      const response = await api.get<EnrolledClass[]>('student/upcoming-classes?demo=1').catch(() => ({ success: true, data: FALLBACK_UPCOMING_CLASSES }));
      const data = (response as any).data ?? response;
      setEnrollments(Array.isArray(data) ? data : FALLBACK_UPCOMING_CLASSES);
    } catch (err) {
      console.error('Error loading enrolled classes:', err);
      setError(err instanceof Error ? err.message : t('schedule.loadError'));
      setEnrollments(FALLBACK_UPCOMING_CLASSES);
    } finally {
      setLoading(false);
    }
  }

  const myEnrollments = useMemo(() => {
    if (!profile?.id) return [];
    return enrollments
      .filter((e) => (e.user_id || '').trim() === (profile.id || '').trim())
      .sort((a, b) => new Date(a.class.start_time).getTime() - new Date(b.class.start_time).getTime());
  }, [enrollments, profile?.id]);

  /** All lesson dates (4/8/16 per course); skip holidays so 課堂撞 holiday 自動順延 */
  const lessonDatesByEnrollment = useMemo(() => {
    return myEnrollments.map((e) => {
      const total = e.total_lessons ?? 8;
      if (holidayDatesSet.size > 0) {
        return getLessonDatesSkipHolidays(e.class.start_time, total, holidayDatesSet);
      }
      return getLessonDates(e.class.start_time, total);
    });
  }, [myEnrollments, holidayDatesSet]);

  /** Attendance rate by local time: 已出席堂數 / 已過嘅課堂數（已舉行） */
  const attendanceRate = useMemo(() => {
    const now = Date.now();
    let attended = 0;
    let lessonsHeldSoFar = 0;
    lessonDatesByEnrollment.forEach((dates, idx) => {
      const e = myEnrollments[idx];
      if (!e) return;
      const held = dates.filter((d) => d.getTime() < now).length;
      lessonsHeldSoFar += held;
      if (e.attended_lessons != null) attended += e.attended_lessons;
    });
    if (lessonsHeldSoFar <= 0) return null;
    return Math.round((attended / lessonsHeldSoFar) * 100);
  }, [myEnrollments, lessonDatesByEnrollment]);

  /** 下一堂：最早嘅未來課堂（用於提醒卡） */
  const nextLesson = useMemo(() => {
    const now = Date.now();
    let earliest: { date: Date; enrollment: EnrolledClass; lessonIndex: number } | null = null;
    lessonDatesByEnrollment.forEach((dates, idx) => {
      const e = myEnrollments[idx];
      if (!e) return;
      dates.forEach((d, i) => {
        if (d.getTime() > now) {
          if (!earliest || d.getTime() < earliest.date.getTime()) {
            earliest = { date: d, enrollment: e, lessonIndex: i };
          }
        }
      });
    });
    return earliest;
  }, [myEnrollments, lessonDatesByEnrollment]);

  const getLocale = (): string => ({ 'en': 'en-US', 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW' }[i18n.language] || 'en-US');

  const handleApplicationSubmit = (enrollmentId: string, type: 'extension' | 'sickLeave', _reason: string) => {
    setEnrollments((prev) =>
      prev.map((e) =>
        e.id === enrollmentId
          ? {
              ...e,
              [type === 'sickLeave' ? 'sick_leave_application' : 'extension_application']: { status: 'pending' },
            }
          : e
      )
    );
    setApplicationModal({ isOpen: false, type: null, enrollment: null });
  };

  const handleLessonLeaveSubmit = (enrollmentId: string, lessonIndex: number, type: 'personal' | 'sick', _reason: string, documentFile?: File | null) => {
    setLessonLeaveRequests((prev) => ({
      ...prev,
      [enrollmentId]: {
        ...(prev[enrollmentId] ?? {}),
        [lessonIndex]: { type, status: 'pending', documentName: documentFile?.name },
      },
    }));
    setLeaveLessonModal(null);
    setLessonLeaveSuccess(t('schedule.leaveSubmittedWaitAdmin'));
    setTimeout(() => setLessonLeaveSuccess(null), 4000);
  };

  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();

  const getDaysInMonth = (date: Date): Date[] => {
    const y = date.getFullYear();
    const m = date.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const days: Date[] = [];
    const startDay = first.getDay();
    for (let i = 0; i < startDay; i++) {
      days.push(new Date(y, m, 1 - startDay + i));
    }
    for (let i = 1; i <= last.getDate(); i++) {
      days.push(new Date(y, m, i));
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(last);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const calendarDays = getDaysInMonth(calendarMonth);
  const weekDayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, 7 + i);
    return d.toLocaleDateString(getLocale(), { weekday: 'short' });
  });

  const getLessonsForDate = (day: Date): { name: string; time: string; color: string }[] => {
    const y = day.getFullYear();
    const m = day.getMonth();
    const d = day.getDate();
    const result: { name: string; time: string; color: string }[] = [];
    lessonDatesByEnrollment.forEach((dates, idx) => {
      const enrollment = myEnrollments[idx];
      if (!enrollment) return;
      const color = LESSON_COLORS[idx % LESSON_COLORS.length];
      dates.forEach((lessonDate) => {
        if (lessonDate.getFullYear() === y && lessonDate.getMonth() === m && lessonDate.getDate() === d) {
          result.push({
            name: enrollment.class.name,
            time: lessonDate.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit', hour12: false }),
            color,
          });
        }
      });
    });
    return result;
  };

  if (loading) {
    return (
      <Layout>
        <PageLoading message={t('schedule.loading', '載入課程表中…')} />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('schedule.title')}</h1>
              {profile?.full_name && <p className="text-sm text-gray-600 mt-0.5">{t('schedule.childMainPage')} · {profile.full_name}</p>}
            </div>
          </div>
          <Link to="/profile" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-lighter text-primary font-medium hover:bg-primary/20">
            <User className="h-5 w-5" />
            {t('schedule.personalProfile')}
          </Link>
        </div>

        {error && (
          <LoadErrorBanner
            message={error}
            onRetry={() => {
              setError(null);
              if (profile?.id) loadEnrolledClasses();
            }}
          />
        )}
        {lessonLeaveSuccess && <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md">{lessonLeaveSuccess}</div>}

        {/* 下一堂：課堂提醒 */}
        {nextLesson && (
          <div className={`rounded-lg border-2 p-4 md:p-5 ${nextLesson.date.getTime() - Date.now() <= 24 * 60 * 60 * 1000 ? 'border-amber-400 bg-amber-50' : 'border-primary/30 bg-primary-lighter/30'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">{nextLesson.date.getTime() - Date.now() <= 24 * 60 * 60 * 1000 ? t('schedule.comingWithin24h', '即將上課（24 小時內）') : t('schedule.nextLesson', '下一堂')}</p>
                <p className="text-lg font-bold text-gray-900">
                  {nextLesson.date.toLocaleDateString(getLocale(), { weekday: 'short', month: 'short', day: 'numeric' })} {nextLesson.date.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit', hour12: false })} · {nextLesson.enrollment.class.name}
                </p>
                {(() => {
                  const locInfo = getLocationInfo(nextLesson.enrollment.class.location);
                  if (!locInfo) return null;
                  return (
                    <div className="mt-2 text-sm text-gray-600">
                      <p className="font-medium text-gray-700">{locInfo.name}</p>
                      <p className="text-gray-600">{locInfo.address}</p>
                      <a href={locInfo.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 text-primary font-medium hover:underline">
                        <MapPin className="h-4 w-4" />
                        {t('schedule.openMap', '打開地圖')}
                      </a>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Calendar - same format as admin ClassesPage month view */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden p-4 md:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            {t('schedule.calendarTitle')}
          </h2>
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={() => setCalendarMonth(new Date(year, month - 1))} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="font-semibold text-gray-900">
              {calendarMonth.toLocaleDateString(getLocale(), { month: 'long', year: 'numeric' })}
            </span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setCalendarMonth(new Date())} className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary-lighter rounded-md">
                {t('admin.classes.today')}
              </button>
              <button type="button" onClick={() => setCalendarMonth(new Date(year, month + 1))} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 border-b mb-2">
            {weekDayLabels.map((label, idx) => (
              <div key={idx} className="p-2 text-center bg-gray-50 font-medium text-gray-700 border-r last:border-r-0">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const isToday = day.toDateString() === new Date().toDateString();
              const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
              const holidayName = getHolidayName(day);
              const lessons = getLessonsForDate(day);
              return (
                <div
                  key={idx}
                  className={`min-h-[80px] border-r border-b last:border-r-0 p-2 transition-colors ${
                    isToday ? 'bg-primary-lighter' : ''
                  } ${!isCurrentMonth ? 'bg-gray-50' : ''} hover:bg-gray-50/80`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isToday ? 'text-primary font-bold' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {day.getDate()}
                  </div>
                  {holidayName && (
                    <div className="text-xs text-gray-400 mb-1 italic truncate" title={holidayName}>
                      {holidayName}
                    </div>
                  )}
                  <div className="space-y-1">
                    {lessons.slice(0, 2).map((item, i) => (
                      <div
                        key={i}
                        className="text-xs p-1 rounded truncate text-white"
                        style={{ backgroundColor: item.color }}
                        title={`${item.time} ${item.name}`}
                      >
                        {item.time} {item.name}
                      </div>
                    ))}
                    {lessons.length > 2 && (
                      <div className="text-xs text-gray-600 font-medium truncate">+{lessons.length - 2}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-2">{t('schedule.calendarHint')}</p>
          <p className="text-xs text-gray-600 mt-1">{t('schedule.calendarLegend')}</p>
          {myEnrollments.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-2 text-xs">
              {myEnrollments.map((e, idx) => (
                <span key={e.id} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: LESSON_COLORS[idx % LESSON_COLORS.length] }} />
                  {e.class.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 課程時間表：第1堂～最後一堂 (4/8/16)，僅顯示此小朋友已報讀，撞假期已順延 */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('schedule.lessonSchedule')}</h2>
          <p className="text-sm text-gray-600 mb-4">{t('schedule.lessonScheduleHint')}</p>
          <div className="space-y-6">
            {myEnrollments.map((e, idx) => {
              const dates = lessonDatesByEnrollment[idx] ?? [];
              const total = e.total_lessons ?? 8;
              return (
                <div key={e.id} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{e.class.name}{e.class.program_code ? ` (${e.class.program_code})` : ''}</h3>
                  <p className="text-sm text-gray-600 mb-3">{e.class.instructor} · {t('schedule.totalLessons', { count: total })}</p>
                  {(() => {
                    const locInfo = getLocationInfo(e.class.location);
                    if (!locInfo) return null;
                    return (
                      <div className="mb-3 text-sm text-gray-600">
                        <p className="font-medium text-gray-700">{locInfo.name}</p>
                        <p className="text-gray-600">{locInfo.address}</p>
                        <a href={locInfo.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-0.5 text-primary font-medium hover:underline">
                          <MapPin className="h-4 w-4" />
                          {t('schedule.openMap', '打開地圖')}
                        </a>
                      </div>
                    );
                  })()}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                    {dates.map((d, i) => {
                      const leaveReq = lessonLeaveRequests[e.id]?.[i];
                      const canRequestLeave = !leaveReq || leaveReq.status === 'rejected';
                      return (
                        <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium text-primary">{t('schedule.lessonN', { n: i + 1 })}</span>
                            {leaveReq && (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded ${leaveReq.status === 'approved' ? 'bg-green-100 text-green-800' : leaveReq.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                                {leaveReq.type === 'sick' ? t('schedule.applySickLeave') : t('schedule.personalLeave')}: {t(`schedule.status.${leaveReq.status}`)}
                              </span>
                            )}
                          </div>
                          <span className="text-gray-700 block mt-0.5">{d.toLocaleDateString(getLocale(), { month: 'short', day: 'numeric', weekday: 'short' })} {d.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' })}</span>
                          {canRequestLeave && (
                            <button
                              type="button"
                              onClick={() => setLeaveLessonModal({ enrollment: e, lessonIndex: i, lessonDate: d })}
                              className="mt-2 text-xs font-medium text-primary hover:underline"
                            >
                              {t('schedule.requestLeave')}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {myEnrollments.length === 0 && <p className="text-gray-500 text-sm">{t('schedule.noUpcomingClasses')}</p>}
        </div>

        {/* Attendance rate */}
        {attendanceRate != null && (
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">{t('schedule.attendanceRate')}</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary">{attendanceRate}%</span>
              <span className="text-gray-600">{t('schedule.thisMonthAttendance')}</span>
            </div>
          </div>
        )}

        {/* 補堂／調堂記錄：demo 資料，之後可接 API */}
        {myEnrollments.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {t('schedule.makeupRecord', '已補堂記錄')}
            </h2>
            <p className="text-sm text-gray-600 mb-3">{t('schedule.makeupRemainingCount', { count: 2 }, '剩餘 2 次補堂')}</p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>兒童芭蕾 A {t('schedule.lessonN', { n: 3 })}（2月20日 請假）→ 已安排補堂 2月25日</li>
            </ul>
          </div>
        )}

        {/* All upcoming courses */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('schedule.allUpcomingCourses')}</h2>
          {myEnrollments.length === 0 && !error ? (
            <EmptyState
              message={t('schedule.noUpcomingClasses')}
              icon={<CalendarIcon className="h-16 w-16 text-gray-400" />}
            />
          ) : (
            <div className="space-y-4">
              {myEnrollments.map((e) => {
                const isDropdownOpen = openDropdown === e.id;
                const showActions = e.status === 'enrolled' && (!e.extension_application || !e.sick_leave_application);
                return (
                  <div key={e.id} className="border border-gray-100 rounded-lg p-4 md:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{e.class.name}</h3>
                        {e.class.program_code && <span className="inline-block text-xs font-medium text-primary bg-primary-lighter px-2 py-0.5 rounded mb-2">{e.class.program_code}</span>}
                        <p className="text-gray-600 mb-1">{e.class.instructor}</p>
                        <p className="text-sm text-gray-500">{formatDateTime(e.class.start_time, getLocale())} – {formatDateTime(e.class.end_time, getLocale())}</p>
                        {(() => {
                          const locInfo = getLocationInfo(e.class.location);
                          if (locInfo) {
                            return (
                              <p className="text-sm text-gray-600 mt-1">
                                {locInfo.name} · <a href={locInfo.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5"><MapPin className="h-3.5 w-3.5" />{t('schedule.openMap', '打開地圖')}</a>
                              </p>
                            );
                          }
                          return null;
                        })()}
                        {e.attended_lessons != null && e.total_lessons != null && (
                          <p className="text-sm text-primary font-medium mt-2">{t('schedule.learningProgress', { current: e.attended_lessons, total: e.total_lessons })}</p>
                        )}
                        {e.extension_application && (
                          <span className={`inline-block mt-2 text-xs font-medium px-2 py-1 rounded ${e.extension_application.status === 'approved' ? 'bg-green-100 text-green-800' : e.extension_application.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                            {t('schedule.applyExtension')}: {e.extension_application.status === 'approved' ? t('schedule.status.approved') : e.extension_application.status === 'rejected' ? t('schedule.status.rejected') : t('schedule.status.pending')}
                          </span>
                        )}
                        {e.sick_leave_application && (
                          <span className={`inline-block mt-2 ml-2 text-xs font-medium px-2 py-1 rounded ${e.sick_leave_application.status === 'approved' ? 'bg-green-100 text-green-800' : e.sick_leave_application.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                            {t('schedule.applySickLeave')}: {e.sick_leave_application.status === 'approved' ? t('schedule.status.approved') : e.sick_leave_application.status === 'rejected' ? t('schedule.status.rejected') : t('schedule.status.pending')}
                          </span>
                        )}
                      </div>
                      {showActions && (
                        <div className="relative">
                          <button type="button" onClick={() => setOpenDropdown(isDropdownOpen ? null : e.id)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                            <MoreVertical className="h-5 w-5" />
                          </button>
                          {isDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg py-1 z-20 border">
                                {!e.extension_application && (
                                  <button type="button" onClick={() => { setApplicationModal({ isOpen: true, type: 'extension', enrollment: e }); setOpenDropdown(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                                  <Clock className="h-4 w-4" />{t('schedule.applyExtension')}
                                </button>
                                )}
                                {!e.sick_leave_application && (
                                  <button type="button" onClick={() => { setApplicationModal({ isOpen: true, type: 'sickLeave', enrollment: e }); setOpenDropdown(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                                  <FileText className="h-4 w-4" />{t('schedule.applySickLeave')}
                                </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      {!showActions && <Clock className="h-5 w-5 text-gray-400 flex-shrink-0" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {applicationModal.isOpen && applicationModal.enrollment && applicationModal.type && (
        <ApplicationModal
          isOpen
          onClose={() => setApplicationModal({ isOpen: false, type: null, enrollment: null })}
          type={applicationModal.type}
          enrollment={applicationModal.enrollment}
          onSubmit={handleApplicationSubmit}
        />
      )}

      {leaveLessonModal && (
        <LessonLeaveModal
          isOpen
          onClose={() => setLeaveLessonModal(null)}
          enrollment={leaveLessonModal.enrollment}
          lessonIndex={leaveLessonModal.lessonIndex}
          lessonDate={leaveLessonModal.lessonDate}
          onSubmit={handleLessonLeaveSubmit}
        />
      )}
    </Layout>
  );
}
