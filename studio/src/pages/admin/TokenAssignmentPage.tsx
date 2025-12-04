import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { formatDate, formatDateTime } from '../../lib/utils';
import { ArrowLeft, Search, Calendar, User, Package, CheckCircle, X, ChevronLeft, ChevronRight, Filter, MapPin } from 'lucide-react';

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
  status: 'enrolled' | 'attended' | 'absent' | 'sick_leave';
  created_at: string;
}

interface User {
  id: string;
  full_name: string;
  mobile: string | null;
  total_tokens: number;
  assigned_tokens: number;
  expiry_date: string;
}

// Mock data
const MOCK_USER: User = {
  id: 'user-001',
  full_name: '張三',
  mobile: '91234567',
  total_tokens: 18,
  assigned_tokens: 1,
  expiry_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Latest expiry date
};

const MOCK_CLASSES: Class[] = [
  {
    id: '1',
    name: 'Yoga Basics',
    class_code: 'YB001',
    instructor: 'Jane Smith',
    start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    capacity: 12,
    enrolled_count: 2,
    is_internal: false,
    is_cancelled: false,
    location: 'sanpokong',
  },
  {
    id: '2',
    name: 'Pilates Intermediate',
    class_code: 'PI002',
    instructor: 'John Doe',
    start_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
    capacity: 15,
    enrolled_count: 5,
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
];

const MOCK_ENROLLMENTS: Enrollment[] = [
  {
    id: 'enroll-1',
    class_id: '1',
    status: 'enrolled',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function TokenAssignmentPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [locationFilter, setLocationFilter] = useState<'all' | 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui'>('all');

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  async function loadData() {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setUser(MOCK_USER);
    
    // Load classes
    await new Promise(resolve => setTimeout(resolve, 300));
    setClasses(MOCK_CLASSES);
    
    // Load enrollments
    await new Promise(resolve => setTimeout(resolve, 200));
    setEnrollments(MOCK_ENROLLMENTS);
    
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

  const getUnassignedTokens = (): number => {
    if (!user) return 0;
    return user.total_tokens - user.assigned_tokens;
  };

  const isClassAssigned = (classId: string): boolean => {
    return enrollments.some(e => e.class_id === classId);
  };

  const isClassFull = (classItem: Class): boolean => {
    return classItem.enrolled_count >= classItem.capacity;
  };

  const isClassPast = (classItem: Class): boolean => {
    return new Date(classItem.start_time) < new Date();
  };

  const canAssignToClass = (classItem: Class): boolean => {
    const unassignedTokens = getUnassignedTokens();
    return !isClassAssigned(classItem.id) && !isClassFull(classItem) && !isClassPast(classItem) && !classItem.is_cancelled && unassignedTokens > 0;
  };

  async function assignTokenToClass(classId: string) {
    if (!user || getUnassignedTokens() === 0) return;
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Create new enrollment
    const newEnrollment: Enrollment = {
      id: `enroll-${Date.now()}`,
      class_id: classId,
      status: 'enrolled',
      created_at: new Date().toISOString(),
    };
    
    setEnrollments([...enrollments, newEnrollment]);
    
    // Increase assigned tokens count
    if (user) {
      setUser({
        ...user,
        assigned_tokens: user.assigned_tokens + 1,
      });
    }
    
    // Update class enrolled count
    setClasses(classes.map(c =>
      c.id === classId
        ? { ...c, enrolled_count: c.enrolled_count + 1 }
        : c
    ));
    
    alert(t('admin.tokenAssignment.assignedSuccessfully'));
  }

  async function removeAssignment(enrollmentId: string, classId: string) {
    if (!confirm(t('admin.tokenAssignment.confirmRemove'))) return;
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Remove enrollment
    setEnrollments(enrollments.filter(e => e.id !== enrollmentId));
    
    // Decrease assigned tokens count
    if (user) {
      setUser({
        ...user,
        assigned_tokens: Math.max(0, user.assigned_tokens - 1),
      });
    }
    
    // Update class enrolled count
    setClasses(classes.map(c =>
      c.id === classId
        ? { ...c, enrolled_count: Math.max(0, c.enrolled_count - 1) }
        : c
    ));
    
    alert(t('admin.tokenAssignment.removedSuccessfully'));
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

  const formatDateDisplay = (date: Date): string => {
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

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString(getLocale(), {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const getLocationLabel = (location?: string | typeof locationFilter): string => {
    if (!location || location === 'all') {
      return location === 'all' ? t('admin.classes.allLocations') : '-';
    }
    return t(`home.locations.${location}`);
  };

  const getClassColor = (classItem: Class): string => {
    if (classItem.is_cancelled) {
      return 'bg-red-100 text-red-700';
    }
    if (isClassAssigned(classItem.id)) {
      return 'bg-green-100 text-green-700';
    }
    if (canAssignToClass(classItem)) {
      return 'bg-primary/20 text-primary';
    }
    return 'bg-gray-100 text-gray-500';
  };

  const renderDayView = () => {
    const dayClasses = getClassesForDate(currentDate);

    return (
      <div className="space-y-4">
        {dayClasses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 text-center py-8">
              {t('admin.classes.noClassesScheduled')} {formatDay(currentDate)}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {dayClasses.map((classItem) => {
              const isAssigned = isClassAssigned(classItem.id);
              const canAssign = canAssignToClass(classItem);
              const enrollment = enrollments.find(e => e.class_id === classItem.id);

              return (
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
                            {t('admin.tokenAssignment.makeupClass')}
                          </span>
                        )}
                        {classItem.is_cancelled && (
                          <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                            {t('admin.classes.cancelled')}
                          </span>
                        )}
                        {isAssigned && (
                          <span className="bg-primary-lighter text-primary text-xs px-2 py-1 rounded flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            {t('admin.tokenAssignment.assigned')}
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
                    </div>
                    <div className="flex gap-2">
                      {isAssigned && enrollment ? (
                        <button
                          onClick={() => removeAssignment(enrollment.id, classItem.id)}
                          className="px-4 py-2 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 flex items-center gap-2"
                        >
                          <X className="h-4 w-4" />
                          {t('admin.tokenAssignment.remove')}
                        </button>
                      ) : canAssign ? (
                        <button
                          onClick={() => assignTokenToClass(classItem.id)}
                          className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-white hover:bg-primary-dark flex items-center gap-2"
                        >
                          <Calendar className="h-4 w-4" />
                          {t('admin.tokenAssignment.assign')}
                        </button>
                      ) : null}
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
                  const isAssigned = isClassAssigned(classItem.id);
                  return (
                    <div
                      key={classItem.id}
                      className={`mb-2 p-2 rounded text-xs cursor-pointer transition-all hover:shadow-md ${getClassColor(classItem)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDateClick(day);
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
                      {isAssigned && (
                        <div className="text-xs mt-0.5 font-semibold">
                          ✓ {t('admin.tokenAssignment.assigned')}
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
                <div className="space-y-1">
                  {dayClasses.slice(0, 2).map((classItem) => {
                    const isAssigned = isClassAssigned(classItem.id);
                    return (
                      <div
                        key={classItem.id}
                        className={`text-xs p-1 rounded truncate ${getClassColor(classItem)}`}
                        title={classItem.name}
                      >
                        {formatTime(new Date(classItem.start_time))} {classItem.name}
                        {isAssigned && ' ✓'}
                      </div>
                    );
                  })}
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

  const filteredClasses = classes.filter(classItem => {
    const locationMatches = locationFilter === 'all' || classItem.location === locationFilter;
    const searchMatches = 
      classItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classItem.class_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classItem.instructor.toLowerCase().includes(searchTerm.toLowerCase());
    return locationMatches && searchMatches;
  });

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/users')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{t('admin.tokenAssignment.title')}</h1>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-center text-gray-600 py-8">{t('admin.tokenAssignment.userNotFound')}</p>
          </div>
        </div>
      </Layout>
    );
  }

  const unassignedTokens = getUnassignedTokens();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/users')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.tokenAssignment.title')}</h1>
        </div>

        {/* User Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-primary-lighter rounded-full">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{user.full_name}</h2>
              <p className="text-gray-600">{formatMobile(user.mobile)}</p>
            </div>
          </div>

          {/* Token Information */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-5 w-5 text-primary" />
                  <span className="font-medium text-gray-900">{t('admin.tokenAssignment.totalTokens')}</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{user.total_tokens}</div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="font-medium text-gray-900">{t('admin.tokenAssignment.tokenExpiryDate')}</span>
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatDate(user.expiry_date, getLocale())}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-gray-900">{t('admin.tokenAssignment.unassignedTokens')}</span>
                </div>
                <span className="text-2xl font-bold text-green-600">{unassignedTokens}</span>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                {t('admin.tokenAssignment.assignedTokens')}: {user.assigned_tokens} / {user.total_tokens}
              </div>
            </div>
          </div>
        </div>

        {/* Location Filter */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3 mb-3">
            <Filter className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">{t('admin.classes.filterByLocation')}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'sanpokong', 'causewaybay', 'fotan', 'sheungshui'] as typeof locationFilter[]).map((loc) => {
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
              <button
                onClick={() => setView('week')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === 'week'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('admin.classes.week')}
              </button>
              <button
                onClick={() => setView('month')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
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
                  ? formatDateDisplay(currentDate) 
                  : view === 'week'
                  ? formatWeekRange(currentDate)
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

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder={t('admin.tokenAssignment.searchClasses')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Calendar Grid */}
          {view === 'day' && renderDayView()}
          {view === 'week' && renderWeekView()}
          {view === 'month' && renderMonthView()}
        </div>

        {/* Selected Date Info */}
        {selectedDate && (
          <div className="bg-primary-lighter p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('admin.classes.classesFor')} {formatDateLong(selectedDate)}
                </h3>
                <p className="text-sm text-gray-600">
                  {getClassesForDate(selectedDate).length} {getClassesForDate(selectedDate).length === 1 ? t('admin.classes.class') : t('admin.classes.classes')} {t('admin.classes.scheduled')}
                </p>
              </div>
              <button
                onClick={clearDateSelection}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 rounded-md transition-colors"
              >
                {t('admin.classes.showAllClasses')}
              </button>
            </div>
          </div>
        )}

        {/* Classes List for Selected Date */}
        {selectedDate && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {t('admin.classes.classesFor')} {formatDateLong(selectedDate)}
            </h2>
            {getClassesForDate(selectedDate).length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                {t('admin.classes.noClassesScheduled')} {formatDateLong(selectedDate)}
              </div>
            ) : (
              <div className="space-y-4">
                {getClassesForDate(selectedDate).map((classItem) => {
                  const isAssigned = isClassAssigned(classItem.id);
                  const canAssign = canAssignToClass(classItem);
                  const enrollment = enrollments.find(e => e.class_id === classItem.id);

                  return (
                    <div
                      key={classItem.id}
                      className={`p-4 rounded-lg border ${
                        isAssigned
                          ? 'bg-green-50 border-green-200'
                          : canAssign
                          ? 'bg-white border-gray-200 hover:border-primary'
                          : 'bg-gray-50 border-gray-200 opacity-60'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{classItem.name}</h3>
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
                            {isAssigned && (
                              <span className="bg-primary-lighter text-primary text-xs px-2 py-1 rounded flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                {t('admin.tokenAssignment.assigned')}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            <span className="font-medium">{t('admin.tokenAssignment.classCode')}:</span> {classItem.class_code}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">
                            <span className="font-medium">{t('admin.tokenAssignment.instructor')}:</span> {classItem.instructor}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">
                            <span className="font-medium">{t('admin.tokenAssignment.time')}:</span>{' '}
                            {formatDateTime(classItem.start_time, getLocale())} - {formatDateTime(classItem.end_time, getLocale())}
                          </p>
                          {classItem.location && (
                            <p className="text-sm text-gray-600 mb-1">
                              <span className="font-medium">{t('admin.tokenAssignment.location')}:</span> {getLocationLabel(classItem.location)}
                            </p>
                          )}
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">{t('admin.tokenAssignment.enrolled')}:</span> {classItem.enrolled_count} / {classItem.capacity}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          {isAssigned && enrollment ? (
                            <button
                              onClick={() => removeAssignment(enrollment.id, classItem.id)}
                              className="px-4 py-2 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 flex items-center gap-2"
                            >
                              <X className="h-4 w-4" />
                              {t('admin.tokenAssignment.remove')}
                            </button>
                          ) : canAssign ? (
                            <button
                              onClick={() => assignTokenToClass(classItem.id)}
                              className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-white hover:bg-primary-dark flex items-center gap-2"
                            >
                              <Calendar className="h-4 w-4" />
                              {t('admin.tokenAssignment.assign')}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

    </Layout>
  );
}

