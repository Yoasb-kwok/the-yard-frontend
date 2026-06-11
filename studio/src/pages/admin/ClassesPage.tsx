import { useEffect, useState, useMemo, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import ClassAttendancePanel, { type ClassWithAttendance, type Enrollment } from '../../components/ClassAttendancePanel';
import { formatDateTimeRange, shouldPostponeClassWithHolidays, formatProgramCodeDisplay, parseAgeRange, ageRangeToTag } from '../../lib/utils';
import { dedupeLatestEnrollmentPerStudent } from '../../lib/adminClassEnrollments';
import { api } from '../../lib/api';
import { useHolidays } from '../../lib/useHolidays';
import { Plus, Calendar, ChevronLeft, ChevronRight, Filter, MapPin, Edit, Users, Trash2 } from 'lucide-react';
import DateSelect from '../../components/DateSelect';
import { type CourseLevel, useAuth } from '../../contexts/AuthContext';
import { useClassTags, localizeTagLabel } from '../../lib/useClassTags';

interface Class {
  id: string;
  name: string;
  name_zh_tw?: string;
  name_zh_cn?: string;
  name_en?: string;
  class_code: string;
  /** Lesson number in the course (1, 2, 3…). Displayed as L01, L02 behind program code. */
  lesson_number?: number | null;
  instructor: string;
  substitute_instructor?: string | null;
  start_time: string;
  end_time: string;
  capacity: number;
  enrolled_count: number;
  is_internal: boolean;
  is_cancelled: boolean;
  /** 可供試堂（課程介紹「可供試堂時段」只顯示 allow_trial 的班別） */
  allow_trial?: boolean;
  location?: 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui';
  level?: CourseLevel;
  age_tag?: string;
  tag_values?: Record<string, string | null | undefined>;
  /** 若因假期順延，原訂日期 (YYYY-MM-DD) */
  postponed_from?: string | null;
  /** 出席名單是否已確認 */
  attendance_confirmed?: boolean;
}

function getClassNameByLang(raw: any, lang: 'zh_tw' | 'zh_cn' | 'en'): string | undefined {
  const suffix = lang === 'zh_tw' ? 'zh_tw' : lang === 'zh_cn' ? 'zh_cn' : 'en';
  const fromName = raw?.[`name_${suffix}`];
  const fromClassName = raw?.[`class_name_${suffix}`];
  if (typeof fromName === 'string' && fromName.trim() !== '') return fromName;
  if (typeof fromClassName === 'string' && fromClassName.trim() !== '') return fromClassName;
  return undefined;
}

function buildClassNamePayload(form: {
  name_zh_tw: string;
  name_zh_cn: string;
  name_en: string;
}) {
  const zhTw = form.name_zh_tw.trim() || undefined;
  const zhCn = form.name_zh_cn.trim() || undefined;
  const en = form.name_en.trim() || undefined;
  return {
    name_zh_tw: zhTw,
    name_zh_cn: zhCn,
    name_en: en,
    class_name_zh_tw: zhTw,
    class_name_zh_cn: zhCn,
    class_name_en: en,
  };
}

function buildClassCodePayload(classCode: string) {
  const normalized = classCode.trim();
  return {
    program_code: normalized,
    class_code: normalized,
  };
}

interface Instructor {
  id: string;
  name: string;
  profile_image_url: string | null;
  created_at: string;
}

type LocationFilter = 'all' | 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui';

type ViewType = 'month' | 'week' | 'day' | 'threeDay';

function getClassDisplayName(c: Class): string {
  return (c.name_zh_tw && c.name_zh_tw.trim()) || (c.name_zh_cn && c.name_zh_cn.trim()) || (c.name_en && c.name_en.trim()) || c.name || '';
}

function getLocalDateStr(input: Date | string): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function extractClassTagValues(raw: any): Record<string, string | null> {
  const source = raw?.tag_values ?? raw?.tagValues ?? raw?.tags ?? {};
  if (!source || typeof source !== 'object') return {};
  const out: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(source as Record<string, unknown>)) {
    const key = String(k || '').trim();
    if (!key) continue;
    out[key] = v == null || v === '' ? null : String(v);
  }
  return out;
}

function buildDefaultTagValues(
  tagTypes: Array<{ code: string }>,
  prev?: Record<string, string | null | undefined>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const tt of tagTypes) {
    const v = prev?.[tt.code];
    out[tt.code] = typeof v === 'string' ? v : '';
  }
  if (!out.level) out.level = 'entry';
  if (!out.age) out.age = '5-8';
  return out;
}

function isNumericClassId(id: string | number): boolean {
  return /^[1-9][0-9]*$/.test(String(id));
}

