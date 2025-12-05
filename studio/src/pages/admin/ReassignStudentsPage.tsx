import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { formatDate, formatDateTime } from '../../lib/utils';
import { ArrowLeft, Search, Calendar, Users, CheckCircle, X, ChevronLeft, ChevronRight, Filter, MapPin, AlertTriangle } from 'lucide-react';

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
}

interface Enrollment {
  id: string;
  class_id: string;
  user_id: string;
  user_name: string;
  user_mobile: string | null;
  status: 'enrolled' | 'attended' | 'absent' | 'sick_leave';
  created_at: string;
}

// Mock data - in real app, this would come from API
const MOCK_CLASSES: Class[] = [
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
  },
  {
    id: '3',
    name: '補課 - Yoga Basics',
    class_code: 'YB-MK001',
    instructor: 'Jane Smith',
    start_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    capacity: 5,
    enrolled_count: 1,
    is_internal: true,
    is_cancelled: false,
    location: 'fotan',
  },
  {
    id: '4',
    name: 'Dance Advanced',
    class_code: 'DA003',
    instructor: 'Sarah Lee',
    start_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
    capacity: 20,
    enrolled_count: 12,
    is_internal: false,
    is_cancelled: false,
    location: 'sanpokong',
  },
];

const MOCK_CANCELLED_CLASS: Class = {
  id: '1',
  name: 'Yoga Basics',
  class_code: 'YB001',
  instructor: 'Jane Smith',
  start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  end_time: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
  capacity: 12,
  enrolled_count: 8,
  is_internal: false,
  is_cancelled: true,
  location: 'sanpokong',
};

