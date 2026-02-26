import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import ClassAttendancePanel, { type ClassWithAttendance, type Enrollment } from '../../components/ClassAttendancePanel';
import { formatDateTime, shouldPostponeClassWithHolidays, formatProgramCodeDisplay } from '../../lib/utils';
import { api } from '../../lib/api';
import { useHolidays } from '../../lib/useHolidays';
import { Plus, Calendar, ChevronLeft, ChevronRight, Filter, MapPin, Edit, Users } from 'lucide-react';
import DateSelect from '../../components/DateSelect';
import { type CourseLevel, type AgeTag, useAuth } from '../../contexts/AuthContext';
import { getFallbackClassesForAdmin } from '../../lib/demoCourses';

interface Class {
  id: string;
  name: string;
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
  location?: 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui';
  level?: CourseLevel;
  age_tag?: AgeTag;
  /** 若因假期順延，原訂日期 (YYYY-MM-DD) */
  postponed_from?: string | null;
}

interface Instructor {
  id: string;
  name: string;
  profile_image_url: string | null;
  created_at: string;
}

type LocationFilter = 'all' | 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui';

/** Fallback demo: 與主頁/日曆一致，用共用 demo 課程 */
const FALLBACK_CLASSES: Class[] = getFallbackClassesForAdmin();
const FALLBACK_INSTRUCTORS: Instructor[] = [
  { id: 'inst_1', name: '李老師', profile_image_url: null, created_at: new Date().toISOString() },
  { id: 'inst_2', name: '陳老師', profile_image_url: null, created_at: new Date().toISOString() },
  { id: 'inst_3', name: '王老師', profile_image_url: null, created_at: new Date().toISOString() },
  { id: 'inst_4', name: '張老師', profile_image_url: null, created_at: new Date().toISOString() },
  { id: 'inst_5', name: '黃老師', profile_image_url: null, created_at: new Date().toISOString() },
  { id: 'inst_6', name: '林老師', profile_image_url: null, created_at: new Date().toISOString() },
];

/** Demo enrollments for attendance list when API returns no data */
function getFallbackEnrollments(classId: string, enrolledCount: number): Enrollment[] {
  const now = new Date();
  const created = now.toISOString().slice(0, 10);
  const demoStudents: { name: string; mobile: string }[] = [
    { name: '陳小明', mobile: '85291234567' },
    { name: '李美儀', mobile: '85292345678' },
    { name: '黃家豪', mobile: '85293456789' },
    { name: '張心怡', mobile: '85294567890' },
    { name: '王俊傑', mobile: '85295678901' },
    { name: '林曉晴', mobile: '85296789012' },
    { name: '劉子軒', mobile: '85297890123' },
    { name: '何思敏', mobile: '85298901234' },
  ];
  const statuses: Enrollment['status'][] = ['attended', 'attended', 'enrolled', 'absent', 'sick_leave'];
  const count = Math.min(Math.max(enrolledCount, 1), demoStudents.length);
  return Array.from({ length: count }, (_, i) => {
    const s = demoStudents[i];
    const status = statuses[i % statuses.length];
    const checkIn = status === 'attended' ? '14:00' : null;
    const checkOut = status === 'attended' ? '15:00' : null;
    return {
      id: `enr_demo_${classId}_${i + 1}`,
      class_id: classId,
      user_id: `user_demo_${i + 1}`,
      user_name: s.name,
      user_mobile: s.mobile,
      status,
      check_in_time: checkIn,
      check_out_time: checkOut,
      sick_leave_document_url: null,
      created_at: `${created}T00:00:00.000Z`,
    };
  });
}

type ViewType = 'month' | 'week' | 'day' | 'threeDay';

