import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import ClassAttendancePanel, { type ClassWithAttendance, type Enrollment } from '../../components/ClassAttendancePanel';
import { formatDateTime, shouldPostponeClass, getHongKongHolidayName } from '../../lib/utils';
import { appendRefundRecord } from '../../lib/refundRecords';
import { Plus, Calendar, ChevronLeft, ChevronRight, Filter, MapPin, Edit, Users } from 'lucide-react';
import { type CourseLevel, type AgeTag, useAuth } from '../../contexts/AuthContext';

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
  level?: CourseLevel;
  age_tag?: AgeTag;
}

interface Instructor {
  id: string;
  name: string;
  profile_image_url: string | null;
  created_at: string;
}

type LocationFilter = 'all' | 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui';

// Mock instructors data
const MOCK_INSTRUCTORS: Instructor[] = [
  {
    id: '1',
    name: 'Jane Smith',
    profile_image_url: 'https://ui-avatars.com/api/?name=Jane+Smith&size=128&background=007257&color=fff&bold=true',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    name: 'John Doe',
    profile_image_url: 'https://ui-avatars.com/api/?name=John+Doe&size=128&background=2563eb&color=fff&bold=true',
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    name: 'Sarah Johnson',
    profile_image_url: 'https://ui-avatars.com/api/?name=Sarah+Johnson&size=128&background=7c3aed&color=fff&bold=true',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Mock data
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
    level: 'entry',
    age_tag: '5-8',
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
    level: 'intermediate',
    age_tag: '9-12',
  },
  {
    id: '3',
    name: '補課 - Yoga Basics',
    class_code: 'YB-MK001',
    instructor: 'Jane Smith',
    start_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    capacity: 5,
    enrolled_count: 3,
    is_internal: true,
    is_cancelled: false,
    location: 'fotan',
    level: 'entry',
    age_tag: '13-16',
  },
];

// Mock enrollments for attendance (class_id matches MOCK_CLASSES)
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
    reassigned_to_class_id: '2',
    reassigned_to_class_name: 'Pilates Intermediate',
    reassigned_to_class_code: 'PI002',
    reassigned_to_class_start_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    reassigned_to_class_end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
  },
];

const MOCK_ATTENDANCE_CONFIRMED: Record<string, boolean> = { '2': true };

// Location labels will be retrieved from translations

type ViewType = 'month' | 'week' | 'day' | 'threeDay';