function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function ClassesPage() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { getHolidayName, holidayDatesSet } = useHolidays();
  const { tagTypes, tagsByType: classTagsByType } = useClassTags();
  const [classes, setClasses] = useState<Class[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [editAllRepeats, setEditAllRepeats] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<ViewType>('month');
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('all');
  const [classNameFilter, setClassNameFilter] = useState<string>('');
  const [showExpiredClasses, setShowExpiredClasses] = useState(false);
  const [form, setForm] = useState({
    name: '',
    name_zh_tw: '',
    name_zh_cn: '',
    name_en: '',
    class_code: '',
    instructor: '',
    substitute_instructor: '',
    date: '', // YYYY-MM-DD, first lesson date
    start_time: '', // HH:mm
    end_time: '', // HH:mm
    capacity: 10,
    is_internal: false,
    location: 'sanpokong' as 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui',
    level: 'entry' as CourseLevel,
    lowest_age: 5,
    oldest_age: 8,
    repeat_weekly: false,
    total_lessons: 8,
    allow_trial: true,
    tag_values: {} as Record<string, string>,
  });
  const formTagTypes = useMemo(
    () => tagTypes,
    [tagTypes]
  );
  const dynamicTagTypes = useMemo(
    () => tagTypes.filter((tt) => tt.code !== 'level' && tt.code !== 'age'),
    [tagTypes]
  );
  const [expandedAttendanceClassId, setExpandedAttendanceClassId] = useState<string | null>(null);
  const [deleteTargetClass, setDeleteTargetClass] = useState<Class | null>(null);
  const [deleteMode, setDeleteMode] = useState<'single' | 'series'>('single');
  const [attendanceData, setAttendanceData] = useState<{
    class: ClassWithAttendance;
    enrollments: Enrollment[];
  } | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const backdropMouseDownRef = useRef(false);

  useEffect(() => {
    loadClasses();
    loadInstructors();
  }, []);

  useEffect(() => {
    if (tagTypes.length === 0) return;
    setForm((prev) => ({
      ...prev,
      tag_values: buildDefaultTagValues(tagTypes, prev.tag_values),
    }));
  }, [tagTypes]);

  useEffect(() => {
    if (!expandedAttendanceClassId) {
      setAttendanceData(null);
      setAttendanceLoading(false);
      return;
    }
    let cancelled = false;
    setAttendanceData(null);
    setAttendanceLoading(true);
    loadAttendanceData(expandedAttendanceClassId).then((data) => {
      if (cancelled) return;
      if (data) setAttendanceData(data);
      setAttendanceLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [expandedAttendanceClassId]);

  // Handle mobile view restrictions
  useEffect(() => {
    const isMobile = window.innerWidth < 768; // md breakpoint
    // On mobile, switch from week/month to day
    if (isMobile && (view === 'week' || view === 'month')) {
      setView('day');
    }
    // On desktop, switch from threeDay to day
    else if (!isMobile && view === 'threeDay') {
      setView('day');
    }
  }, []);

  // Handle window resize - switch views based on screen size
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768; // md breakpoint
      // On mobile, switch from week/month to day
      if (isMobile && (view === 'week' || view === 'month')) {
        setView('day');
      }
      // On desktop, switch from threeDay to day
      else if (!isMobile && view === 'threeDay') {
        setView('day');
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [view]);

  async function loadClasses() {
    try {
      setLoading(true);
      const response = await api.get<any[]>('/admin/classes');
      const sourceRows = response.success && Array.isArray(response.data) ? response.data : [];
      const transformedClasses: Class[] = sourceRows.map((cls: any) => ({
        id: cls.id?.toString() ?? cls.id,
        name: cls.name ?? cls.class_name ?? '',
        name_zh_tw: getClassNameByLang(cls, 'zh_tw') ?? cls.class_name ?? cls.name,
        name_zh_cn: getClassNameByLang(cls, 'zh_cn'),
        name_en: getClassNameByLang(cls, 'en'),
        class_code: cls.class_code ?? cls.program_code ?? '',
        lesson_number: cls.lesson_number != null ? Number(cls.lesson_number) : null,
        instructor: cls.instructor || '',
        substitute_instructor: cls.substitute_instructor ?? null,
        start_time: cls.start_time,
        end_time: cls.end_time,
        capacity: cls.capacity ?? 10,
        enrolled_count: cls.enrolled_count ?? 0,
        is_internal: cls.is_internal === 1 || cls.is_internal === true,
        is_cancelled: cls.is_cancelled === 1 || cls.is_cancelled === true,
        allow_trial: cls.allow_trial === 1 || cls.allow_trial === true,
        location: cls.location,
        level: cls.level,
        age_tag: cls.age_group ?? cls.age_tag,
        tag_values: extractClassTagValues(cls),
        postponed_from: cls.postponed_from ?? null,
        attendance_confirmed: cls.attendance_confirmed === 1 || cls.attendance_confirmed === true,
      }));
      setClasses(transformedClasses);
    } catch (error) {
      console.error('Error loading classes:', error);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadInstructors() {
    try {
      const response = await api.get<any[]>('/admin/instructors');
      const sourceRows = response.success && Array.isArray(response.data) ? response.data : [];
      setInstructors(
        sourceRows.map((inst: any) => ({
          id: String(inst.id),
          name: inst.name || '',
          profile_image_url: inst.profile_image_url ?? null,
          created_at: inst.created_at || new Date().toISOString(),
        }))
      );
    } catch (error) {
      console.error('Error loading instructors:', error);
      setInstructors([]);
    }
  }

  async function loadAttendanceData(
    classId: string
  ): Promise<{ class: ClassWithAttendance; enrollments: Enrollment[] } | null> {
    const c = classes.find((x) => String(x.id) === String(classId));
    if (!c) return null;
    const classWithAttendance: ClassWithAttendance = { ...c, id: String(c.id), attendance_confirmed: c.attendance_confirmed ?? false };
    try {
      const res = await api.get<any[]>(`/admin/classes/${classId}/enrollments`);
      const list = res.success && Array.isArray(res.data) ? res.data : [];
      const enrollments: Enrollment[] = dedupeLatestEnrollmentPerStudent(
        list.map((e: any) => ({
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
      );
      return { class: classWithAttendance, enrollments };
    } catch {
      return { class: classWithAttendance, enrollments: [] };
    }
  }

  function toggleAttendance(classId: string) {
    setExpandedAttendanceClassId((prev) => (prev === classId ? null : classId));
  }

  function toTimeString(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  async function updateAttendanceStatus(
    enrollmentId: string,
    newStatus: 'enrolled' | 'attended' | 'absent' | 'sick_leave'
  ) {
    const now = new Date();
    const payload: any = { status: newStatus };
    if (newStatus === 'attended') {
      payload.check_in_time = toTimeString(now);
      payload.check_out_time = toTimeString(now);
    }
    try {
      await api.patch(`/admin/class-enrollments/${enrollmentId}`, payload);
      setAttendanceData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          enrollments: prev.enrollments.map((e) =>
            e.id === enrollmentId
              ? {
                  ...e,
                  status: newStatus,
                  check_in_time: newStatus === 'attended' ? payload.check_in_time : e.check_in_time,
                  check_out_time: newStatus === 'attended' ? payload.check_out_time : e.check_out_time,
                }
              : e
          ),
        };
      });
    } catch (err) {
      console.error('Failed to update attendance:', err);
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
      setAttendanceData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          enrollments: prev.enrollments.map((e) =>
            enrollmentIds.includes(e.id)
              ? { ...e, status: 'attended' as const, check_in_time: checkIn, check_out_time: checkOut }
              : e
          ),
        };
      });
    } catch (err) {
      console.error('Failed to mark as attended:', err);
    }
  }

  function toggleAttendanceConfirmation() {
    setAttendanceData((prev) => {
      if (!prev) return prev;
      const next = !prev.class.attendance_confirmed;
      return { ...prev, class: { ...prev.class, attendance_confirmed: next } };
    });
    if (attendanceData?.class?.id != null) {
      const classId = attendanceData.class.id;
      const next = !attendanceData.class.attendance_confirmed;
      setClasses((prev) => prev.map((c) => (String(c.id) === String(classId) ? { ...c, attendance_confirmed: next } : c)));
    }
  }

  async function handleCancelClass(classId: string) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    setClasses((prev) => prev.map((c) => (c.id === classId ? { ...c, is_cancelled: true } : c)));
    setAttendanceData((prev) =>
      prev && prev.class.id === classId ? { ...prev, class: { ...prev.class, is_cancelled: true } } : prev
    );
    alert(t('admin.attendance.classCancelled'));
  }

  async function handleRefundToken(enrollmentId: string, userId: string, userName: string, remarks: string) {
    const cls = attendanceData?.class;
    try {
      await api.post('admin/refund-records', {
        enrollment_id: enrollmentId,
        user_id: userId,
        user_name: userName,
        class_id: cls?.id ?? '',
        class_name: cls?.name ?? '',
        class_code: cls?.class_code ?? cls?.program_code ?? '',
        tokens_refunded: 1,
        remarks,
        refunded_by: profile?.full_name ?? 'Admin',
      });
      window.dispatchEvent(new CustomEvent('refund-record-added'));
      alert(t('admin.attendance.tokenRefunded', { name: userName }));
    } catch (err) {
      console.error('Refund record failed:', err);
      alert(err instanceof Error ? err.message : t('common.error'));
    }
  }

  function findRepeatedClasses(classItem: Class): Class[] {
    // Use stable series key first (program/class code) so one-off edits
    // to name/instructor/location won't break bulk-edit grouping.
    const seriesCode = (classItem.class_code || '').trim();
    if (seriesCode) {
      return classes.filter(
        (c) =>
          c.id !== classItem.id &&
          (c.class_code || '').trim() === seriesCode &&
          c.is_internal === classItem.is_internal
      );
    }

    // Legacy fallback for old rows without class_code.
    return classes.filter(
      (c) =>
        c.id !== classItem.id &&
        c.name === classItem.name &&
        c.instructor === classItem.instructor &&
        c.location === classItem.location &&
        c.is_internal === classItem.is_internal
    );
  }

  const recurringLastLessonDate = useMemo(() => {
    if (editingClass || !form.repeat_weekly || !form.date) return null;
    const total = Math.floor(Number(form.total_lessons)) || 0;
    if (total < 1) return null;
    const cursor = new Date(`${form.date}T00:00:00`);
    if (Number.isNaN(cursor.getTime())) return null;
    let count = 0;
    while (count < total) {
      const key = toLocalDateKey(cursor);
      if (!holidayDatesSet.has(key)) count += 1;
      if (count >= total) break;
      cursor.setDate(cursor.getDate() + 7);
    }
    return new Date(cursor);
  }, [editingClass, form.repeat_weekly, form.date, form.total_lessons, holidayDatesSet]);

  async function bulkDeleteClasses(classIds: Array<string | number>) {
    const ids = Array.from(
      new Set(
        classIds
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    );
    if (ids.length === 0) {
      throw new Error('No valid class ids to delete');
    }
    const response = await api.post<{
      requested_count?: number;
      deleted_count?: number;
    }>('/admin/classes/bulk-delete', { ids });
    if (!response.success) {
      throw new Error(response.msg || 'Failed to delete classes');
    }
    return {
      requested_count: Number(response.data?.requested_count ?? ids.length),
      deleted_count: Number(response.data?.deleted_count ?? 0),
    };
  }

  async function handleDeleteClass(classItem: Class, deleteSeries: boolean) {
    const repeated = findRepeatedClasses(classItem).filter((c) => isNumericClassId(c.id));
    const targetClasses = deleteSeries ? [classItem, ...repeated] : [classItem];
    if (!isNumericClassId(classItem.id)) {
      alert(t('admin.classes.demoDataCannotEdit'));
      return;
    }

    try {
      const result = await bulkDeleteClasses(targetClasses.map((c) => c.id));
      await loadClasses();
      if (deleteSeries) {
        if (result.deleted_count === result.requested_count) {
          alert(t('admin.classes.classesDeleted', { count: result.deleted_count }));
        } else if (result.deleted_count > 0) {
          alert(
            t('admin.classes.classesDeletedPartial', {
              deleted: result.deleted_count,
              requested: result.requested_count,
            }),
          );
        } else {
          alert(t('admin.classes.classesDeletedNone'));
        }
        return;
      }

      if (result.deleted_count > 0) {
        alert(t('admin.classes.classDeleted'));
      } else {
        alert(t('admin.classes.classesDeletedNone'));
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      alert(error instanceof Error ? error.message : t('common.error'));
    }
  }

  function openDeleteDialog(classItem: Class) {
    setDeleteTargetClass(classItem);
    setDeleteMode('single');
  }

  /** Build datetime string for API: local date + time as "YYYY-MM-DDTHH:mm:ss" (no Z) so backend stores the same time. */
  function toLocalDateTimeString(dateStr: string, timeStr: string): string {
    if (!dateStr || !timeStr) return '';
    const [hours, minutes] = timeStr.split(':').map((x) => parseInt(x, 10) || 0);
    const [y, m, d] = dateStr.split('-').map((x) => parseInt(x, 10) || 0);
    const M = String(m).padStart(2, '0');
    const D = String(d).padStart(2, '0');
    const H = String(hours).padStart(2, '0');
    const Min = String(minutes).padStart(2, '0');
    return `${y}-${M}-${D}T${H}:${Min}:00`;
  }

  /** Format a Date as local "YYYY-MM-DDTHH:mm:ss" for API (no UTC conversion). */
  function formatDateAsLocalDateTime(d: Date): string {
    const y = d.getFullYear();
    const M = String(d.getMonth() + 1).padStart(2, '0');
    const D = String(d.getDate()).padStart(2, '0');
    const H = String(d.getHours()).padStart(2, '0');
    const Min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${M}-${D}T${H}:${Min}:00`;
  }

  /** Legacy: used only where ISO with Z is needed (e.g. some comparisons). Prefer toLocalDateTimeString for API payloads. */
  function toISOFromDateAndTime(dateStr: string, timeStr: string): string {
    if (!dateStr || !timeStr) return '';
    const [hours, minutes] = timeStr.split(':').map((x) => parseInt(x, 10) || 0);
    const d = new Date(dateStr);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  }

  function dateFromISO(iso: string): string {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function timeFromISO(iso: string): string {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  // Time options for touch-friendly dropdowns (iPad / mobile)
  const TIME_HOURS = Array.from({ length: 16 }, (_, i) => String(i + 7).padStart(2, '0')); // 07–22
  const TIME_MINUTES = ['00', '15', '30', '45'];

  function parseTimeToHourMin(timeStr: string): { hour: string; minute: string } {
    if (!timeStr || !timeStr.includes(':')) return { hour: '14', minute: '00' };
    const [h, m] = timeStr.split(':').map((x) => parseInt(x, 10) || 0);
    const hour = Math.max(7, Math.min(22, h));
    const minIdx = Math.round(m / 15) % 4;
    const minute = TIME_MINUTES[minIdx];
    return { hour: String(hour).padStart(2, '0'), minute };
  }

  function setStartTime(hour: string, minute: string) {
    setForm((f) => ({ ...f, start_time: `${hour}:${minute}` }));
  }
  function setEndTime(hour: string, minute: string) {
    setForm((f) => ({ ...f, end_time: `${hour}:${minute}` }));
  }

  function openEditModal(classItem: Class) {
    setEditingClass(classItem);
    setEditAllRepeats(true);
    setForm({
      name: classItem.name,
      name_zh_tw: classItem.name_zh_tw ?? classItem.name ?? '',
      name_zh_cn: classItem.name_zh_cn ?? '',
      name_en: classItem.name_en ?? '',
      class_code: classItem.class_code,
      instructor: classItem.instructor,
      substitute_instructor: classItem.substitute_instructor ?? '',
      date: dateFromISO(classItem.start_time),
      start_time: timeFromISO(classItem.start_time),
      end_time: timeFromISO(classItem.end_time),
      capacity: classItem.capacity,
      is_internal: classItem.is_internal,
      location: classItem.location || 'sanpokong',
      level: classItem.level || 'entry',
      lowest_age: parseAgeRange(classItem.age_tag).lowest,
      oldest_age: parseAgeRange(classItem.age_tag).oldest,
      repeat_weekly: false,
      total_lessons: 8,
      allow_trial: classItem.allow_trial ?? true,
      tag_values: buildDefaultTagValues(tagTypes, {
        ...classItem.tag_values,
        level: classItem.tag_values?.level ?? classItem.level ?? 'entry',
        age: classItem.tag_values?.age ?? classItem.age_tag ?? '5-8',
      }),
    });
    setShowModal(true);
  }

  function openCreateModal() {
    setEditingClass(null);
    const today = new Date().toISOString().slice(0, 10);
    setForm({
      name: '',
      name_zh_tw: '',
      name_zh_cn: '',
      name_en: '',
      class_code: '',
      instructor: '',
      substitute_instructor: '',
      date: today,
      start_time: '14:00',
      end_time: '15:00',
      capacity: 10,
      is_internal: false,
      location: 'sanpokong',
      level: 'entry',
      lowest_age: 5,
      oldest_age: 8,
      repeat_weekly: false,
      total_lessons: 8,
      allow_trial: true,
      tag_values: buildDefaultTagValues(tagTypes),
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nameForApi = form.name_zh_tw.trim() || form.name_zh_cn.trim() || form.name_en.trim() || form.name.trim();
    if (!nameForApi) {
      alert(t('admin.classes.classNameRequired', '請至少填寫一種語言的課程名稱'));
      return;
    }
    const selectedLevelCode = form.tag_values.level || form.level || 'entry';
    const selectedAgeTagCode = form.tag_values.age || ageRangeToTag(form.lowest_age, form.oldest_age);
    // If editing, update the existing class(es)
    if (editingClass) {
      if (!isNumericClassId(editingClass.id)) {
        alert(t('admin.classes.demoDataCannotEdit') || '此課程為示範資料，無法儲存。請重新載入頁面取得真實課程後再編輯。');
        return;
      }
      try {
        if (editAllRepeats) {
          // Update all repeated classes
          const repeatedClasses = findRepeatedClasses(editingClass);
          const allClassesToUpdate = [editingClass, ...repeatedClasses];
          
          const newStart = new Date(toISOFromDateAndTime(form.date, form.start_time));
          const newEnd = new Date(toISOFromDateAndTime(form.date, form.end_time));
          const originalStart = new Date(editingClass.start_time);
          const originalEnd = new Date(editingClass.end_time);
          const timeDiff = newStart.getTime() - originalStart.getTime();
          const duration = newEnd.getTime() - newStart.getTime();
          
          // Update each class via API
          const updatePromises = allClassesToUpdate
            .filter((c) => isNumericClassId(c.id))
            .map(async (c) => {
            // Calculate new times for this class
            const classStart = new Date(c.start_time);
            const newClassStart = new Date(classStart.getTime() + timeDiff);
            const newClassEnd = new Date(newClassStart.getTime() + duration);
            
            const nameForApi = form.name_zh_tw.trim() || form.name_zh_cn.trim() || form.name_en.trim() || form.name.trim();
            const updateData = {
              name: nameForApi,
              ...buildClassNamePayload(form),
              ...buildClassCodePayload(form.class_code),
              instructor: form.instructor,
              substitute_instructor: form.substitute_instructor || null,
              start_time: formatDateAsLocalDateTime(newClassStart),
              end_time: formatDateAsLocalDateTime(newClassEnd),
              capacity: form.capacity,
              is_internal: form.is_internal ? 1 : 0,
              allow_trial: form.allow_trial ? 1 : 0,
              location: form.location,
              level: selectedLevelCode,
              age_group: selectedAgeTagCode,
              tag_values: form.tag_values,
            };
            
            return api.patch(`/admin/classes/${c.id}`, updateData);
          });
          
          await Promise.all(updatePromises);
          
          // Reload classes from API
          await loadClasses();
          alert(t('admin.classes.classesUpdated', { count: allClassesToUpdate.length }));
        } else {
          // Update single class via API (send local time so backend stores 11:00 as 11:00, not UTC)
          const startISO = toLocalDateTimeString(form.date, form.start_time);
          const endISO = toLocalDateTimeString(form.date, form.end_time);
          const nameForApi = form.name_zh_tw.trim() || form.name_zh_cn.trim() || form.name_en.trim() || form.name.trim();
          const updateData = {
            name: nameForApi,
            ...buildClassNamePayload(form),
            ...buildClassCodePayload(form.class_code),
            instructor: form.instructor,
            substitute_instructor: form.substitute_instructor || null,
            start_time: startISO,
            end_time: endISO,
            capacity: form.capacity,
            is_internal: form.is_internal ? 1 : 0,
            allow_trial: form.allow_trial ? 1 : 0,
            location: form.location,
            level: selectedLevelCode,
            age_group: selectedAgeTagCode,
            tag_values: form.tag_values,
          };
          
          const response = await api.patch(`/admin/classes/${editingClass.id}`, updateData);
          
          if (response.success && response.data) {
            // Transform API response to match frontend Class interface
            const updatedClass: Class = {
              id: response.data.id.toString(),
              name: response.data.name ?? nameForApi,
              name_zh_tw:
                getClassNameByLang(response.data, 'zh_tw') ?? (form.name_zh_tw.trim() || undefined),
              name_zh_cn:
                getClassNameByLang(response.data, 'zh_cn') ?? (form.name_zh_cn.trim() || undefined),
              name_en:
                getClassNameByLang(response.data, 'en') ?? (form.name_en.trim() || undefined),
              class_code: response.data.class_code || response.data.program_code || '',
              instructor: response.data.instructor || '',
              substitute_instructor: response.data.substitute_instructor || null,
              start_time: response.data.start_time,
              end_time: response.data.end_time,
              capacity: response.data.capacity,
              enrolled_count: response.data.enrolled_count || 0,
              is_internal: response.data.is_internal === 1 || response.data.is_internal === true,
              is_cancelled: response.data.is_cancelled === 1 || response.data.is_cancelled === true,
              allow_trial: response.data.allow_trial === 1 || response.data.allow_trial === true,
              location: response.data.location,
              level: response.data.level,
              age_tag: (response.data.age_group as string) ?? '5-8',
              tag_values: extractClassTagValues(response.data),
            };
            
            setClasses(classes.map(c => c.id === editingClass.id ? updatedClass : c));
            alert(t('admin.classes.classUpdated'));
          } else {
            throw new Error(response.msg || 'Failed to update class');
          }
        }
        
        setShowModal(false);
        setEditingClass(null);
        setEditAllRepeats(false);
        const today = new Date().toISOString().slice(0, 10);
        setForm({
          name: '',
          name_zh_tw: '',
          name_zh_cn: '',
          name_en: '',
          class_code: '',
          instructor: '',
          substitute_instructor: '',
          date: today,
          start_time: '14:00',
          end_time: '15:00',
          capacity: 10,
          is_internal: false,
          location: 'sanpokong',
          level: 'entry',
          lowest_age: 5,
          oldest_age: 8,
          repeat_weekly: false,
          total_lessons: 8,
          allow_trial: true,
          tag_values: buildDefaultTagValues(tagTypes),
        });
      } catch (error) {
        console.error('Error updating class:', error);
        alert(error instanceof Error ? error.message : 'Failed to update class');
      }
      return;
    }

    // Creating new class(es)
    const newClasses: Class[] = [];
    const createdClasses: Class[] = [];

    // 每週重覆：依課堂總堂數建立，每週同一天、自動跳過假期
    if (form.repeat_weekly && form.date && form.start_time && form.end_time) {
      const total = Math.floor(Number(form.total_lessons)) || 0;
      if (total < 1 || total > 99) {
        alert(t('admin.classes.totalLessonsRequired'));
        return;
      }
      try {
        const firstDate = form.date;
        const startTimeOfDay = form.start_time;
        const endTimeOfDay = form.end_time;
        const nameForApi = form.name_zh_tw.trim() || form.name_zh_cn.trim() || form.name_en.trim() || form.name.trim();
        const res = await api.post<{ id: string; name: string; program_code?: string; instructor: string; start_time: string; end_time: string; capacity: number; enrolled_count: number; is_internal: number; is_cancelled: number; allow_trial?: number; location?: string; level?: string; age_group?: string }[]>('admin/classes/recurring', {
          first_date: firstDate,
          start_time: startTimeOfDay,
          end_time: endTimeOfDay,
          number_of_lessons: total,
          name: nameForApi,
          ...buildClassNamePayload(form),
          instructor: form.instructor,
          capacity: form.capacity,
          location: form.location,
          ...buildClassCodePayload(form.class_code || ''),
          level: selectedLevelCode,
          age_group: selectedAgeTagCode,
          tag_values: form.tag_values,
          is_internal: form.is_internal ? 1 : 0,
          allow_trial: form.allow_trial ? 1 : 0,
        });
        const data = res.data ?? [];
        for (const c of data) {
          createdClasses.push({
            id: String(c.id),
            name: c.name,
            name_zh_tw: getClassNameByLang(c, 'zh_tw'),
            name_zh_cn: getClassNameByLang(c, 'zh_cn'),
            name_en: getClassNameByLang(c, 'en'),
            class_code: c.class_code || c.program_code || '',
            lesson_number: c.lesson_number != null ? Number(c.lesson_number) : null,
            instructor: c.instructor,
            substitute_instructor: null,
            start_time: c.start_time,
            end_time: c.end_time,
            capacity: c.capacity,
            enrolled_count: c.enrolled_count || 0,
            is_internal: c.is_internal === 1,
            is_cancelled: c.is_cancelled === 1,
            allow_trial: c.allow_trial === 1 || c.allow_trial === true,
            location: c.location,
            level: (c.level as CourseLevel) || 'entry',
            age_tag: (c.age_group as string) ?? '5-8',
            tag_values: extractClassTagValues(c),
          });
        }
        newClasses.push(...createdClasses);
        await loadClasses();
        setShowModal(false);
        setEditingClass(null);
        const today = new Date().toISOString().slice(0, 10);
        setForm({
          name: '',
          name_zh_tw: '',
          name_zh_cn: '',
          name_en: '',
          class_code: '',
          instructor: '',
          substitute_instructor: '',
          date: today,
          start_time: '14:00',
          end_time: '15:00',
          capacity: 10,
          is_internal: false,
          location: 'sanpokong',
          level: 'entry',
          lowest_age: 5,
          oldest_age: 8,
          repeat_weekly: false,
          total_lessons: 8,
          allow_trial: true,
          tag_values: buildDefaultTagValues(tagTypes),
        });
        alert(t('admin.classes.recurringCourseCreated', { count: createdClasses.length }));
      } catch (err) {
        console.error('Recurring course create failed:', err);
        alert(err instanceof Error ? err.message : t('common.error'));
      }
      return;
    }

    // Single class (no repeat weekly)
    // Create single class - check for holidays and postpone if needed
    if (!form.date || !form.start_time || !form.end_time) {
      alert(t('admin.classes.dateAndTimeRequired'));
      return;
    }
    {
      const startISO = toISOFromDateAndTime(form.date, form.start_time);
      const endISO = toISOFromDateAndTime(form.date, form.end_time);
      const startDate = new Date(startISO);
      const { shouldPostpone, newDate } = shouldPostponeClassWithHolidays(startDate, holidayDatesSet);
      const adjustedStartDate = shouldPostpone ? newDate : startDate;
      const timeDiff = new Date(endISO).getTime() - startDate.getTime();
      const adjustedEndDate = new Date(adjustedStartDate.getTime() + timeDiff);
      const adjustedDateStr = `${adjustedStartDate.getFullYear()}-${String(adjustedStartDate.getMonth() + 1).padStart(2, '0')}-${String(adjustedStartDate.getDate()).padStart(2, '0')}`;
      const adjustedStartTimeStr = `${String(adjustedStartDate.getHours()).padStart(2, '0')}:${String(adjustedStartDate.getMinutes()).padStart(2, '0')}`;
      const adjustedEndTimeStr = `${String(adjustedEndDate.getHours()).padStart(2, '0')}:${String(adjustedEndDate.getMinutes()).padStart(2, '0')}`;

      // Send date + time-only to API (API combines and stores full datetime in DB)
      const nameForApi = form.name_zh_tw.trim() || form.name_zh_cn.trim() || form.name_en.trim() || form.name.trim();
      const classData = {
        name: nameForApi,
        ...buildClassNamePayload(form),
        instructor: form.instructor,
        date: adjustedDateStr,
        start_time: adjustedStartTimeStr,
        end_time: adjustedEndTimeStr,
        capacity: form.capacity,
        location: form.location,
        ...buildClassCodePayload(form.class_code),
        level: selectedLevelCode,
        age_group: selectedAgeTagCode,
        tag_values: form.tag_values,
        is_internal: form.is_internal ? 1 : 0,
        allow_trial: form.allow_trial ? 1 : 0,
        repeat_weekly: 0,
      };

      try {
        // Create class via API (API builds full start_time/end_time from date + time)
        const response = await api.post('/admin/classes', classData);
        if (response.success && response.data) {
          const createdClass: Class = {
            id: response.data.id.toString(),
            name: response.data.name,
            name_zh_tw: getClassNameByLang(response.data, 'zh_tw'),
            name_zh_cn: getClassNameByLang(response.data, 'zh_cn'),
            name_en: getClassNameByLang(response.data, 'en'),
            class_code: response.data.class_code || response.data.program_code || '',
            instructor: response.data.instructor || '',
            substitute_instructor: null,
            start_time: response.data.start_time,
            end_time: response.data.end_time,
            capacity: response.data.capacity,
            enrolled_count: response.data.enrolled_count || 0,
            is_internal: response.data.is_internal === 1 || response.data.is_internal === true,
            is_cancelled: response.data.is_cancelled === 1 || response.data.is_cancelled === true,
            allow_trial: response.data.allow_trial === 1 || response.data.allow_trial === true,
            location: response.data.location,
            level: response.data.level,
            age_tag: (response.data.age_group as string) ?? '5-8',
            tag_values: extractClassTagValues(response.data),
          };
          newClasses.push(createdClass);
        } else {
          throw new Error(response.msg || 'Failed to create class');
        }
      } catch (error) {
        console.error('Error creating class:', error);
        alert(error instanceof Error ? error.message : 'Failed to create class');
        return;
      }
    }

    // Update local state with newly created classes
    setClasses([...newClasses, ...classes]);
    if (newClasses.length === 1) {
      alert(t('admin.classes.classCreated'));
    } else {
      alert(t('admin.classes.classesCreated', { count: newClasses.length }));
    }
    setShowModal(false);
    const today = new Date().toISOString().slice(0, 10);
    setForm({
      name: '',
      name_zh_tw: '',
      name_zh_cn: '',
      name_en: '',
      class_code: '',
      instructor: '',
      substitute_instructor: '',
      date: today,
      start_time: '14:00',
      end_time: '15:00',
      capacity: 10,
      is_internal: false,
      location: 'sanpokong',
      level: 'entry',
      lowest_age: 5,
      oldest_age: 8,
      repeat_weekly: false,
      total_lessons: 8,
      allow_trial: true,
      tag_values: buildDefaultTagValues(tagTypes),
    });
  }

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];
    
    // Add days from previous month so column 0 = Sunday of the week containing the 1st
    const startDay = firstDay.getDay(); // 0=Sun, 1=Mon, ...
    for (let i = 0; i < startDay; i++) {
      days.push(new Date(year, month, 1 - startDay + i));
    }
    
    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    // Add days from next month to fill last week
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(lastDay);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    
    return days;
  };

  const getClassesForDate = (date: Date): Class[] => {
    // No classes on holidays (admin holidays list)
    if (getHolidayName(date)) return [];

    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    return classes.filter(classItem => {
      const classDate = new Date(classItem.start_time);
      const classYear = classDate.getFullYear();
      const classMonth = classDate.getMonth();
      const classDay = classDate.getDate();
      const classDateStr = `${classYear}-${String(classMonth + 1).padStart(2, '0')}-${String(classDay).padStart(2, '0')}`;
      
      const dateMatches = classDateStr === dateStr;
      const locationMatches = locationFilter === 'all' || classItem.location === locationFilter;
      
      return dateMatches && locationMatches;
    });
  };

  const getFilteredClasses = (): Class[] => {
    let filtered = classes;

    // Exclude classes that fall on a holiday (admin holidays list)
    filtered = filtered.filter((classItem) => {
      const classDate = new Date(classItem.start_time);
      const y = classDate.getFullYear();
      const m = String(classDate.getMonth() + 1).padStart(2, '0');
      const d = String(classDate.getDate()).padStart(2, '0');
      const classDateStr = `${y}-${m}-${d}`;
      return !holidayDatesSet.has(classDateStr);
    });

    // Filter by location
    if (locationFilter !== 'all') {
      filtered = filtered.filter(classItem => classItem.location === locationFilter);
    }

    // Filter by class name (display name)
    if (classNameFilter) {
      filtered = filtered.filter(classItem => (getClassDisplayName(classItem) || '').trim() === classNameFilter);
    }

    // Filter by selected date
    if (selectedDate) {
      filtered = filtered.filter(classItem => {
        const classDateStr = getLocalDateStr(classItem.start_time);
        const selectedDateStr = getLocalDateStr(selectedDate);
        return classDateStr === selectedDateStr;
      });
    }

    // Default: only today and future classes (skip when viewing a specific calendar day)
    if (!showExpiredClasses && !selectedDate) {
      const todayStr = getLocalDateStr(new Date());
      filtered = filtered.filter((classItem) => getLocalDateStr(classItem.start_time) >= todayStr);
    }

    return filtered;
  };

  const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const getEndOfWeek = (date: Date): Date => {
    const start = getStartOfWeek(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (view === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (view === 'threeDay') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 3 : -3));
    } else {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const clearDateSelection = () => {
    setSelectedDate(null);
  };

  const getLocale = (): string => {
    const langMap: { [key: string]: string } = {
      'en': 'en-US',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
    };
    return langMap[i18n.language] || i18n.language || 'en-US';
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString(getLocale(), { month: 'long', year: 'numeric' });
  };

  const formatWeekRange = (date: Date): string => {
    const start = getStartOfWeek(date);
    const end = getEndOfWeek(date);
    const locale = getLocale();
    return `${start.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const formatDateLong = (date: Date): string => {
    return date.toLocaleDateString(getLocale(), {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDay = (date: Date): string => {
    return date.toLocaleDateString(getLocale(), {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getLocationLabel = (location: LocationFilter): string => {
    if (location === 'all') {
      return t('admin.classes.allLocations');
    }
    return t(`home.locations.${location}`);
  };

  /** Short label for the filter bar location dropdown (first option is "全部" / "All"). */
  const getLocationFilterOptionLabel = (location: LocationFilter): string => {
    if (location === 'all') return t('admin.classes.allLocationsShort', '全部');
    return t(`home.locations.${location}`);
  };

  /** Reported enrolment never shown above capacity; append (Full) when at or over capacity. */
  const renderEnrollmentCountSummary = (classItem: Class): ReactNode => {
    const capacity = Math.max(0, Number(classItem.capacity) || 0);
    const raw = Math.max(0, Number(classItem.enrolled_count) || 0);
    const displayEnrolled = capacity > 0 ? Math.min(raw, capacity) : raw;
    const isFull = capacity > 0 && raw >= capacity;
    return (
      <>
        {t('admin.classes.enrollmentCountSummary', { enrolled: displayEnrolled, capacity })}
        {isFull ? (
          <span className="text-amber-800 font-medium">{t('admin.classes.enrollmentFull', ' (Full)')}</span>
        ) : null}
      </>
    );
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString(getLocale(), {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // Location colors – same as public calendar for consistent UI
  const getLocationColors = (location: NonNullable<Class['location']>) => {
    const colorMap = {
      sanpokong: { primary: '#10b981', dark: '#059669', light: '#34d399', lighter: '#d1fae5' },
      causewaybay: { primary: '#a67c52', dark: '#8b6f47', light: '#c49b6a', lighter: '#f0e6d2' },
      fotan: { primary: '#f97316', dark: '#ea580c', light: '#fb923c', lighter: '#ffedd5' },
      sheungshui: { primary: '#3b82f6', dark: '#2563eb', light: '#60a5fa', lighter: '#dbeafe' },
    };
    return colorMap[location] ?? colorMap.sanpokong;
  };

  const renderDayView = () => {
    const dayClasses = getClassesForDate(currentDate);
    const holidayName = getHolidayName(currentDate);

    return (
      <div className="space-y-4">
        {/* Holiday Banner */}
        {holidayName && (
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4" style={{ borderColor: '#d1d5db' }}>
            <div className="text-sm text-gray-400 italic">
              {holidayName}
            </div>
          </div>
        )}
        {dayClasses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 text-center py-8">
              {t('admin.classes.noClassesScheduled')} {formatDay(currentDate)}
              {locationFilter !== 'all' ? ` ${t('admin.classes.at')} ${getLocationLabel(locationFilter)}` : ''}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {dayClasses.map((classItem) => (
              <div
                key={classItem.id}
                className={`bg-white rounded-lg shadow-md p-6 ${
                  classItem.is_cancelled ? 'opacity-50' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-xl font-semibold text-gray-900">{getClassDisplayName(classItem)}</h3>
                      {!classItem.attendance_confirmed && (
                        <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded">
                          {t('admin.classes.attendanceNotConfirmed')}
                        </span>
                      )}
                      {classItem.is_internal && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          補課
                        </span>
                      )}
                      {classItem.is_cancelled && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                          {t('admin.classes.cancelled')}
                        </span>
                      )}
                    </div>
                    {formatProgramCodeDisplay(classItem.class_code, classItem.lesson_number) && (
                      <p className="text-gray-600 mb-1 text-sm font-medium">{formatProgramCodeDisplay(classItem.class_code, classItem.lesson_number)}</p>
                    )}
                    <p className="text-gray-600 mb-1">{classItem.instructor}</p>
                    {classItem.substitute_instructor && (
                      <p className="text-gray-500 mb-1 text-sm">{t('admin.classes.substituteShort')}: {classItem.substitute_instructor}</p>
                    )}
                    <div className="flex items-center text-sm text-gray-600 mb-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDateTimeRange(classItem.start_time, classItem.end_time, getLocale())}
                    </div>
                    {classItem.location && (
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        {getLocationLabel(classItem.location)}
                      </div>
                    )}
                    {classItem.postponed_from && (
                      <p className="text-sm text-amber-700 bg-amber-50 px-2 py-1 rounded mb-1 inline-block">
                        {t('admin.classes.postponedFrom', '原 {{date}} → 順延至本堂', { date: classItem.postponed_from })}
                      </p>
                    )}
                    <p className="text-sm text-gray-600">
                      {renderEnrollmentCountSummary(classItem)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleAttendance(String(classItem.id)); }}
                      className={`px-4 py-2 rounded-md text-sm font-medium flex items-center ${
                        String(expandedAttendanceClassId) === String(classItem.id)
                          ? 'bg-purple-200 text-purple-800 ring-2 ring-purple-400'
                          : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      }`}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      {t('admin.classes.attendance')}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(classItem)}
                      className="px-4 py-2 rounded-md text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      {t('common.edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteDialog(classItem)}
                      className="px-4 py-2 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 flex items-center"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
                {String(expandedAttendanceClassId) === String(classItem.id) && (
                  attendanceLoading ? (
                    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : (
                    attendanceData &&
                    String(attendanceData.class.id) === String(classItem.id) && (
                      <ClassAttendancePanel
                        class={attendanceData.class}
                        enrollments={attendanceData.enrollments}
                        onUpdateStatus={updateAttendanceStatus}
                        onToggleConfirmation={toggleAttendanceConfirmation}
                        onCancelClass={() => handleCancelClass(classItem.id)}
                        onReassign={() => { if (classItem?.id) navigate(`/admin/classes/${String(classItem.id)}/reassign`); }}
                        onRefundToken={handleRefundToken}
                        onMarkMultipleAttended={handleMarkMultipleAttended}
                        onClose={() => setExpandedAttendanceClassId(null)}
                        inline
                      />
                    )
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderThreeDayView = () => {
    const threeDays = Array.from({ length: 3 }, (_, i) => {
      const d = new Date(currentDate);
      d.setDate(currentDate.getDate() + i);
      return d;
    });

    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="grid grid-cols-3 border-b">
          {threeDays.map((day, idx) => {
            const holidayName = getHolidayName(day);
            return (
              <div key={idx} className="border-r last:border-r-0 p-3 text-center bg-gray-50">
                <div className="text-sm font-medium text-gray-600">
                  {day.toLocaleDateString(getLocale(), { weekday: 'short' })}
                </div>
                <div className={`text-lg font-semibold mt-1 ${
                  day.toDateString() === new Date().toDateString() 
                    ? 'text-primary' 
                    : 'text-gray-900'
                }`}>
                  {day.getDate()}
                </div>
                {holidayName && (
                  <div className="text-xs text-gray-400 mt-1 italic truncate" title={holidayName}>
                    {holidayName}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-3 min-h-[400px]">
          {threeDays.map((day, idx) => {
            const dayClasses = getClassesForDate(day);
            const isToday = day.toDateString() === new Date().toDateString();
            const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();
            const holidayName = getHolidayName(day);
            
            return (
              <div
                key={idx}
                className={`border-r last:border-r-0 p-2 cursor-pointer transition-colors ${
                  isToday ? 'bg-primary-lighter' : ''
                } ${isSelected ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-gray-50'}`}
                onClick={() => handleDateClick(day)}
              >
                {holidayName && (
                  <div className="text-xs text-gray-400 mb-2 italic truncate" title={holidayName}>
                    {holidayName}
                  </div>
                )}
                {dayClasses.map((classItem) => {
                  const loc = classItem.location ?? 'sanpokong';
                  const colors = getLocationColors(loc);
                  const isCancelled = classItem.is_cancelled;
                  return (
                    <div
                      key={classItem.id}
                      className="mb-2 p-2 rounded text-xs cursor-pointer transition-all hover:shadow-md text-white"
                      style={{
                        backgroundColor: isCancelled ? '#fecaca' : colors.primary,
                        textDecoration: isCancelled ? 'line-through' : undefined,
                        color: isCancelled ? '#b91c1c' : undefined,
                      }}
                      onMouseEnter={(e) => {
                        if (!isCancelled) {
                          e.currentTarget.style.backgroundColor = colors.dark;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isCancelled) {
                          e.currentTarget.style.backgroundColor = colors.primary;
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(classItem);
                      }}
                      title={getClassDisplayName(classItem)}
                    >
                      <div className="font-medium truncate">{getClassDisplayName(classItem)}</div>
                      {formatProgramCodeDisplay(classItem.class_code, classItem.lesson_number) && (
                        <div className="text-xs mt-0.5 truncate opacity-90 font-medium">
                          {formatProgramCodeDisplay(classItem.class_code, classItem.lesson_number)}
                        </div>
                      )}
                      <div className="text-xs mt-1 truncate opacity-90">
                        {classItem.instructor}
                      </div>
                      <div className="text-xs mt-0.5">
                        {formatTime(new Date(classItem.start_time))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = getStartOfWeek(currentDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });

    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {weekDays.map((day, idx) => {
            const holidayName = getHolidayName(day);
            return (
              <div key={idx} className="border-r last:border-r-0 p-3 text-center bg-gray-50">
                <div className="text-sm font-medium text-gray-600">
                  {day.toLocaleDateString(getLocale(), { weekday: 'short' })}
                </div>
                <div className={`text-lg font-semibold mt-1 ${
                  day.toDateString() === new Date().toDateString() 
                    ? 'text-primary' 
                    : 'text-gray-900'
                }`}>
                  {day.getDate()}
                </div>
                {holidayName && (
                  <div className="text-xs text-gray-400 mt-1 italic truncate" title={holidayName}>
                    {holidayName}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-7 min-h-[400px]">
          {weekDays.map((day, idx) => {
            const dayClasses = getClassesForDate(day);
            const isToday = day.toDateString() === new Date().toDateString();
            const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();
            const holidayName = getHolidayName(day);
            
            return (
              <div
                key={idx}
                className={`border-r last:border-r-0 p-2 cursor-pointer transition-colors ${
                  isToday ? 'bg-primary-lighter' : ''
                } ${isSelected ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-gray-50'}`}
                onClick={() => handleDateClick(day)}
              >
                {holidayName && (
                  <div className="text-xs text-gray-400 mb-2 italic truncate" title={holidayName}>
                    {holidayName}
                  </div>
                )}
                {dayClasses.map((classItem) => {
                  const loc = classItem.location ?? 'sanpokong';
                  const colors = getLocationColors(loc);
                  const isCancelled = classItem.is_cancelled;
                  return (
                    <div
                      key={classItem.id}
                      className="mb-2 p-2 rounded text-xs cursor-pointer transition-all hover:shadow-md text-white"
                      style={{
                        backgroundColor: isCancelled ? '#fecaca' : colors.primary,
                        textDecoration: isCancelled ? 'line-through' : undefined,
                        color: isCancelled ? '#b91c1c' : undefined,
                      }}
                      onMouseEnter={(e) => {
                        if (!isCancelled) {
                          e.currentTarget.style.backgroundColor = colors.dark;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isCancelled) {
                          e.currentTarget.style.backgroundColor = colors.primary;
                        }
                      }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(classItem);
                        }}
                        title={getClassDisplayName(classItem)}
                      >
                        <div className="font-medium truncate">{getClassDisplayName(classItem)}</div>
                        {formatProgramCodeDisplay(classItem.class_code, classItem.lesson_number) && (
                          <div className="text-xs mt-0.5 truncate opacity-90 font-medium">
                            {formatProgramCodeDisplay(classItem.class_code, classItem.lesson_number)}
                          </div>
                        )}
                        <div className="text-xs mt-1 truncate opacity-90">
                          {classItem.instructor}
                        </div>
                        <div className="text-xs mt-0.5">
                          {formatTime(new Date(classItem.start_time))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const days = getDaysInMonth(currentDate);
    // Generate weekday labels based on current locale (starting from Sunday)
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      // January 7, 2024 is a Sunday
      const date = new Date(2024, 0, 7 + i);
      return date.toLocaleDateString(getLocale(), { weekday: 'short' });
    });

    return (
      <>
        <div className="grid grid-cols-7 border-b mb-2">
          {weekDays.map((day, idx) => (
            <div key={idx} className="p-2 text-center bg-gray-50 font-medium text-gray-700 border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const dayClasses = getClassesForDate(day);
            const isToday = day.toDateString() === new Date().toDateString();
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();
            const holidayName = getHolidayName(day);
            
            return (
              <div
                key={idx}
                className={`min-h-[80px] border-r border-b last:border-r-0 p-2 cursor-pointer transition-colors ${
                  isToday ? 'bg-primary-lighter' : ''
                } ${!isCurrentMonth ? 'bg-gray-50' : ''} ${
                  isSelected ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-gray-50'
                }`}
                onClick={() => handleDateClick(day)}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isToday 
                    ? 'text-primary font-bold' 
                    : isCurrentMonth 
                    ? 'text-gray-900' 
                    : 'text-gray-400'
                }`}>
                  {day.getDate()}
                </div>
                {holidayName && (
                  <div className="text-xs text-gray-400 mb-1 italic truncate" title={holidayName}>
                    {holidayName}
                  </div>
                )}
                <div className="space-y-1">
                  {dayClasses.slice(0, 2).map((classItem) => {
                    const loc = classItem.location ?? 'sanpokong';
                    const colors = getLocationColors(loc);
                    const isCancelled = classItem.is_cancelled;
                    return (
                      <div
                        key={classItem.id}
                        className="text-xs p-1 rounded truncate cursor-pointer transition-all hover:shadow text-white"
                        style={{
                          backgroundColor: isCancelled ? '#fecaca' : colors.primary,
                          textDecoration: isCancelled ? 'line-through' : undefined,
                          color: isCancelled ? '#b91c1c' : undefined,
                        }}
                        onMouseEnter={(e) => {
                          if (!isCancelled) {
                            e.currentTarget.style.backgroundColor = colors.dark;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isCancelled) {
                            e.currentTarget.style.backgroundColor = colors.primary;
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(classItem);
                        }}
                        title={getClassDisplayName(classItem)}
                      >
                        <span>{formatTime(new Date(classItem.start_time))} {getClassDisplayName(classItem)}</span>
                        {formatProgramCodeDisplay(classItem.class_code, classItem.lesson_number) && (
                          <div className="truncate text-white/90 text-[10px] mt-0.5 font-medium">
                            {formatProgramCodeDisplay(classItem.class_code, classItem.lesson_number)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {dayClasses.length > 2 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setView('day');
                        setCurrentDate(new Date(day));
                        setSelectedDate(day);
                      }}
                      className="text-xs text-primary font-medium hover:underline cursor-pointer mt-0.5 w-full text-left"
                      title={t('calendar.viewAllOnDay', { count: dayClasses.length })}
                    >
                      +{dayClasses.length - 2} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const filteredClasses = getFilteredClasses();

  const distinctClassNames = useMemo(() => {
    const names = new Set<string>();
    classes.forEach(c => {
      const n = (getClassDisplayName(c) || '').trim();
      if (n) names.add(n);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [classes]);

  const distinctLocations = useMemo((): LocationFilter[] => {
    const locs = new Set<NonNullable<Class['location']>>();
    classes.forEach(c => { if (c.location) locs.add(c.location); });
    const order: LocationFilter[] = ['all', 'sanpokong', 'causewaybay', 'fotan', 'sheungshui'];
    return order.filter(l => l === 'all' || locs.has(l));
  }, [classes]);

  const getTagTypeLabel = (typeCode: string): string => {
    const tt = tagTypes.find((row) => row.code === typeCode);
    return tt ? localizeTagLabel(tt, i18n.language || 'zh-TW') : typeCode;
  };

  const getTagValueLabel = (typeCode: string, value: string | null | undefined): string => {
    if (!value) return '-';
    const opt = (classTagsByType[typeCode] ?? []).find((row) => row.code === value);
    return opt ? localizeTagLabel(opt, i18n.language || 'zh-TW') : value;
  };

  const sortedClasses = useMemo(() => {
    const list = [...filteredClasses];
    list.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    return list;
  }, [filteredClasses]);

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
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.classes.title')}</h1>
          <button
            onClick={openCreateModal}
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            {t('admin.classes.createClass')}
          </button>
        </div>
        <p className="text-sm text-gray-500">{t('admin.classes.recurringAvoidsHolidaysNote')}</p>

        {/* Calendar View */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => { setView('day'); setCurrentDate(new Date()); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === 'day' && currentDate.toDateString() === new Date().toDateString()
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('admin.classes.filterToday', '今日')}
              </button>
              <button
                onClick={() => { setView('week'); setCurrentDate(new Date()); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === 'week'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('admin.classes.filterThisWeek', '本週')}
              </button>
              <span className="text-gray-400 hidden sm:inline">|</span>
              <button
                onClick={() => setView('day')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === 'day'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('admin.classes.day')}
              </button>
              {/* Show 3 Days only on mobile */}
              <button
                onClick={() => setView('threeDay')}
                className={`md:hidden px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === 'threeDay'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('calendar.threeDay')}
              </button>
              {/* Hide week and month on mobile */}
              <button
                onClick={() => setView('week')}
                className={`hidden md:block px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === 'week'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('admin.classes.week')}
              </button>
              <button
                onClick={() => setView('month')}
                className={`hidden md:block px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === 'month'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('admin.classes.month')}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-gray-900">
                {view === 'month' 
                  ? formatDate(currentDate) 
                  : view === 'week'
                  ? formatWeekRange(currentDate)
                  : view === 'threeDay'
                  ? (() => {
                      const day1 = new Date(currentDate);
                      const day3 = new Date(currentDate);
                      day3.setDate(currentDate.getDate() + 2);
                      return `${day1.toLocaleDateString(getLocale(), { month: 'short', day: 'numeric' })} - ${day3.toLocaleDateString(getLocale(), { month: 'short', day: 'numeric', year: 'numeric' })}`;
                    })()
                  : formatDay(currentDate)}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={goToToday}
                className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary-lighter rounded-md transition-colors"
              >
                {t('admin.classes.today')}
              </button>
              <button
                onClick={() => navigateDate('next')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          {view === 'day' && renderDayView()}
          {view === 'threeDay' && renderThreeDayView()}
          {view === 'week' && renderWeekView()}
          {view === 'month' && renderMonthView()}
        </div>

        {/* Filters: Class name & Location dropdowns (below calendar, options from existing data) */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3 mb-3">
            <Filter className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">{t('admin.classes.filters')}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="filter-class-name" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                {t('admin.classes.filterByClassName')}:
              </label>
              <select
                id="filter-class-name"
                value={classNameFilter}
                onChange={(e) => setClassNameFilter(e.target.value)}
                className="min-w-[12rem] px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-primary focus:border-primary"
              >
                <option value="">{t('admin.classes.allClassNames')}</option>
                {distinctClassNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="filter-location" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                {t('admin.classes.filterByLocation')}:
              </label>
              <select
                id="filter-location"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value as LocationFilter)}
                className="min-w-[10rem] px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-primary focus:border-primary"
              >
                {distinctLocations.map((loc) => (
                  <option key={loc} value={loc}>{getLocationFilterOptionLabel(loc)}</option>
                ))}
              </select>
            </div>
            <label htmlFor="filter-show-expired" className="flex items-center gap-2 cursor-pointer">
              <input
                id="filter-show-expired"
                type="checkbox"
                checked={showExpiredClasses}
                onChange={(e) => setShowExpiredClasses(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                {t('admin.classes.showExpiredClasses')}
              </span>
            </label>
          </div>
        </div>

        {/* Selected Date Info and Clear Button */}
        {(selectedDate || locationFilter !== 'all' || classNameFilter) && (
          <div className="flex justify-between items-center bg-primary-lighter p-4 rounded-lg">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedDate 
                  ? `${t('admin.classes.classesFor')} ${formatDateLong(selectedDate)}`
                  : t('admin.classes.allClasses')}
                {locationFilter !== 'all' && ` ${t('admin.classes.at')} ${getLocationLabel(locationFilter)}`}
                {classNameFilter && ` · ${classNameFilter}`}
              </h3>
              <p className="text-sm text-gray-600">
                {filteredClasses.length} {filteredClasses.length === 1 ? t('admin.classes.class') : t('admin.classes.classes')} {t('admin.classes.scheduled')}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {classNameFilter && (
                <button
                  onClick={() => setClassNameFilter('')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 rounded-md transition-colors"
                >
                  {t('admin.classes.clearClassNameFilter')}
                </button>
              )}
              {locationFilter !== 'all' && (
                <button
                  onClick={() => setLocationFilter('all')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 rounded-md transition-colors"
                >
                  {t('admin.classes.clearLocationFilter')}
                </button>
              )}
              {selectedDate && (
                <button
                  onClick={clearDateSelection}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 rounded-md transition-colors"
                >
                  {t('admin.classes.showAllClasses')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Classes List */}
        <div className="grid gap-4">
          {filteredClasses.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-gray-600 text-center py-8">
                {selectedDate 
                  ? `${t('admin.classes.noClassesScheduled')} ${formatDateLong(selectedDate)}${locationFilter !== 'all' ? ` ${t('admin.classes.at')} ${getLocationLabel(locationFilter)}` : ''}`
                  : locationFilter !== 'all'
                  ? `${t('admin.classes.noClassesFoundAt')} ${getLocationLabel(locationFilter)}`
                  : t('admin.classes.noClassesFound')}
              </p>
            </div>
          ) : (
            sortedClasses.map((classItem) => (
            <div
              key={classItem.id}
              className={`bg-white rounded-lg shadow-md p-6 ${
                classItem.is_cancelled ? 'opacity-50' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="text-xl font-semibold text-gray-900">{getClassDisplayName(classItem)}</h3>
                    {!classItem.attendance_confirmed && (
                      <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded">
                        {t('admin.classes.attendanceNotConfirmed')}
                      </span>
                    )}
                    {classItem.is_internal && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        補課
                      </span>
                    )}
                    {classItem.is_cancelled && (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                        {t('admin.classes.cancelled')}
                      </span>
                    )}
                  </div>
                  {formatProgramCodeDisplay(classItem.class_code, classItem.lesson_number) && (
                    <p className="text-gray-600 mb-1 text-sm font-medium">{formatProgramCodeDisplay(classItem.class_code, classItem.lesson_number)}</p>
                  )}
                  <p className="text-gray-600 mb-1">{classItem.instructor}</p>
                  {classItem.substitute_instructor && (
                    <p className="text-gray-500 mb-1 text-sm">{t('admin.classes.substituteShort')}: {classItem.substitute_instructor}</p>
                  )}
                  <div className="flex items-center text-sm text-gray-600 mb-1">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDateTimeRange(classItem.start_time, classItem.end_time, getLocale())}
                  </div>
                  {classItem.location && (
                    <div className="flex items-center text-sm text-gray-600 mb-1">
                      <MapPin className="h-4 w-4 mr-1" />
                      {getLocationLabel(classItem.location)}
                    </div>
                  )}
                  <p className="text-sm text-gray-600">
                    {renderEnrollmentCountSummary(classItem)}
                  </p>
                  {dynamicTagTypes.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {dynamicTagTypes.map((tt) => (
                        <p key={tt.code} className="text-sm text-gray-600">
                          <span className="font-medium text-gray-700">{getTagTypeLabel(tt.code)}:</span>{' '}
                          {getTagValueLabel(tt.code, classItem.tag_values?.[tt.code])}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleAttendance(String(classItem.id)); }}
                    className={`px-4 py-2 rounded-md text-sm font-medium flex items-center ${
                      String(expandedAttendanceClassId) === String(classItem.id)
                        ? 'bg-purple-200 text-purple-800 ring-2 ring-purple-400'
                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    }`}
                  >
                    <Users className="h-4 w-4 mr-1" />
                    {t('admin.classes.attendance')}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(classItem)}
                    className="px-4 py-2 rounded-md text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    {t('common.edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => openDeleteDialog(classItem)}
                    className="px-4 py-2 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 flex items-center"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {t('common.delete')}
                  </button>
                </div>
              </div>
              {String(expandedAttendanceClassId) === String(classItem.id) && (
                attendanceLoading ? (
                  <div className="mt-4 pt-4 border-t border-gray-200 flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : (
                  attendanceData &&
                  String(attendanceData.class.id) === String(classItem.id) && (
                    <ClassAttendancePanel
                      class={attendanceData.class}
                      enrollments={attendanceData.enrollments}
                      onUpdateStatus={updateAttendanceStatus}
                      onToggleConfirmation={toggleAttendanceConfirmation}
                      onCancelClass={() => handleCancelClass(classItem.id)}
                      onReassign={() => { if (classItem?.id) navigate(`/admin/classes/${String(classItem.id)}/reassign`); }}
                      onRefundToken={handleRefundToken}
                      onMarkMultipleAttended={handleMarkMultipleAttended}
                      onClose={() => setExpandedAttendanceClassId(null)}
                      inline
                    />
                  )
                )
              )}
            </div>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onMouseDown={(e) => {
            backdropMouseDownRef.current = e.target === e.currentTarget;
          }}
          onClick={(e) => {
            if (backdropMouseDownRef.current && e.target === e.currentTarget) {
              setShowModal(false);
            }
            backdropMouseDownRef.current = false;
          }}
        >
          <div className="bg-white rounded-lg max-w-md w-full mx-4 flex flex-col max-h-[90vh]">
            <div className="px-6 pt-6 pb-4 flex-shrink-0 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingClass ? t('admin.classes.editClass') : t('admin.classes.createClass')}
              </h2>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4">
              {editingClass && findRepeatedClasses(editingClass).length > 0 && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-700 mb-3">
                    {t('admin.classes.repeatClassDetected', { count: findRepeatedClasses(editingClass).length })}
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="editMode"
                        checked={!editAllRepeats}
                        onChange={() => setEditAllRepeats(false)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">{t('admin.classes.editSingleClass')}</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="editMode"
                        checked={editAllRepeats}
                        onChange={() => setEditAllRepeats(true)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {t('admin.classes.editAllRepeats', { count: findRepeatedClasses(editingClass).length + 1 })}
                      </span>
                    </label>
                  </div>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4" id="class-form">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">繁體中文</label>
                <input
                  type="text"
                  value={form.name_zh_tw}
                  onChange={(e) => setForm({ ...form, name_zh_tw: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={t('admin.classes.classNamePlaceholder', '例如：兒童芭蕾 A')}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">简体中文</label>
                <input
                  type="text"
                  value={form.name_zh_cn}
                  onChange={(e) => setForm({ ...form, name_zh_cn: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="例如：儿童芭蕾 A"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">English</label>
                <input
                  type="text"
                  value={form.name_en}
                  onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Kids Ballet A"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.classes.classCode')}</label>
                <input
                  type="text"
                  required
                  value={form.class_code}
                  onChange={(e) => setForm({ ...form, class_code: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={t('admin.classes.classCodePlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.classes.instructor')}</label>
                <select
                  required
                  value={form.instructor}
                  onChange={(e) => setForm({ ...form, instructor: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">{t('admin.classes.selectInstructor')}</option>
                  {instructors.map((instructor) => (
                    <option key={instructor.id} value={instructor.name}>
                      {instructor.name}
                    </option>
                  ))}
                </select>
              </div>
              {editingClass && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.classes.substituteInstructor')}</label>
                  <select
                    value={form.substitute_instructor}
                    onChange={(e) => setForm({ ...form, substitute_instructor: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">{t('admin.classes.noSubstitute')}</option>
                    {instructors.map((inst) => (
                      <option key={inst.id} value={inst.name}>{inst.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {formTagTypes.map((tt) => {
                const options = classTagsByType[tt.code] ?? [];
                return (
                  <div key={tt.code}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{getTagTypeLabel(tt.code)}</label>
                    <select
                      required={tt.code === 'level' || tt.code === 'age'}
                      value={form.tag_values?.[tt.code] ?? ''}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          level: tt.code === 'level' ? (e.target.value as CourseLevel) : prev.level,
                          ...(tt.code === 'age'
                            ? (() => {
                                const parsed = parseAgeRange(e.target.value);
                                return { lowest_age: parsed.lowest, oldest_age: parsed.oldest };
                              })()
                            : {}),
                          tag_values: {
                            ...(prev.tag_values ?? {}),
                            [tt.code]: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">-</option>
                      {options.map((opt) => (
                        <option key={String(opt.id)} value={opt.code}>
                          {localizeTagLabel(opt, i18n.language || 'zh-TW')}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.classes.firstLessonDate')}</label>
                <DateSelect
                  required
                  value={form.date}
                  onChange={(v) => setForm({ ...form, date: v })}
                  className="w-full min-h-[48px] text-base touch-manipulation"
                  ariaLabel={t('admin.classes.firstLessonDate')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.classes.startTime')}</label>
                <div className="flex gap-3 items-center">
                  <select
                    required
                    value={parseTimeToHourMin(form.start_time).hour}
                    onChange={(e) => setStartTime(e.target.value, parseTimeToHourMin(form.start_time).minute)}
                    className="flex-1 min-h-[48px] px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary touch-manipulation bg-white"
                    style={{ minHeight: '48px' }}
                    aria-label={t('admin.classes.startTime')}
                  >
                    {TIME_HOURS.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <span className="text-gray-500 font-medium">:</span>
                  <select
                    required
                    value={parseTimeToHourMin(form.start_time).minute}
                    onChange={(e) => setStartTime(parseTimeToHourMin(form.start_time).hour, e.target.value)}
                    className="flex-1 min-h-[48px] px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary touch-manipulation bg-white"
                    style={{ minHeight: '48px' }}
                    aria-label={t('admin.classes.minute')}
                  >
                    {TIME_MINUTES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.classes.endTime')}</label>
                <div className="flex gap-3 items-center">
                  <select
                    required
                    value={parseTimeToHourMin(form.end_time).hour}
                    onChange={(e) => setEndTime(e.target.value, parseTimeToHourMin(form.end_time).minute)}
                    className="flex-1 min-h-[48px] px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary touch-manipulation bg-white"
                    style={{ minHeight: '48px' }}
                    aria-label={t('admin.classes.endTime')}
                  >
                    {TIME_HOURS.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <span className="text-gray-500 font-medium">:</span>
                  <select
                    required
                    value={parseTimeToHourMin(form.end_time).minute}
                    onChange={(e) => setEndTime(parseTimeToHourMin(form.end_time).hour, e.target.value)}
                    className="flex-1 min-h-[48px] px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary touch-manipulation bg-white"
                    style={{ minHeight: '48px' }}
                    aria-label={t('admin.classes.minute')}
                  >
                    {TIME_MINUTES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.classes.capacity')}</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.classes.location')}</label>
                <select
                  required
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value as 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui' })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="sanpokong">{getLocationLabel('sanpokong')}</option>
                  <option value="causewaybay">{getLocationLabel('causewaybay')}</option>
                  <option value="fotan">{getLocationLabel('fotan')}</option>
                  <option value="sheungshui">{getLocationLabel('sheungshui')}</option>
                </select>
              </div>
              {!editingClass && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="repeat_weekly"
                    checked={!!form.repeat_weekly}
                    onChange={(e) => setForm((prev) => ({ ...prev, repeat_weekly: e.target.checked }))}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <label htmlFor="repeat_weekly" className="ml-2 text-sm text-gray-700">
                    {t('admin.classes.repeatWeekly')}
                  </label>
                </div>
              )}
              {!!form.repeat_weekly && !editingClass && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.classes.totalLessons')}</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    required={!!form.repeat_weekly}
                    value={Number.isFinite(Number(form.total_lessons)) ? Number(form.total_lessons) : 1}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        total_lessons: Math.max(1, Math.min(99, parseInt(e.target.value, 10) || 1)),
                      }))
                    }
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {recurringLastLessonDate && (
                    <p className="mt-2 text-xs text-gray-600">
                      {t('admin.classes.lastLessonPreview', {
                        date: recurringLastLessonDate.toLocaleDateString(getLocale(), {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        }),
                      })}
                    </p>
                  )}
                </div>
              )}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_internal"
                  checked={form.is_internal}
                  onChange={(e) => setForm({ ...form, is_internal: e.target.checked })}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="is_internal" className="ml-2 text-sm text-gray-700">
                  {t('admin.classes.internalCourse')}
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allow_trial"
                  checked={form.allow_trial}
                  onChange={(e) => setForm({ ...form, allow_trial: e.target.checked })}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="allow_trial" className="ml-2 text-sm text-gray-700">
                  {t('admin.classes.allowTrial')}
                </label>
              </div>
            </form>
            </div>
            <div className="px-6 py-4 flex-shrink-0 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                    setShowModal(false);
                    setEditingClass(null);
                    setEditAllRepeats(false);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  form="class-form"
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                >
                  {editingClass ? t('common.update') : t('common.create')}
                </button>
              </div>
          </div>
        </div>
      )}

      {deleteTargetClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              {t('admin.classes.deleteDialogTitle', 'Delete Class')}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {t('admin.classes.deleteDialogPrompt', 'Choose what to delete:')}
            </p>
            <div className="space-y-2 mb-6">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="deleteMode"
                  checked={deleteMode === 'single'}
                  onChange={() => setDeleteMode('single')}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">{t('admin.classes.deleteSingle')}</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="deleteMode"
                  checked={deleteMode === 'series'}
                  onChange={() => setDeleteMode('series')}
                  disabled={findRepeatedClasses(deleteTargetClass).length === 0}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 disabled:opacity-60"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {t('admin.classes.deleteSeriesWithCount', {
                    count: findRepeatedClasses(deleteTargetClass).length + 1,
                    defaultValue: `Delete related series (${findRepeatedClasses(deleteTargetClass).length + 1})`,
                  })}
                </span>
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTargetClass(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = deleteTargetClass;
                  setDeleteTargetClass(null);
                  if (!target) return;
                  await handleDeleteClass(target, deleteMode === 'series');
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