const MOCK_ENROLLMENTS: Enrollment[] = [
  {
    id: '1',
    class_id: '1',
    user_id: 'user1',
    user_name: '張三',
    user_mobile: '91234567',
    status: 'enrolled',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    class_id: '1',
    user_id: 'user2',
    user_name: '李四',
    user_mobile: '98765432',
    status: 'enrolled',
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    class_id: '1',
    user_id: 'user3',
    user_name: '王五',
    user_mobile: '92345678',
    status: 'enrolled',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function ReassignStudentsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { classId } = useParams<{ classId: string }>();
  const [cancelledClass, setCancelledClass] = useState<Class | null>(null);
  const [studentsToReassign, setStudentsToReassign] = useState<Enrollment[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'month' | 'week' | 'day' | 'threeDay'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [locationFilter, setLocationFilter] = useState<'all' | 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui'>('all');
  const [selectedReplacementClass, setSelectedReplacementClass] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (classId) {
      loadData();
    }
  }, [classId]);

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

  async function loadData() {
    setLoading(true);
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setCancelledClass(MOCK_CANCELLED_CLASS);
    
    // Load students to reassign (enrolled students from cancelled class)
    await new Promise(resolve => setTimeout(resolve, 300));
    const enrolledStudents = MOCK_ENROLLMENTS.filter(
      e => e.class_id === classId && e.status === 'enrolled'
    );
    setStudentsToReassign(enrolledStudents);
    // Select all students by default
    setSelectedStudentIds(new Set(enrolledStudents.map(s => s.id)));
    
    // Load available classes (exclude cancelled class, not cancelled, not past, with available capacity)
    await new Promise(resolve => setTimeout(resolve, 200));
    const now = new Date();
    const available = MOCK_CLASSES.filter(c => 
      c.id !== classId &&
      !c.is_cancelled &&
      new Date(c.start_time) >= now &&
      c.enrolled_count < c.capacity
    );
    setClasses(available);
    
    setLoading(false);
  }

  const getLocale = (): string => {
    const langMap: { [key: string]: string } = {
      'en': 'en-US',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
    };
    return langMap[i18n.language] || i18n.language || 'en-US';
  };

  const formatMobile = (mobile: string | null): string => {
    if (!mobile) return '-';
    
    if (mobile.startsWith('852')) {
      return `+852 ${mobile.substring(3)}`;
    } else if (mobile.startsWith('853')) {
      return `+853 ${mobile.substring(3)}`;
    } else if (mobile.startsWith('86')) {
      return `+86 ${mobile.substring(2)}`;
    }
    
    return `+852 ${mobile}`;
  };

  const getLocationLabel = (location?: string): string => {
    if (!location) return '-';
    return t(`home.locations.${location}`);
  };

  const getSelectedStudents = (): Enrollment[] => {
    return studentsToReassign.filter(s => selectedStudentIds.has(s.id));
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const selectAllStudents = () => {
    setSelectedStudentIds(new Set(studentsToReassign.map(s => s.id)));
  };

  const unselectAllStudents = () => {
    setSelectedStudentIds(new Set());
  };

  const canReassignToClass = (classItem: Class): boolean => {
    const selectedCount = getSelectedStudents().length;
    if (selectedCount === 0) return false;
    const availableSpots = classItem.capacity - classItem.enrolled_count;
    return !classItem.is_cancelled && 
           new Date(classItem.start_time) >= new Date() &&
           availableSpots >= selectedCount;
  };

  async function handleReassign() {
    if (!selectedReplacementClass || !cancelledClass) return;
    
    const selectedStudents = getSelectedStudents();
    if (selectedStudents.length === 0) {
      alert(t('admin.attendance.noStudentsSelected'));
      return;
    }
    
    const replacementClass = classes.find(c => c.id === selectedReplacementClass);
    if (!replacementClass) return;
    
    // Check if replacement class has enough capacity
    const availableSpots = replacementClass.capacity - replacementClass.enrolled_count;
    if (availableSpots < selectedStudents.length) {
      alert(t('admin.attendance.notEnoughSpots', {
        needed: selectedStudents.length,
        available: availableSpots
      }));
      return;
    }
    
    if (!confirm(t('admin.attendance.confirmReassignMessage', {
      studentCount: selectedStudents.length,
      className: replacementClass.name
    }))) return;
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // In real app, this would make an API call to reassign students
    alert(t('admin.attendance.studentsReassigned', { 
      studentCount: selectedStudents.length,
      className: replacementClass.name 
    }));
    
    // Navigate back to attendance page
    navigate(`/admin/classes/${classId}/attendance`);
  }

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];
    
    const startDay = firstDay.getDay();
    for (let i = startDay - 1; i >= 0; i--) {
      const d = new Date(firstDay);
      d.setDate(d.getDate() - i - 1);
      days.push(d);
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
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
      const searchMatches = 
        classItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        classItem.class_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        classItem.instructor.toLowerCase().includes(searchTerm.toLowerCase());
      
      return dateMatches && locationMatches && searchMatches;
    });
  };

  const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const getEndOfWeek = (date: Date): Date => {
    const start = getStartOfWeek(date);
    return new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  };

  const formatWeekRange = (date: Date): string => {
    const start = getStartOfWeek(date);
    const end = getEndOfWeek(date);
    return `${formatDate(start.toISOString(), getLocale())} - ${formatDate(end.toISOString(), getLocale())}`;
  };

  const formatDateLong = (date: Date): string => {
    return date.toLocaleDateString(getLocale(), { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatDay = (date: Date): string => {
    return date.toLocaleDateString(getLocale(), { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString(getLocale(), { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (view === 'threeDay') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 3 : -3));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
    setSelectedDate(null);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(null);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setView('day');
    setCurrentDate(date);
  };

  const clearDateSelection = () => {
    setSelectedDate(null);
  };

  const getClassColor = (classItem: Class): string => {
    if (classItem.is_cancelled) return 'bg-gray-200 text-gray-600';
    if (selectedReplacementClass === classItem.id) return 'bg-primary text-white';
    if (canReassignToClass(classItem)) return 'bg-green-50 text-green-900 border border-green-200';
    return 'bg-blue-50 text-blue-900 border border-blue-200';
  };

  const renderDayView = () => {
    const dayClasses = getClassesForDate(currentDate);
    
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        {dayClasses.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">
              {t('admin.classes.noClassesScheduled')} {formatDay(currentDate)}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {dayClasses.map((classItem) => {
              const canReassign = canReassignToClass(classItem);
              const isSelected = selectedReplacementClass === classItem.id;
              
              return (
                <div
                  key={classItem.id}
                  className={`bg-white rounded-lg shadow-md p-6 border-2 ${
                    isSelected ? 'border-primary bg-primary-lighter' : 'border-gray-200'
                  } ${classItem.is_cancelled ? 'opacity-50' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">{classItem.name}</h3>
                        {classItem.is_internal && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                            {t('admin.tokenAssignment.makeupClass')}
                          </span>
                        )}
                        {classItem.is_cancelled && (
                          <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                            {t('admin.classes.cancelled')}
                          </span>
                        )}
                        {isSelected && (
                          <span className="bg-primary text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            {t('admin.attendance.selected')}
                          </span>
                        )}
                      </div>
                      {classItem.class_code && (
                        <p className="text-gray-600 mb-1 text-sm font-medium">{classItem.class_code}</p>
                      )}
                      <p className="text-gray-600 mb-1">{classItem.instructor}</p>
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
                        {t('admin.tokenAssignment.enrolled')}: {classItem.enrolled_count} / {classItem.capacity}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('admin.attendance.availableSpots')}: {classItem.capacity - classItem.enrolled_count}
                      </p>
                      {!canReassign && classItem.capacity - classItem.enrolled_count < getSelectedStudents().length && (
                        <p className="text-sm text-red-600 mt-1">
                          {t('admin.attendance.notEnoughSpots', {
                            needed: getSelectedStudents().length,
                            available: classItem.capacity - classItem.enrolled_count
                          })}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {canReassign && (
                        <button
                          onClick={() => setSelectedReplacementClass(classItem.id)}
                          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
                            isSelected
                              ? 'bg-primary text-white hover:bg-primary-dark'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              {t('admin.attendance.selected')}
                            </>
                          ) : (
                            <>
                              <Users className="h-4 w-4" />
                              {t('admin.attendance.select')}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
          {threeDays.map((day, idx) => (
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
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 min-h-[400px]">
          {threeDays.map((day, idx) => {
            const dayClasses = getClassesForDate(day);
            const isToday = day.toDateString() === new Date().toDateString();
            const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();
            
            return (
              <div
                key={idx}
                className={`border-r last:border-r-0 p-2 cursor-pointer transition-colors ${
                  isToday ? 'bg-primary-lighter' : ''
                } ${isSelected ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-gray-50'}`}
                onClick={() => handleDateClick(day)}
              >
                {dayClasses.map((classItem) => {
                  const isSelectedClass = selectedReplacementClass === classItem.id;
                  return (
                    <div
                      key={classItem.id}
                      className={`mb-2 p-2 rounded text-xs cursor-pointer transition-all hover:shadow-md ${getClassColor(classItem)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (canReassignToClass(classItem)) {
                          setSelectedReplacementClass(classItem.id);
                          handleDateClick(day);
                        }
                      }}
                      title={classItem.name}
                    >
                      <div className="font-medium truncate">{classItem.name}</div>
                      <div className="text-xs mt-1 truncate">
                        {classItem.instructor}
                      </div>
                      <div className="text-xs mt-0.5">
                        {formatTime(new Date(classItem.start_time))}
                      </div>
                      {isSelectedClass && (
                        <div className="text-xs mt-0.5 font-semibold">
                          ✓ {t('admin.attendance.selected')}
                        </div>
                      )}
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
          {weekDays.map((day, idx) => (
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
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 min-h-[400px]">
          {weekDays.map((day, idx) => {
            const dayClasses = getClassesForDate(day);
            const isToday = day.toDateString() === new Date().toDateString();
            const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();
            
            return (
              <div
                key={idx}
                className={`border-r last:border-r-0 p-2 cursor-pointer transition-colors ${
                  isToday ? 'bg-primary-lighter' : ''
                } ${isSelected ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-gray-50'}`}
                onClick={() => handleDateClick(day)}
              >
                {dayClasses.map((classItem) => {
                  const isSelectedClass = selectedReplacementClass === classItem.id;
                  return (
                    <div
                      key={classItem.id}
                      className={`mb-2 p-2 rounded text-xs cursor-pointer transition-all hover:shadow-md ${getClassColor(classItem)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (canReassignToClass(classItem)) {
                          setSelectedReplacementClass(classItem.id);
                          handleDateClick(day);
                        }
                      }}
                      title={classItem.name}
                    >
                      <div className="font-medium truncate">{classItem.name}</div>
                      <div className="text-xs mt-1 truncate">
                        {classItem.instructor}
                      </div>
                      <div className="text-xs mt-0.5">
                        {formatTime(new Date(classItem.start_time))}
                      </div>
                      {isSelectedClass && (
                        <div className="text-xs mt-0.5 font-semibold">
                          ✓ {t('admin.attendance.selected')}
                        </div>
                      )}
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
    const weekDays = Array.from({ length: 7 }, (_, i) => {
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
                {dayClasses.map((classItem) => {
                  const isSelectedClass = selectedReplacementClass === classItem.id;
                  return (
                    <div
                      key={classItem.id}
                      className={`mb-1 p-1 rounded text-xs cursor-pointer transition-all hover:shadow-sm ${getClassColor(classItem)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (canReassignToClass(classItem)) {
                          setSelectedReplacementClass(classItem.id);
                          handleDateClick(day);
                        }
                      }}
                      title={classItem.name}
                    >
                      <div className="font-medium truncate">{classItem.name}</div>
                      <div className="text-xs truncate">{formatTime(new Date(classItem.start_time))}</div>
                      {isSelectedClass && (
                        <div className="text-xs font-semibold">✓</div>
                      )}
                    </div>
                  );
                })}
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
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!cancelledClass) {
    return (
      <Layout>
        <div className="p-6">
          <p className="text-gray-600">{t('admin.attendance.classNotFound')}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/admin/classes/${classId}/attendance`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>{t('common.back')}</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {t('admin.attendance.reassignStudents')}
          </h1>
        </div>

        {/* Cancelled Class Info */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-semibold text-gray-900">{t('admin.attendance.cancelledClass')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">{t('admin.attendance.className')}:</span> {cancelledClass.name}
              </p>
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">{t('admin.attendance.classCode')}:</span> {cancelledClass.class_code}
              </p>
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">{t('admin.attendance.instructor')}:</span> {cancelledClass.instructor}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">{t('admin.attendance.time')}:</span>{' '}
                {formatDateTime(cancelledClass.start_time, getLocale())} - {formatDateTime(cancelledClass.end_time, getLocale())}
              </p>
              {cancelledClass.location && (
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">{t('admin.attendance.location')}:</span> {getLocationLabel(cancelledClass.location)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Students to Reassign */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {t('admin.attendance.studentsToReassign')} ({getSelectedStudents().length}/{studentsToReassign.length})
            </h2>
            {studentsToReassign.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={selectAllStudents}
                  className="px-3 py-1 text-sm text-primary hover:bg-primary-lighter rounded-md transition-colors"
                >
                  {t('admin.attendance.selectAll')}
                </button>
                <button
                  onClick={unselectAllStudents}
                  className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                >
                  {t('admin.attendance.unselectAll')}
                </button>
              </div>
            )}
          </div>
          {studentsToReassign.length === 0 ? (
            <p className="text-sm text-gray-600 p-4 bg-gray-50 rounded-lg">
              {t('admin.attendance.noEnrolledStudentsToReassign')}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {studentsToReassign.map((enrollment) => {
                const isSelected = selectedStudentIds.has(enrollment.id);
                return (
                  <div
                    key={enrollment.id}
                    onClick={() => toggleStudentSelection(enrollment.id)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-primary-lighter border-primary'
                        : 'bg-gray-50 border-gray-200 hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? 'bg-primary border-primary'
                            : 'border-gray-300 bg-white'
                        }`}>
                          {isSelected && (
                            <CheckCircle className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{enrollment.user_name}</p>
                          <p className="text-xs text-gray-500">{formatMobile(enrollment.user_mobile)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Calendar View */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          {/* View Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
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
            <div className="flex items-center gap-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                {view === 'month'
                  ? formatDateLong(currentDate)
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

          {/* Location Filter */}
          <div className="mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-5 w-5 text-gray-600" />
              <button
                onClick={() => setLocationFilter('all')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  locationFilter === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('admin.classes.allLocations')}
              </button>
              {(['sanpokong', 'causewaybay', 'fotan', 'sheungshui'] as const).map((loc) => (
                <button
                  key={loc}
                  onClick={() => setLocationFilter(loc)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    locationFilter === loc
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {getLocationLabel(loc)}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder={t('admin.attendance.searchReplacementClasses')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Calendar Grid */}
          {view === 'day' && renderDayView()}
          {view === 'threeDay' && renderThreeDayView()}
          {view === 'week' && renderWeekView()}
          {view === 'month' && renderMonthView()}
        </div>

        {/* Action Button */}
        {selectedReplacementClass && getSelectedStudents().length > 0 && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleReassign}
              className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-dark flex items-center gap-2 text-lg font-medium"
            >
              <Users className="h-5 w-5" />
              {t('admin.attendance.confirmReassign')} ({getSelectedStudents().length})
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}