export default function ClassesPage() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();
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
    start_time: '',
    end_time: '',
    capacity: 10,
    is_internal: false,
    location: 'sanpokong' as 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui',
    level: 'entry' as CourseLevel,
    age_tag: '5-8' as AgeTag,
    repeat_weekly: false,
    repeat_until: '',
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
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setClasses(MOCK_CLASSES);
    setLoading(false);
  }

  async function loadInstructors() {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    setInstructors(MOCK_INSTRUCTORS);
  }

  async function loadAttendanceData(
    classId: string
  ): Promise<{ class: ClassWithAttendance; enrollments: Enrollment[] } | null> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const c = classes.find((x) => x.id === classId);
    if (!c) return null;
    const classWithAttendance: ClassWithAttendance = {
      ...c,
      attendance_confirmed: MOCK_ATTENDANCE_CONFIRMED[classId] ?? false,
    };
    const enrollments = MOCK_ENROLLMENTS.filter((e) => e.class_id === classId);
    return { class: classWithAttendance, enrollments };
  }

  function toggleAttendance(classId: string) {
    setExpandedAttendanceClassId((prev) => (prev === classId ? null : classId));
  }

  async function updateAttendanceStatus(
    enrollmentId: string,
    newStatus: 'enrolled' | 'attended' | 'absent' | 'sick_leave'
  ) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    setAttendanceData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        enrollments: prev.enrollments.map((e) =>
          e.id === enrollmentId
            ? {
                ...e,
                status: newStatus,
                check_in_time: newStatus === 'attended' ? e.check_in_time || new Date().toISOString() : e.check_in_time,
                check_out_time: newStatus === 'attended' ? e.check_out_time || new Date().toISOString() : e.check_out_time,
              }
            : e
        ),
      };
    });
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
    // Simulate API call to refund token
    await new Promise((resolve) => setTimeout(resolve, 500));
    const cls = attendanceData?.class;
    appendRefundRecord({
      enrollment_id: enrollmentId,
      user_id: userId,
      user_name: userName,
      class_id: cls?.id ?? '',
      class_name: cls?.name ?? '',
      class_code: cls?.class_code ?? '',
      tokens_refunded: 1,
      remarks,
      refunded_by: profile?.full_name ?? 'Admin',
    });
    alert(t('admin.attendance.tokenRefunded', { name: userName }));
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

  function formatDateTimeLocal(dateString: string): string {
    // Convert ISO string to local datetime-local format (YYYY-MM-DDTHH:mm)
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function openEditModal(classItem: Class) {
    setEditingClass(classItem);
    setEditAllRepeats(false); // Default to single edit
    // Format datetime for input fields (YYYY-MM-DDTHH:mm) using local time
    const startDateTime = formatDateTimeLocal(classItem.start_time);
    const endDateTime = formatDateTimeLocal(classItem.end_time);
    
    setForm({
      name: classItem.name,
      class_code: classItem.class_code,
      instructor: classItem.instructor,
      substitute_instructor: classItem.substitute_instructor ?? '',
      start_time: startDateTime,
      end_time: endDateTime,
      capacity: classItem.capacity,
      is_internal: classItem.is_internal,
      location: classItem.location || 'sanpokong',
      level: classItem.level || 'entry',
      age_tag: classItem.age_tag || '5-8',
      repeat_weekly: false,
      repeat_until: '',
    });
    setShowModal(true);
  }

  function openCreateModal() {
    setEditingClass(null);
    setForm({
      name: '',
      class_code: '',
      instructor: '',
      substitute_instructor: '',
      start_time: '',
      end_time: '',
      capacity: 10,
      is_internal: false,
      location: 'sanpokong',
      level: 'entry',
      age_tag: '5-8',
      repeat_weekly: false,
      repeat_until: '',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // If editing, update the existing class(es)
    if (editingClass) {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 300));

      if (editAllRepeats) {
        // Update all repeated classes
        const repeatedClasses = findRepeatedClasses(editingClass);
        const allClassesToUpdate = [editingClass, ...repeatedClasses];
        
        setClasses(classes.map(c => {
          const shouldUpdate = allClassesToUpdate.some(updateClass => updateClass.id === c.id);
          if (shouldUpdate) {
            // Calculate time difference from original class
            const originalStart = new Date(editingClass.start_time);
            const originalEnd = new Date(editingClass.end_time);
            const newStart = new Date(form.start_time);
            const newEnd = new Date(form.end_time);
            const timeDiff = newStart.getTime() - originalStart.getTime();
            const duration = newEnd.getTime() - newStart.getTime();
            
            // Calculate new times for this class
            const classStart = new Date(c.start_time);
            const classEnd = new Date(c.end_time);
            const newClassStart = new Date(classStart.getTime() + timeDiff);
            const newClassEnd = new Date(newClassStart.getTime() + duration);
            
            return {
              ...c,
              name: form.name,
              class_code: form.class_code,
              instructor: form.instructor,
              substitute_instructor: form.substitute_instructor || null,
              start_time: newClassStart.toISOString(),
              end_time: newClassEnd.toISOString(),
              capacity: form.capacity,
              is_internal: form.is_internal,
              location: form.location,
              level: form.level,
              age_tag: form.age_tag,
            };
          }
          return c;
        }));
        alert(t('admin.classes.classesUpdated', { count: allClassesToUpdate.length }));
      } else {
        // Update single class
        const updatedClass: Class = {
          ...editingClass,
          name: form.name,
          class_code: form.class_code,
          instructor: form.instructor,
          substitute_instructor: form.substitute_instructor || null,
          start_time: form.start_time,
          end_time: form.end_time,
          capacity: form.capacity,
          is_internal: form.is_internal,
          location: form.location,
          level: form.level,
          age_tag: form.age_tag,
        };

        setClasses(classes.map(c => c.id === editingClass.id ? updatedClass : c));
        alert(t('admin.classes.classUpdated'));
      }
      
      setShowModal(false);
      setEditingClass(null);
      setEditAllRepeats(false);
      setForm({
        name: '',
        class_code: '',
        instructor: '',
        substitute_instructor: '',
        start_time: '',
        end_time: '',
        capacity: 10,
        is_internal: false,
        location: 'sanpokong',
        level: 'entry',
        age_tag: '5-8',
        repeat_weekly: false,
        repeat_until: '',
      });
      return;
    }

    // Creating new class(es)
    if (form.repeat_weekly && !form.repeat_until) {
      alert(t('admin.classes.repeatUntilRequired'));
      return;
    }

    if (form.repeat_weekly && form.repeat_until && form.start_time) {
      const startDate = new Date(form.start_time);
      const repeatUntilDate = new Date(form.repeat_until);
      if (repeatUntilDate <= startDate) {
        alert(t('admin.classes.repeatUntilAfterStart'));
        return;
      }
    }

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const newClasses: Class[] = [];

    if (form.repeat_weekly && form.repeat_until) {
      // Create multiple classes for weekly repeats
      const startDate = new Date(form.start_time);
      const endDate = new Date(form.end_time);
      // Set repeat_until to end of day to include classes on that date
      const repeatUntilDate = new Date(form.repeat_until);
      repeatUntilDate.setHours(23, 59, 59, 999);
      
      // Calculate time difference for end_time
      const timeDiff = endDate.getTime() - startDate.getTime();

      let currentDate = new Date(startDate);
      let classCounter = 0;
      let maxIterations = 1000; // Safety limit to prevent infinite loops
      let iterations = 0;

      while (currentDate <= repeatUntilDate && iterations < maxIterations) {
        iterations++;
        
        // Check if current date is a public holiday and postpone if needed
        const { shouldPostpone, newDate } = shouldPostponeClass(currentDate);
        const adjustedStartDate = shouldPostpone ? newDate : currentDate;
        
        // Only create class if the adjusted date is still within the repeat_until range
        if (adjustedStartDate <= repeatUntilDate) {
          const classStartTime = new Date(adjustedStartDate);
          const classEndTime = new Date(classStartTime.getTime() + timeDiff);

          const newClass: Class = {
            id: `${Date.now()}-${classCounter}`,
            name: form.name,
            class_code: form.class_code,
            instructor: form.instructor,
            start_time: classStartTime.toISOString(),
            end_time: classEndTime.toISOString(),
            capacity: form.capacity,
            enrolled_count: 0,
            is_internal: form.is_internal,
            is_cancelled: false,
            location: form.location,
            level: form.level,
            age_tag: form.age_tag,
          };

          newClasses.push(newClass);
          classCounter++;
        }

        // Move to next week (7 days later) from the original currentDate
        // This ensures we maintain the weekly pattern even if a class was postponed
        currentDate.setDate(currentDate.getDate() + 7);
      }
    } else {
      // Create single class - check for holidays and postpone if needed
      const startDate = new Date(form.start_time);
      const { shouldPostpone, newDate } = shouldPostponeClass(startDate);
      const adjustedStartDate = shouldPostpone ? newDate : startDate;
      
      const timeDiff = new Date(form.end_time).getTime() - startDate.getTime();
      const adjustedEndDate = new Date(adjustedStartDate.getTime() + timeDiff);
      
      const newClass: Class = {
        id: Date.now().toString(),
        name: form.name,
        class_code: form.class_code,
        instructor: form.instructor,
        start_time: adjustedStartDate.toISOString(),
        end_time: adjustedEndDate.toISOString(),
        capacity: form.capacity,
        enrolled_count: 0,
        is_internal: form.is_internal,
        is_cancelled: false,
        location: form.location,
        level: form.level,
        age_tag: form.age_tag,
      };
      newClasses.push(newClass);
    }

    setClasses([...newClasses, ...classes]);
    if (newClasses.length === 1) {
      alert(t('admin.classes.classCreated'));
    } else {
      alert(t('admin.classes.classesCreated', { count: newClasses.length }));
    }
    setShowModal(false);
    setForm({
      name: '',
      class_code: '',
      instructor: '',
      substitute_instructor: '',
      start_time: '',
      end_time: '',
      capacity: 10,
      is_internal: false,
      location: 'sanpokong',
      level: 'entry',
      age_tag: '5-8',
      repeat_weekly: false,
      repeat_until: '',
    });
  }

  async function toggleCancel(classId: string, currentStatus: boolean) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setClasses(classes.map(c => 
      c.id === classId 
        ? { ...c, is_cancelled: !currentStatus }
        : c
    ));
  }

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];
    
    // Add days from previous month to fill first week
    const startDay = firstDay.getDay();
    for (let i = startDay - 1; i >= 0; i--) {
      const d = new Date(firstDay);
      d.setDate(d.getDate() - i - 1);
      days.push(d);
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

  const renderDayView = () => {
    const dayClasses = getClassesForDate(currentDate);
    const holidayName = getHongKongHolidayName(currentDate);

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
                    {classItem.class_code && (
                      <p className="text-gray-600 mb-1 text-sm font-medium">{classItem.class_code}</p>
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
                      onClick={() => toggleAttendance(classItem.id)}
                      className={`px-4 py-2 rounded-md text-sm font-medium flex items-center ${
                        expandedAttendanceClassId === classItem.id
                          ? 'bg-purple-200 text-purple-800 ring-2 ring-purple-400'
                          : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      }`}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      {t('admin.classes.attendance')}
                    </button>
                    <button
                      onClick={() => openEditModal(classItem)}
                      className="px-4 py-2 rounded-md text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      {t('common.edit')}
                    </button>
                    <button
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
                {expandedAttendanceClassId === classItem.id && (
                  attendanceLoading ? (
                    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : (
                    attendanceData &&
                    attendanceData.class.id === classItem.id && (
                      <ClassAttendancePanel
                        class={attendanceData.class}
                        enrollments={attendanceData.enrollments}
                        onUpdateStatus={updateAttendanceStatus}
                        onToggleConfirmation={toggleAttendanceConfirmation}
                        onCancelClass={() => handleCancelClass(classItem.id)}
                        onReassign={() => navigate(`/admin/classes/${classItem.id}/reassign`)}
                        onRefundToken={handleRefundToken}
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
            const holidayName = getHongKongHolidayName(day);
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
            const holidayName = getHongKongHolidayName(day);
            
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
                {dayClasses.map((classItem) => (
                  <div
                    key={classItem.id}
                    className={`mb-2 p-2 rounded text-xs cursor-pointer transition-all hover:shadow-md ${
                      classItem.is_cancelled
                        ? 'bg-red-100 text-red-700 line-through'
                        : classItem.is_internal
                        ? 'bg-green-100 text-green-700'
                        : 'bg-primary/20 text-primary'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDateClick(day);
                    }}
                  >
                    <div className="font-medium truncate">{classItem.name}</div>
                    <div className="text-xs mt-1 truncate">
                      {classItem.instructor}
                    </div>
                    <div className="text-xs mt-0.5">
                      {formatTime(new Date(classItem.start_time))}
                    </div>
                  </div>
                ))}
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
            const holidayName = getHongKongHolidayName(day);
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
            const holidayName = getHongKongHolidayName(day);
            
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
                {dayClasses.map((classItem) => (
                  <div
                    key={classItem.id}
                    className={`mb-2 p-2 rounded text-xs cursor-pointer transition-all hover:shadow-md ${
                      classItem.is_cancelled
                        ? 'bg-red-100 text-red-700 line-through'
                        : classItem.is_internal
                        ? 'bg-green-100 text-green-700'
                        : 'bg-primary/20 text-primary'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDateClick(day);
                    }}
                  >
                    <div className="font-medium truncate">{classItem.name}</div>
                    <div className="text-xs mt-1 truncate">
                      {classItem.instructor}
                    </div>
                    <div className="text-xs mt-0.5">
                      {formatTime(new Date(classItem.start_time))}
                    </div>
                  </div>
                ))}
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
            const holidayName = getHongKongHolidayName(day);
            
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
                  {dayClasses.slice(0, 2).map((classItem) => (
                    <div
                      key={classItem.id}
                      className={`text-xs p-1 rounded truncate ${
                        classItem.is_cancelled
                          ? 'bg-red-100 text-red-700 line-through'
                          : classItem.is_internal
                          ? 'bg-green-100 text-green-700'
                          : 'bg-primary/20 text-primary'
                      }`}
                      title={classItem.name}
                    >
                      {formatTime(new Date(classItem.start_time))} {classItem.name}
                    </div>
                  ))}
                  {dayClasses.length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{dayClasses.length - 2} more
                    </div>
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
            <div className="flex items-center gap-2">
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
                  {classItem.class_code && (
                    <p className="text-gray-600 mb-1 text-sm font-medium">{classItem.class_code}</p>
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
                    onClick={() => toggleAttendance(classItem.id)}
                    className={`px-4 py-2 rounded-md text-sm font-medium flex items-center ${
                      expandedAttendanceClassId === classItem.id
                        ? 'bg-purple-200 text-purple-800 ring-2 ring-purple-400'
                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    }`}
                  >
                    <Users className="h-4 w-4 mr-1" />
                    {t('admin.classes.attendance')}
                  </button>
                  <button
                    onClick={() => openEditModal(classItem)}
                    className="px-4 py-2 rounded-md text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    {t('common.edit')}
                  </button>
                  <button
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
              {expandedAttendanceClassId === classItem.id && (
                attendanceLoading ? (
                  <div className="mt-4 pt-4 border-t border-gray-200 flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : (
                  attendanceData &&
                  attendanceData.class.id === classItem.id && (
                    <ClassAttendancePanel
                      class={attendanceData.class}
                      enrollments={attendanceData.enrollments}
                      onUpdateStatus={updateAttendanceStatus}
                      onToggleConfirmation={toggleAttendanceConfirmation}
                      onCancelClass={() => handleCancelClass(classItem.id)}
                      onReassign={() => navigate(`/admin/classes/${classItem.id}/reassign`)}
                      onRefundToken={handleRefundToken}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.classes.startTime')}</label>
                <input
                  type="datetime-local"
                  required
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.classes.endTime')}</label>
                <input
                  type="datetime-local"
                  required
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
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
                    onChange={(e) => setForm({ ...form, repeat_weekly: e.target.checked, repeat_until: e.target.checked ? form.repeat_until : '' })}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <label htmlFor="repeat_weekly" className="ml-2 text-sm text-gray-700">
                    {t('admin.classes.repeatWeekly')}
                  </label>
                </div>
              )}
              {form.repeat_weekly && !editingClass && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.classes.repeatUntil')}</label>
                  <input
                    type="date"
                    required={form.repeat_weekly}
                    value={form.repeat_until}
                    onChange={(e) => setForm({ ...form, repeat_until: e.target.value })}
                    min={form.start_time ? (() => {
                      const start = new Date(form.start_time);
                      const minDate = new Date(start);
                      minDate.setDate(minDate.getDate() + 7);
                      return minDate.toISOString().split('T')[0];
                    })() : ''}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('admin.classes.repeatUntilHint')}</p>
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
