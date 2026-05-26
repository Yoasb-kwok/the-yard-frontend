import { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import PageLoading from '../../components/PageLoading';
import LoadErrorBanner from '../../components/LoadErrorBanner';
import EmptyState from '../../components/EmptyState';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../../lib/utils';
import { useHolidays } from '../../lib/useHolidays';
import { api, ApiError } from '../../lib/api';
import {
  getFallbackUpcomingClasses,
  getLessonDatesForEnrollment,
  shouldUseDemoUpcomingClasses,
  type EnrolledClass,
} from '../../lib/studentEnrollments';
import { Calendar as CalendarIcon, Clock, User, ChevronLeft, ChevronRight, MoreVertical, FileText, X, MapPin } from 'lucide-react';
import { getLocationInfo } from '../../lib/locationInfo';
import { useModalA11y } from '../../lib/useModalA11y';
import StudentTokenBalanceSection from '../../components/student/StudentTokenBalanceSection';
import StudentTrialApplicationsSection from '../../components/student/StudentTrialApplicationsSection';

const MAX_DOCUMENT_BASE64_LENGTH = 80000; // ~60KB base64，盡量避開 413（伺服器 body 上限可能好細）
const MAX_IMAGE_DIMENSION = 600;
const JPEG_QUALITY = 0.4;
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/** Compress image to JPEG data URL to avoid 413. 只接受 5MB 以內嘅檔案，會自動壓細再上傳。 */
async function compressImageToDataUrl(file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('File over 5MB. Please use an image under 5MB.');
  }
  const isImage = file.type.startsWith('image/');
  if (!isImage) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
    if (dataUrl.length > MAX_DOCUMENT_BASE64_LENGTH) {
      throw new Error('File too large. Please upload an image under 5MB.');
    }
    return dataUrl;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      let width = w;
      let height = h;
      if (w > MAX_IMAGE_DIMENSION || h > MAX_IMAGE_DIMENSION) {
        if (w >= h) {
          width = MAX_IMAGE_DIMENSION;
          height = Math.round((h * MAX_IMAGE_DIMENSION) / w);
        } else {
          height = MAX_IMAGE_DIMENSION;
          width = Math.round((w * MAX_IMAGE_DIMENSION) / h);
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      let quality = JPEG_QUALITY;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      while (dataUrl.length > MAX_DOCUMENT_BASE64_LENGTH && quality > 0.15) {
        quality -= 0.08;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      if (dataUrl.length > MAX_DOCUMENT_BASE64_LENGTH) {
        reject(new Error('Image too large after compression. Please use a smaller image or take a new photo.'));
        return;
      }
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

type ViewType = 'month' | 'week' | 'day';

/** Time grid for week/day: 8:00–22:00, 30-min slots */
const TIME_GRID_START_HOUR = 8;
const TIME_GRID_END_HOUR = 22;
const TIME_GRID_ROW_HEIGHT_PX = 48;

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
            <p className="text-sm text-gray-600 mt-0.5">{lessonDate.toLocaleDateString(locale, { weekday: 'long', month: 'short', day: 'numeric' })} {lessonDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
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

/** One day's lessons for the popout: full data for course info, leave, map */
type DayLessonItem = { enrollment: EnrolledClass; lessonIndex: number; lessonDate: Date; color: string };

interface DayDetailModalProps {
  isOpen: boolean;
  day: Date | null;
  items: DayLessonItem[];
  getLocale: () => string;
  onClose: () => void;
  onRequestLeave: (enrollment: EnrolledClass, lessonIndex: number, lessonDate: Date) => void;
}

function DayDetailModal({ isOpen, day, items, getLocale, onClose, onRequestLeave }: DayDetailModalProps) {
  const { t } = useTranslation();
  const contentRef = useRef<HTMLDivElement>(null);
  useModalA11y(isOpen, onClose, contentRef);
  if (!isOpen || !day) return null;
  const locale = getLocale();
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div ref={contentRef} className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col" role="dialog" aria-modal="true" aria-labelledby="day-detail-title">
        <div className="flex justify-between items-center p-4 md:p-5 border-b border-gray-200">
          <h3 id="day-detail-title" className="text-lg font-semibold text-gray-900">
            {day.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </h3>
          <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100" aria-label={t('common.close')}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 md:p-5 space-y-4">
          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-6">{t('schedule.noUpcomingClasses')}</p>
          ) : (
            items.map(({ enrollment, lessonIndex, lessonDate, color }) => {
              const classStart = new Date(enrollment.class.start_time);
              const classEnd = new Date(enrollment.class.end_time);
              const durationMs = classEnd.getTime() - classStart.getTime();
              const endDate = new Date(lessonDate.getTime() + durationMs);
              const locInfo = getLocationInfo(enrollment.class.location);
              const fromApi = enrollment.leave_requests?.find((r) => r.lesson_index === lessonIndex);
              const leaveReq = fromApi
                ? { type: fromApi.leave_type as 'personal' | 'sick', status: fromApi.status as 'pending' | 'approved' | 'rejected' }
                : null;
              const canRequestLeave = !leaveReq || leaveReq.status === 'rejected';
              return (
                <div key={`${enrollment.id}-${lessonIndex}`} className="border border-gray-200 rounded-lg p-4" style={{ borderLeftWidth: 4, borderLeftColor: color }}>
                  <h4 className="font-semibold text-gray-900">{enrollment.class.name}</h4>
                  {enrollment.class.program_code && (
                    <span className="inline-block text-xs font-medium text-primary bg-primary-lighter px-2 py-0.5 rounded mt-1">{enrollment.class.program_code}</span>
                  )}
                  <p className="text-sm text-gray-600 mt-1">{enrollment.class.instructor}</p>
                  <p className="text-sm text-gray-700 mt-0.5">
                    {lessonDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })} – {endDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </p>
                  {locInfo && (
                    <div className="mt-2 text-sm text-gray-600">
                      <p className="font-medium text-gray-700">{locInfo.name}</p>
                      <p className="text-gray-600">{locInfo.address}</p>
                      <a href={locInfo.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 text-primary font-medium hover:underline">
                        <MapPin className="h-4 w-4" />
                        {t('schedule.openMap', '打開地圖')}
                      </a>
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {leaveReq ? (
                      <span className={`text-xs font-medium px-2 py-1 rounded ${leaveReq.status === 'approved' ? 'bg-green-100 text-green-800' : leaveReq.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                        {leaveReq.type === 'sick' ? t('schedule.applySickLeave') : t('schedule.personalLeave')}: {t(`schedule.status.${leaveReq.status}`)}
                      </span>
                    ) : null}
                    {canRequestLeave && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onRequestLeave(enrollment, lessonIndex, lessonDate);
                        }}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {t('schedule.requestLeave')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
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
  const [view, setView] = useState<ViewType>('month');
  const [currentCalendarDate, setCurrentCalendarDate] = useState(() => new Date());
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [applicationModal, setApplicationModal] = useState<{ isOpen: boolean; type: 'extension' | 'sickLeave' | null; enrollment: EnrolledClass | null }>({ isOpen: false, type: null, enrollment: null });
  const [lessonLeaveRequests, setLessonLeaveRequests] = useState<Record<string, Record<number, LessonLeaveRequest>>>({});
  const [leaveLessonModal, setLeaveLessonModal] = useState<{ enrollment: EnrolledClass; lessonIndex: number; lessonDate: Date } | null>(null);
  const [dayDetailModalDate, setDayDetailModalDate] = useState<Date | null>(null);
  const [lessonLeaveSuccess, setLessonLeaveSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id) loadEnrolledClasses();
  }, [profile?.id]);

  async function loadEnrolledClasses() {
    setLoading(true);
    setError(null);
    const fallbackUpcomingClasses =
      shouldUseDemoUpcomingClasses(profile?.id)
        ? getFallbackUpcomingClasses(profile?.id, profile?.full_name)
        : [];
    const token = localStorage.getItem('token');
    if (!token) {
      setEnrollments(fallbackUpcomingClasses);
      setLessonLeaveRequests({});
      setLoading(false);
      return;
    }
    try {
      const response = await api.get<{ data?: EnrolledClass[] }>('/student/upcoming-classes');
      const data = (response as any).data;
      let list: EnrolledClass[] = Array.isArray(data) ? data : fallbackUpcomingClasses;
      if (profile?.id && Array.isArray(data)) {
        const filtered = data.filter((e: EnrolledClass) => (e.profile_id || e.user_id || '') === profile.id);
        if (filtered.length > 0) list = filtered;
        else list = fallbackUpcomingClasses;
      } else if (!Array.isArray(data) || data.length === 0) {
        list = fallbackUpcomingClasses;
      }
      setEnrollments(list);
      setLessonLeaveRequests((prev) => {
        const next = { ...prev };
        list.forEach((enrollment: EnrolledClass) => {
          (enrollment.leave_requests || []).forEach((r) => {
            if (r.lesson_index == null) return;
            if (!next[enrollment.id]) next[enrollment.id] = {};
            next[enrollment.id][r.lesson_index] = {
              type: r.leave_type,
              status: r.status as 'pending' | 'approved' | 'rejected',
            };
          });
        });
        return next;
      });
    } catch (err) {
      const isTokenOrAuthError =
        (err instanceof ApiError && [401, 403, 422].includes(err.status)) ||
        (err instanceof Error && /please provide token|token/i.test(err.message));
      if (!isTokenOrAuthError) {
        setError(err instanceof Error ? err.message : t('schedule.loadError'));
      }
      setEnrollments(fallbackUpcomingClasses);
    } finally {
      setLoading(false);
    }
  }

  const myEnrollments = useMemo(() => {
    return [...enrollments].sort(
      (a, b) => new Date(a.class.start_time).getTime() - new Date(b.class.start_time).getTime()
    );
  }, [enrollments]);

  /** Lesson dates per enrollment = paid/booked slots only (not full course 16). */
  const lessonDatesByEnrollment = useMemo(() => {
    return myEnrollments.map((e) => getLessonDatesForEnrollment(e, holidayDatesSet));
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

  const getLocale = (): string => ({ 'en': 'en-US', 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW' }[i18n.language] || 'en-US');

  const formatTime = (date: Date): string =>
    date.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit', hour12: false });

  const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d;
  };
  const getEndOfWeek = (date: Date): Date => {
    const start = getStartOfWeek(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end;
  };

  /** Flatten all lesson occurrences for week/day time grid: start, end, enrollment, lessonIndex, color */
  const scheduleEvents = useMemo(() => {
    const out: Array<{ start: Date; end: Date; enrollment: EnrolledClass; lessonIndex: number; color: string }> = [];
    myEnrollments.forEach((e, idx) => {
      const dates = lessonDatesByEnrollment[idx] ?? [];
      const classStart = new Date(e.class.start_time);
      const classEnd = new Date(e.class.end_time);
      const durationMs = classEnd.getTime() - classStart.getTime();
      const color = LESSON_COLORS[idx % LESSON_COLORS.length];
      dates.forEach((lessonDate, lessonIndex) => {
        const start = new Date(lessonDate);
        const end = new Date(lessonDate.getTime() + durationMs);
        out.push({ start, end, enrollment: e, lessonIndex, color });
      });
    });
    return out.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [myEnrollments, lessonDatesByEnrollment]);

  /** Events for a single day (for day view) */
  const eventsForDay = (day: Date) => {
    const y = day.getFullYear(), m = day.getMonth(), d = day.getDate();
    return scheduleEvents.filter(
      (ev) => ev.start.getFullYear() === y && ev.start.getMonth() === m && ev.start.getDate() === d
    );
  };

  const handleApplicationSubmit = async (enrollmentId: string, type: 'extension' | 'sickLeave', reason: string, _documentFile?: File | null) => {
    setSubmitError(null);
    try {
      if (type === 'sickLeave') {
        await api.post('/student/sick-leave-request', { enrollmentId, reason });
      } else {
        await api.post('/student/extension-request', { enrollmentId, reason });
      }
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
      setLessonLeaveSuccess(t('schedule.leaveSubmittedWaitAdmin'));
      setTimeout(() => setLessonLeaveSuccess(null), 4000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('schedule.loadError'));
    }
  };

  const handleLessonLeaveSubmit = async (enrollmentId: string, lessonIndex: number, type: 'personal' | 'sick', reason: string, documentFile?: File | null) => {
    setSubmitError(null);
    try {
      let document_url: string | undefined;
      if (type === 'sick' && documentFile) {
        document_url = await compressImageToDataUrl(documentFile);
      }
      await api.post('/student/sick-leave-request', {
        enrollmentId,
        reason,
        lessonIndex,
        leaveType: type,
        ...(document_url
          ? { document_url, documentUrl: document_url }
          : {}),
      });
      await loadEnrolledClasses();
      setLessonLeaveRequests((prev) => ({
        ...prev,
        [enrollmentId]: {
          ...(prev[enrollmentId] ?? {}),
          [lessonIndex]: { type, status: 'pending' },
        },
      }));
      setLeaveLessonModal(null);
      setLessonLeaveSuccess(t('schedule.leaveSubmittedWaitAdmin'));
      setTimeout(() => setLessonLeaveSuccess(null), 4000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('schedule.loadError');
      setSubmitError(msg.includes('too large') || msg.includes('Too large') ? t('schedule.documentTooLarge', '檔案過大，請上傳 5MB 以內的圖片或拍攝病假紙相片。') : msg);
    }
  };

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

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

  const calendarDays = getDaysInMonth(currentCalendarDate);
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
      dates.forEach((lessonDate, lessonIndex) => {
        if (lessonDate.getFullYear() === y && lessonDate.getMonth() === m && lessonDate.getDate() === d) {
          const approvedLeave = enrollment.leave_requests?.find(
            (r) => r.lesson_index === lessonIndex && r.status === 'approved'
          );
          const leaveLabel = approvedLeave
            ? (approvedLeave.leave_type === 'sick' ? t('notifications.leaveTypeSick') : t('notifications.leaveTypePersonal'))
            : '';
          const name = leaveLabel ? `${enrollment.class.name} ${leaveLabel}` : enrollment.class.name;
          result.push({
            name,
            time: lessonDate.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit', hour12: false }),
            color,
          });
        }
      });
    });
    return result;
  };

  /** Full lesson items for a date (for day-detail popout). */
  const getLessonItemsForDate = (day: Date): DayLessonItem[] => {
    const y = day.getFullYear();
    const m = day.getMonth();
    const d = day.getDate();
    const out: DayLessonItem[] = [];
    lessonDatesByEnrollment.forEach((dates, idx) => {
      const enrollment = myEnrollments[idx];
      if (!enrollment) return;
      const color = LESSON_COLORS[idx % LESSON_COLORS.length];
      dates.forEach((lessonDate, lessonIndex) => {
        if (lessonDate.getFullYear() === y && lessonDate.getMonth() === m && lessonDate.getDate() === d) {
          out.push({ enrollment, lessonIndex, lessonDate, color });
        }
      });
    });
    return out.sort((a, b) => a.lessonDate.getTime() - b.lessonDate.getTime());
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
      <div className="space-y-10">
        {/* Page header */}
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

        {/* Global messages */}
        {error && (
          <LoadErrorBanner
            message={error}
            onRetry={() => {
              setError(null);
              if (profile?.id) loadEnrolledClasses();
            }}
          />
        )}
        {lessonLeaveSuccess && <div className="rounded-xl border border-green-200 bg-green-50 text-green-800 px-4 py-3">{lessonLeaveSuccess}</div>}
        {submitError && <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 px-4 py-3">{submitError}</div>}

        <StudentTokenBalanceSection
          profileId={profile?.id}
          profileName={profile?.full_name ?? undefined}
          upcomingClasses={myEnrollments}
        />
        <StudentTrialApplicationsSection profileId={profile?.id} />

        {/* Calendar (month / week / day) — 下一堂、接下來所有課程 已改在左側欄顯示 */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" aria-labelledby="schedule-calendar-heading">
          <div id="schedule-calendar-heading" className="px-4 md:px-6 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              {t('schedule.calendarTitle')}
            </h2>
          </div>
          <div className="p-4 md:p-6">
          {/* View switcher: Month | Week — visible on phone and desktop */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
              <button type="button" onClick={() => setView('month')} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${view === 'month' ? 'bg-primary text-white shadow' : 'text-gray-700 hover:bg-gray-100'}`}>{t('calendar.month')}</button>
              <button type="button" onClick={() => setView('week')} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${view === 'week' ? 'bg-primary text-white shadow' : 'text-gray-700 hover:bg-gray-100'}`}>{t('calendar.week')}</button>
            </div>
          </div>
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={() => { const d = new Date(currentCalendarDate); if (view === 'month') d.setMonth(d.getMonth() - 1); else if (view === 'week') d.setDate(d.getDate() - 7); else d.setDate(d.getDate() - 1); setCurrentCalendarDate(d); }} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors" aria-label={t('common.previous')}>
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="font-semibold text-gray-900 text-center min-w-[160px]">
              {view === 'month' ? currentCalendarDate.toLocaleDateString(getLocale(), { month: 'long', year: 'numeric' }) : view === 'week' ? `${getStartOfWeek(currentCalendarDate).toLocaleDateString(getLocale(), { month: 'short', day: 'numeric' })} – ${getEndOfWeek(currentCalendarDate).toLocaleDateString(getLocale(), { month: 'short', day: 'numeric' })}` : currentCalendarDate.toLocaleDateString(getLocale(), { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <button type="button" onClick={() => { const d = new Date(currentCalendarDate); if (view === 'month') d.setMonth(d.getMonth() + 1); else if (view === 'week') d.setDate(d.getDate() + 7); else d.setDate(d.getDate() + 1); setCurrentCalendarDate(d); }} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors" aria-label={t('common.next')}>
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="flex justify-center mb-2">
            <button type="button" onClick={() => setCurrentCalendarDate(new Date())} className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary-lighter rounded-md">{t('admin.classes.today')}</button>
          </div>

          {view === 'month' && (
          <>
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
              const isCurrentMonth = day.getMonth() === currentCalendarDate.getMonth();
              const holidayName = getHolidayName(day);
              const lessons = getLessonsForDate(day);
              return (
                <div
                  key={idx}
                  role={lessons.length > 0 ? 'button' : undefined}
                  tabIndex={lessons.length > 0 ? 0 : undefined}
                  onClick={lessons.length > 0 ? () => setDayDetailModalDate(day) : undefined}
                  onKeyDown={lessons.length > 0 ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDayDetailModalDate(day); } } : undefined}
                  className={`min-h-[80px] border-r border-b last:border-r-0 p-2 transition-colors ${
                    isToday ? 'bg-primary-lighter' : ''
                  } ${!isCurrentMonth ? 'bg-gray-50' : ''} ${lessons.length > 0 ? 'cursor-pointer hover:bg-gray-100' : 'hover:bg-gray-50/80'}`}
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
                        className="text-[10px] leading-tight py-0.5 px-1 rounded text-white min-w-0 break-words line-clamp-4"
                        style={{ backgroundColor: item.color }}
                        title={`${item.time} ${item.name}`}
                      >
                        {item.name}
                      </div>
                    ))}
                    {lessons.length > 2 && (
                      <div className="text-[10px] text-gray-600 font-medium">+{lessons.length - 2}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-2">{t('schedule.calendarHint')}</p>
          <p className="text-xs text-gray-600 mt-1">{t('schedule.calendarLegend')}</p>
          <p className="text-xs text-primary/80 mt-1">{t('schedule.calendarClickHint')}</p>
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
          </>
          )}

          {view === 'week' && (() => {
            const startOfWeek = getStartOfWeek(currentCalendarDate);
            const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + i); return d; });
            const gridHeightPx = (TIME_GRID_END_HOUR - TIME_GRID_START_HOUR) * TIME_GRID_ROW_HEIGHT_PX;
            const startMin = TIME_GRID_START_HOUR * 60;
            const hourLabels = Array.from({ length: TIME_GRID_END_HOUR - TIME_GRID_START_HOUR }, (_, i) => `${String(TIME_GRID_START_HOUR + i).padStart(2, '0')}:00`);
            return (
              <>
              {/* Phone: vertical list of days — no horizontal scroll */}
              <div className="md:hidden space-y-3">
                {weekDays.map((day) => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  const evs = eventsForDay(day);
                  const holidayName = getHolidayName(day);
                  return (
                    <div key={day.toISOString()} className={`rounded-lg border overflow-hidden ${isToday ? 'border-primary bg-primary-lighter/20' : 'border-gray-200 bg-white'}`}>
                      <div className={`px-3 py-2 text-sm font-semibold ${isToday ? 'text-primary bg-primary-lighter/40' : 'bg-gray-50 text-gray-900'}`}>
                        {day.toLocaleDateString(getLocale(), { weekday: 'long' })}
                        {holidayName && <span className="ml-2 text-xs font-normal text-gray-500 italic">{holidayName}</span>}
                      </div>
                      <div className="p-2 space-y-1.5 min-h-[48px]">
                        {evs.length === 0 ? (
                          <p className="text-xs text-gray-400 py-2 text-center">{t('schedule.noClassesToday')}</p>
                        ) : (
                          evs.map((ev) => {
                            const approvedLeave = ev.enrollment.leave_requests?.find((r) => r.lesson_index === ev.lessonIndex && r.status === 'approved');
                            const name = approvedLeave ? `${ev.enrollment.class.name} ${approvedLeave.leave_type === 'sick' ? t('notifications.leaveTypeSick') : t('notifications.leaveTypePersonal')}` : ev.enrollment.class.name;
                            return (
                              <button key={`${ev.enrollment.id}-${ev.lessonIndex}`} type="button" onClick={() => setDayDetailModalDate(new Date(ev.start.getFullYear(), ev.start.getMonth(), ev.start.getDate()))} className="w-full text-left rounded-lg px-3 py-2 text-white text-sm flex items-center gap-2" style={{ backgroundColor: ev.color }} title={`${formatTime(ev.start)} – ${formatTime(ev.end)} ${name}`}>
                                <span className="font-medium shrink-0">{formatTime(ev.start)} – {formatTime(ev.end)}</span>
                                <span className="truncate font-medium">{name}</span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop: 7-column time grid */}
              <div className="hidden md:block overflow-x-auto">
                <div className="min-w-[600px]">
                  {/* Week header: day name + date */}
                  <div className="grid border-b bg-gray-50 mb-0" style={{ gridTemplateColumns: '48px repeat(7, minmax(0, 1fr))' }}>
                    <div className="border-r p-2 text-xs font-medium text-gray-500" />
                    {weekDays.map((day) => {
                      const isToday = day.toDateString() === new Date().toDateString();
                      return (
                        <div key={day.toISOString()} className={`p-2 text-center border-r last:border-r-0 ${isToday ? 'bg-primary-lighter' : ''}`}>
                          <div className="text-xs font-medium text-gray-600">{day.toLocaleDateString(getLocale(), { weekday: 'long' })}</div>
                          <div className={`text-sm font-semibold mt-0.5 ${isToday ? 'text-primary' : 'text-gray-900'}`}>{day.getDate()}</div>
                        </div>
                      );
                    })}
                  </div>
                <div className="grid border-b" style={{ gridTemplateColumns: '48px repeat(7, minmax(0, 1fr))', minHeight: gridHeightPx }}>
                  <div className="border-r bg-gray-50/80">
                    {hourLabels.map((label) => (
                      <div key={label} className="text-xs text-gray-500 pr-1 text-right border-t border-gray-100 first:border-t-0" style={{ height: TIME_GRID_ROW_HEIGHT_PX }}>{label}</div>
                    ))}
                  </div>
                  {weekDays.map((day) => {
                    const isToday = day.toDateString() === new Date().toDateString();
                    const evs = eventsForDay(day);
                    return (
                      <div key={day.toISOString()} className={`border-r last:border-r-0 relative ${isToday ? 'bg-primary-lighter/20' : ''}`} style={{ minHeight: gridHeightPx }}>
                        <div className="absolute inset-0">
                          {evs.map((ev) => {
                            const startMinEv = ev.start.getHours() * 60 + ev.start.getMinutes();
                            const endMinEv = ev.end.getHours() * 60 + ev.end.getMinutes();
                            const topPx = ((startMinEv - startMin) / 60) * TIME_GRID_ROW_HEIGHT_PX;
                            const heightPx = ((endMinEv - startMinEv) / 60) * TIME_GRID_ROW_HEIGHT_PX;
                            const approvedLeave = ev.enrollment.leave_requests?.find((r) => r.lesson_index === ev.lessonIndex && r.status === 'approved');
                            const name = approvedLeave ? `${ev.enrollment.class.name} ${approvedLeave.leave_type === 'sick' ? t('notifications.leaveTypeSick') : t('notifications.leaveTypePersonal')}` : ev.enrollment.class.name;
                            return (
                              <button key={`${ev.enrollment.id}-${ev.lessonIndex}`} type="button" onClick={() => setDayDetailModalDate(new Date(ev.start.getFullYear(), ev.start.getMonth(), ev.start.getDate()))} className="absolute left-0.5 right-0.5 text-left rounded overflow-hidden text-white text-xs p-1" style={{ top: topPx + 2, height: Math.max(heightPx - 4, 24), backgroundColor: ev.color }} title={`${formatTime(ev.start)} ${name}`}>
                                <span className="truncate block">{formatTime(ev.start)}</span>
                                <span className="truncate block font-medium">{name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                </div>
              </div>
                <p className="text-xs text-gray-500 mt-2">{t('schedule.calendarHint')}</p>
              </>
            );
          })()}

          {view === 'day' && (() => {
            const dayEvs = eventsForDay(currentCalendarDate);
            const gridHeightPx = (TIME_GRID_END_HOUR - TIME_GRID_START_HOUR) * TIME_GRID_ROW_HEIGHT_PX;
            const startMin = TIME_GRID_START_HOUR * 60;
            const hourLabels = Array.from({ length: TIME_GRID_END_HOUR - TIME_GRID_START_HOUR }, (_, i) => `${String(TIME_GRID_START_HOUR + i).padStart(2, '0')}:00`);
            const holidayName = getHolidayName(currentCalendarDate);
            return (
              <div>
                {holidayName && <p className="text-sm text-gray-500 italic mb-2">{holidayName}</p>}
                {dayEvs.length === 0 ? (
                  <p className="text-gray-500 py-8 text-center">{t('schedule.noUpcomingClasses')}</p>
                ) : (
                  <div className="flex border rounded-lg overflow-hidden">
                    <div className="w-14 flex-shrink-0 border-r bg-gray-50/80">
                      {hourLabels.map((label) => (
                        <div key={label} className="text-xs text-gray-500 pr-1 text-right border-t border-gray-100 first:border-t-0" style={{ height: TIME_GRID_ROW_HEIGHT_PX }}>{label}</div>
                      ))}
                    </div>
                    <div className="flex-1 relative min-h-[400px]" style={{ minHeight: gridHeightPx }}>
                      {dayEvs.map((ev) => {
                        const startMinEv = ev.start.getHours() * 60 + ev.start.getMinutes();
                        const endMinEv = ev.end.getHours() * 60 + ev.end.getMinutes();
                        const topPx = ((startMinEv - startMin) / 60) * TIME_GRID_ROW_HEIGHT_PX;
                        const heightPx = ((endMinEv - startMinEv) / 60) * TIME_GRID_ROW_HEIGHT_PX;
                        const approvedLeave = ev.enrollment.leave_requests?.find((r) => r.lesson_index === ev.lessonIndex && r.status === 'approved');
                        const name = approvedLeave ? `${ev.enrollment.class.name} ${approvedLeave.leave_type === 'sick' ? t('notifications.leaveTypeSick') : t('notifications.leaveTypePersonal')}` : ev.enrollment.class.name;
                        return (
                          <button key={`${ev.enrollment.id}-${ev.lessonIndex}`} type="button" onClick={() => setDayDetailModalDate(new Date(ev.start.getFullYear(), ev.start.getMonth(), ev.start.getDate()))} className="absolute left-2 right-2 text-left rounded-lg overflow-hidden shadow-sm border border-gray-200 p-2" style={{ top: topPx + 4, height: Math.max(heightPx - 8, 40), backgroundColor: ev.color, color: '#fff' }} title={`${formatTime(ev.start)} – ${formatTime(ev.end)} ${name}`}>
                            <div className="font-semibold truncate">{name}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
        </section>

        {/* Section 4: Attendance rate */}
        {attendanceRate != null && (
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" aria-labelledby="attendance-heading">
            <div id="attendance-heading" className="px-4 md:px-6 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{t('schedule.attendanceRate')}</h2>
            </div>
            <div className="p-4 md:p-6">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-primary">{attendanceRate}%</span>
                <span className="text-gray-600">{t('schedule.thisMonthAttendance')}</span>
              </div>
            </div>
          </section>
        )}

        {/* Section 5: Makeup record */}
        {myEnrollments.length > 0 && (
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" aria-labelledby="makeup-heading">
            <div id="makeup-heading" className="px-4 md:px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">{t('schedule.makeupRecord', '已補堂記錄')}</h2>
            </div>
            <div className="p-4 md:p-6">
              <p className="text-sm text-gray-600 mb-3">{t('schedule.makeupRemainingCount', { count: 2 }, '剩餘 2 次補堂')}</p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>兒童芭蕾 A {t('schedule.lessonN', { n: 3 })}（2月20日 請假）→ 已安排補堂 2月25日</li>
              </ul>
            </div>
          </section>
        )}

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

      <DayDetailModal
        isOpen={!!dayDetailModalDate}
        day={dayDetailModalDate}
        items={dayDetailModalDate ? getLessonItemsForDate(dayDetailModalDate) : []}
        getLocale={getLocale}
        onClose={() => setDayDetailModalDate(null)}
        onRequestLeave={(enrollment, lessonIndex, lessonDate) => {
          setDayDetailModalDate(null);
          setLeaveLessonModal({ enrollment, lessonIndex, lessonDate });
        }}
      />
    </Layout>
  );
}