export default function ClassesPage() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { getHolidayName, holidayDatesSet } = useHolidays();
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
  const [form, setForm] = useState({
    name: '',
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
    age_tag: '5-8' as AgeTag,
    repeat_weekly: false,
    total_lessons: 8,
  });
  const [expandedAttendanceClassId, setExpandedAttendanceClassId] = useState<string | null>(null);
  const [attendanceData, setAttendanceData] = useState<{
    class: ClassWithAttendance;
    enrollments: Enrollment[];
  } | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  useEffect(() => {
    loadClasses();
    loadInstructors();
  }, []);

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
      const response = await api.get<Class[]>('/admin/classes?demo=1').catch(() => ({ success: true, data: FALLBACK_CLASSES }));
      if (response.success && response.data) {
        const transformedClasses: Class[] = response.data.map((cls: any) => ({
          id: cls.id?.toString() ?? cls.id,
          name: cls.name,
          class_code: cls.program_code ?? cls.class_code ?? '',
          lesson_number: cls.lesson_number != null ? Number(cls.lesson_number) : null,
          instructor: cls.instructor || '',
          substitute_instructor: cls.substitute_instructor ?? null,
          start_time: cls.start_time,
          end_time: cls.end_time,
          capacity: cls.capacity ?? 10,
          enrolled_count: cls.enrolled_count ?? 0,
          is_internal: cls.is_internal === 1 || cls.is_internal === true,
          is_cancelled: cls.is_cancelled === 1 || cls.is_cancelled === true,
          location: cls.location,
          level: cls.level,
          age_tag: cls.age_group ?? cls.age_tag,
          postponed_from: cls.postponed_from ?? null,
        }));
        setClasses(transformedClasses);
      } else {
        setClasses(FALLBACK_CLASSES);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      setClasses(FALLBACK_CLASSES);
    } finally {
      setLoading(false);
    }
  }

  async function loadInstructors() {
    try {
      const response = await api.get<{ id: string; name: string; profile_image_url: string | null; created_at: string }[]>('admin/instructors?demo=1').catch(() => ({ success: true, data: FALLBACK_INSTRUCTORS }));
      if (response.success && Array.isArray(response.data)) {
        setInstructors(response.data.map((inst: any) => ({
          id: String(inst.id),
          name: inst.name || '',
          profile_image_url: inst.profile_image_url ?? null,
          created_at: inst.created_at || new Date().toISOString(),
        })));
      } else {
        setInstructors(FALLBACK_INSTRUCTORS);
      }
    } catch (error) {
      console.error('Error loading instructors:', error);
      setInstructors(FALLBACK_INSTRUCTORS);
    }
  }

  async function loadAttendanceData(
    classId: string
  ): Promise<{ class: ClassWithAttendance; enrollments: Enrollment[] } | null> {
    const c = classes.find((x) => String(x.id) === String(classId));
    if (!c) return null;
    const classWithAttendance: ClassWithAttendance = { ...c, id: String(c.id), attendance_confirmed: false };
    try {
      const res = await api.get<any[]>(`/admin/classes/${classId}/enrollments`);
      const list = res.success && Array.isArray(res.data) ? res.data : [];
      const enrollments: Enrollment[] = list.length > 0
        ? list.map((e: any) => ({
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
          }))
        : getFallbackEnrollments(classId, c.enrolled_count);
      return { class: classWithAttendance, enrollments };
    } catch {
      return { class: classWithAttendance, enrollments: getFallbackEnrollments(classId, c.enrolled_count) };
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
    setAttendanceData((prev) =>
      prev ? { ...prev, class: { ...prev.class, attendance_confirmed: !prev.class.attendance_confirmed } } : prev
    );
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
    // Find all classes that are part of the same repeat series
    // Criteria: same name, class_code, instructor, location, and is_internal
    return classes.filter(c => 
      c.id !== classItem.id &&
      c.name === classItem.name &&
      c.class_code === classItem.class_code &&
      c.instructor === classItem.instructor &&
      c.location === classItem.location &&
      c.is_internal === classItem.is_internal
    );
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
    setEditAllRepeats(false);
    setForm({
      name: classItem.name,
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
      age_tag: classItem.age_tag || '5-8',
      repeat_weekly: false,
      total_lessons: 8,
    });
    setShowModal(true);
  }

  function openCreateModal() {
    setEditingClass(null);
    const today = new Date().toISOString().slice(0, 10);
    setForm({
      name: '',
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
      age_tag: '5-8',
      repeat_weekly: false,
      total_lessons: 8,
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // If editing, update the existing class(es)
    if (editingClass) {
      const isNumericId = (id: string | number) => /^[1-9][0-9]*$/.test(String(id));
      if (!isNumericId(editingClass.id)) {
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
            .filter((c) => isNumericId(c.id))
            .map(async (c) => {
            // Calculate new times for this class
            const classStart = new Date(c.start_time);
            const newClassStart = new Date(classStart.getTime() + timeDiff);
            const newClassEnd = new Date(newClassStart.getTime() + duration);
            
            const updateData = {
              name: form.name,
              program_code: form.class_code,
              instructor: form.instructor,
              substitute_instructor: form.substitute_instructor || null,
              start_time: formatDateAsLocalDateTime(newClassStart),
              end_time: formatDateAsLocalDateTime(newClassEnd),
              capacity: form.capacity,
              is_internal: form.is_internal ? 1 : 0,
              location: form.location,
              level: form.level,
              age_group: form.age_tag,
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
          const updateData = {
            name: form.name,
            program_code: form.class_code,
            instructor: form.instructor,
            substitute_instructor: form.substitute_instructor || null,
            start_time: startISO,
            end_time: endISO,
            capacity: form.capacity,
            is_internal: form.is_internal ? 1 : 0,
            location: form.location,
            level: form.level,
            age_group: form.age_tag,
          };
          
          const response = await api.patch(`/admin/classes/${editingClass.id}`, updateData);
          
          if (response.success && response.data) {
            // Transform API response to match frontend Class interface
            const updatedClass: Class = {
              id: response.data.id.toString(),
              name: response.data.name,
              class_code: response.data.program_code || '',
              instructor: response.data.instructor || '',
              substitute_instructor: response.data.substitute_instructor || null,
              start_time: response.data.start_time,
              end_time: response.data.end_time,
              capacity: response.data.capacity,
              enrolled_count: response.data.enrolled_count || 0,
              is_internal: response.data.is_internal === 1 || response.data.is_internal === true,
              is_cancelled: response.data.is_cancelled === 1 || response.data.is_cancelled === true,
              location: response.data.location,
              level: response.data.level,
              age_tag: response.data.age_group as AgeTag,
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
          age_tag: '5-8',
          repeat_weekly: false,
          total_lessons: 8,
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
        const res = await api.post<{ id: string; name: string; program_code?: string; instructor: string; start_time: string; end_time: string; capacity: number; enrolled_count: number; is_internal: number; is_cancelled: number; location?: string; level?: string; age_group?: string }[]>('admin/classes/recurring', {
          first_date: firstDate,
          start_time: startTimeOfDay,
          end_time: endTimeOfDay,
          number_of_lessons: total,
          name: form.name,
          instructor: form.instructor,
          capacity: form.capacity,
          location: form.location,
          program_code: form.class_code || undefined,
          level: form.level,
          age_group: form.age_tag,
          is_internal: form.is_internal ? 1 : 0,
        });
        const data = res.data ?? [];
        for (const c of data) {
          createdClasses.push({
            id: String(c.id),
            name: c.name,
            class_code: c.program_code || '',
            lesson_number: c.lesson_number != null ? Number(c.lesson_number) : null,
            instructor: c.instructor,
            substitute_instructor: null,
            start_time: c.start_time,
            end_time: c.end_time,
            capacity: c.capacity,
            enrolled_count: c.enrolled_count || 0,
            is_internal: c.is_internal === 1,
            is_cancelled: c.is_cancelled === 1,
            location: c.location,
            level: (c.level as CourseLevel) || 'entry',
            age_tag: (c.age_group as AgeTag) || '5-8',
          });
        }
        newClasses.push(...createdClasses);
        await loadClasses();
        setShowModal(false);
        setEditingClass(null);
        const today = new Date().toISOString().slice(0, 10);
        setForm({
          name: '',
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
          age_tag: '5-8',
          repeat_weekly: false,
          total_lessons: 8,
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
      const classData = {
        name: form.name,
        instructor: form.instructor,
        date: adjustedDateStr,
        start_time: adjustedStartTimeStr,
        end_time: adjustedEndTimeStr,
        capacity: form.capacity,
        location: form.location,
        program_code: form.class_code,
        level: form.level,
        age_group: form.age_tag,
        is_internal: form.is_internal ? 1 : 0,
        repeat_weekly: 0,
      };

      try {
        // Create class via API (API builds full start_time/end_time from date + time)
        const response = await api.post('/admin/classes', classData);
        if (response.success && response.data) {
          const createdClass: Class = {
            id: response.data.id.toString(),
            name: response.data.name,
            class_code: response.data.program_code || '',
            instructor: response.data.instructor || '',
            substitute_instructor: null,
            start_time: response.data.start_time,
            end_time: response.data.end_time,
            capacity: response.data.capacity,
            enrolled_count: response.data.enrolled_count || 0,
            is_internal: response.data.is_internal === 1 || response.data.is_internal === true,
            is_cancelled: response.data.is_cancelled === 1 || response.data.is_cancelled === true,
            location: response.data.location,
            level: response.data.level,
            age_tag: response.data.age_group as AgeTag,
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
      age_tag: '5-8',
      repeat_weekly: false,
      total_lessons: 8,
    });
  }

  async function toggleCancel(classId: string, currentStatus: boolean) {
    try {
      const updateData = {
        is_cancelled: !currentStatus ? 1 : 0,
      };
      
      const response = await api.patch(`/admin/classes/${classId}`, updateData);
      
      if (response.success && response.data) {
        // Transform API response to match frontend Class interface
        const updatedClass: Class = {
          id: response.data.id.toString(),
          name: response.data.name,
          class_code: response.data.program_code || '',
          instructor: response.data.instructor || '',
          substitute_instructor: response.data.substitute_instructor || null,
          start_time: response.data.start_time,
          end_time: response.data.end_time,
          capacity: response.data.capacity,
          enrolled_count: response.data.enrolled_count || 0,
          is_internal: response.data.is_internal === 1 || response.data.is_internal === true,
          is_cancelled: response.data.is_cancelled === 1 || response.data.is_cancelled === true,
          location: response.data.location,
          level: response.data.level,
          age_tag: response.data.age_group as AgeTag,
        };
        
        setClasses(classes.map(c => 
          c.id === classId ? updatedClass : c
        ));
        
        // Update attendance data if it's currently expanded
        if (attendanceData && attendanceData.class.id === classId) {
          setAttendanceData({
            ...attendanceData,
            class: { ...attendanceData.class, is_cancelled: updatedClass.is_cancelled },
          });
        }
      } else {
        throw new Error(response.msg || 'Failed to update class');
      }
    } catch (error) {
      console.error('Error toggling cancel status:', error);
      alert(error instanceof Error ? error.message : 'Failed to update class status');
    }
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

    // Filter by selected date
    if (selectedDate) {
      filtered = filtered.filter(classItem => {
        const classDate = new Date(classItem.start_time);
        const year = classDate.getFullYear();
        const month = classDate.getMonth();
        const day = classDate.getDate();
        const classDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        const selectedYear = selectedDate.getFullYear();
        const selectedMonth = selectedDate.getMonth();
        const selectedDay = selectedDate.getDate();
        const selectedDateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
        
        return classDateStr === selectedDateStr;
      });
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
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{classItem.name}</h3>
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
                      {formatDateTime(classItem.start_time, getLocale())} - {formatDateTime(classItem.end_time, getLocale())}
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
                      {t('admin.classes.enrolled')}: {classItem.enrolled_count} / {classItem.capacity}
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
                      onClick={() => toggleCancel(classItem.id, classItem.is_cancelled)}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        classItem.is_cancelled
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      {classItem.is_cancelled ? t('admin.classes.restore') : t('admin.classes.cancel')}
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
                        onReassign={() => navigate(`/admin/classes/${classItem.id}/reassign`)}
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
                      title={classItem.name}
                    >
                      <div className="font-medium truncate">{classItem.name}</div>
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
                        title={classItem.name}
                      >
                        <div className="font-medium truncate">{classItem.name}</div>
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
                        title={classItem.name}
                      >
                        <span>{formatTime(new Date(classItem.start_time))} {classItem.name}</span>
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

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  const filteredClasses = getFilteredClasses();

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

        {/* Location Filter */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3 mb-3">
            <Filter className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">{t('admin.classes.filterByLocation')}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'sanpokong', 'causewaybay', 'fotan', 'sheungshui'] as LocationFilter[]).map((loc) => {
              const isActive = locationFilter === loc;
              
              return (
                <button
                  key={loc}
                  onClick={() => setLocationFilter(loc)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {getLocationLabel(loc)}
                </button>
              );
            })}
          </div>
        </div>

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

        {/* Selected Date Info and Clear Button */}
        {(selectedDate || locationFilter !== 'all') && (
          <div className="flex justify-between items-center bg-primary-lighter p-4 rounded-lg">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedDate 
                  ? `${t('admin.classes.classesFor')} ${formatDateLong(selectedDate)}`
                  : t('admin.classes.allClasses')}
                {locationFilter !== 'all' && ` ${t('admin.classes.at')} ${getLocationLabel(locationFilter)}`}
              </h3>
              <p className="text-sm text-gray-600">
                {filteredClasses.length} {filteredClasses.length === 1 ? t('admin.classes.class') : t('admin.classes.classes')} {t('admin.classes.scheduled')}
              </p>
            </div>
            <div className="flex gap-2">
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
            filteredClasses.map((classItem) => (
            <div
              key={classItem.id}
              className={`bg-white rounded-lg shadow-md p-6 ${
                classItem.is_cancelled ? 'opacity-50' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{classItem.name}</h3>
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
                    {formatDateTime(classItem.start_time, getLocale())} - {formatDateTime(classItem.end_time, getLocale())}
                  </div>
                  {classItem.location && (
                    <div className="flex items-center text-sm text-gray-600 mb-1">
                      <MapPin className="h-4 w-4 mr-1" />
                      {getLocationLabel(classItem.location)}
                    </div>
                  )}
                  <p className="text-sm text-gray-600">
                    {t('admin.classes.enrolled')}: {classItem.enrolled_count} / {classItem.capacity}
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
                    onClick={() => toggleCancel(classItem.id, classItem.is_cancelled)}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      classItem.is_cancelled
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    {classItem.is_cancelled ? t('admin.classes.restore') : t('admin.classes.cancel')}
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
                      onReassign={() => navigate(`/admin/classes/${classItem.id}/reassign`)}
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
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
            }
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.classes.className')}</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
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
                  <p className="text-xs text-gray-500 mt-1">{t('admin.classes.substituteInstructorHint')}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.classes.level')}</label>
                <select
                  required
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value as CourseLevel })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="entry">{t('admin.classes.entryLevel')}</option>
                  <option value="intermediate">{t('admin.classes.intermediateLevel')}</option>
                  <option value="advanced">{t('admin.classes.advancedLevel')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.classes.ageTag')}</label>
                <select
                  required
                  value={form.age_tag}
                  onChange={(e) => setForm({ ...form, age_tag: e.target.value as AgeTag })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="5-8">{t('calendar.ageTag.5-8')}</option>
                  <option value="9-12">{t('calendar.ageTag.9-12')}</option>
                  <option value="13-16">{t('calendar.ageTag.13-16')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.classes.firstLessonDate')}</label>
                <DateSelect
                  required
                  value={form.date}
                  onChange={(v) => setForm({ ...form, date: v })}
                  className="w-full min-h-[48px] text-base touch-manipulation"
                  ariaLabel={t('admin.classes.firstLessonDate')}
                />
                <p className="text-xs text-gray-500 mt-1">{t('admin.classes.firstLessonDateHint')}</p>
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
                <p className="text-xs text-gray-500 mt-1">{t('admin.classes.startTimeHint')}</p>
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
                <p className="text-xs text-gray-500 mt-1">{t('admin.classes.endTimeHint')}</p>
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
                    checked={form.repeat_weekly}
                    onChange={(e) => setForm({ ...form, repeat_weekly: e.target.checked })}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <label htmlFor="repeat_weekly" className="ml-2 text-sm text-gray-700">
                    {t('admin.classes.repeatWeekly')}
                  </label>
                </div>
              )}
              {form.repeat_weekly && !editingClass && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.classes.totalLessons')}</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    required={form.repeat_weekly}
                    value={form.total_lessons}
                    onChange={(e) => setForm({ ...form, total_lessons: Math.max(1, Math.min(99, parseInt(e.target.value, 10) || 1)) })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('admin.classes.totalLessonsHint')}</p>
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
    </Layout>
  );
}
