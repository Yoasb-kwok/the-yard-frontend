import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { formatDateTime } from '../../lib/utils';
import { Plus, Calendar, ChevronLeft, ChevronRight, Filter, MapPin } from 'lucide-react';

interface Class {
  id: string;
  name: string;
  instructor: string;
  start_time: string;
  end_time: string;
  capacity: number;
  enrolled_count: number;
  is_internal: boolean;
  is_cancelled: boolean;
  location?: 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui';
}

type LocationFilter = 'all' | 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui';

// Mock data
const MOCK_CLASSES: Class[] = [
  {
    id: '1',
    name: 'Yoga Basics',
    instructor: 'Jane Smith',
    start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    capacity: 12,
    enrolled_count: 8,
    is_internal: false,
    is_cancelled: false,
    location: 'sanpokong',
  },
  {
    id: '2',
    name: 'Pilates Intermediate',
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
    instructor: 'Jane Smith',
    start_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    capacity: 5,
    enrolled_count: 3,
    is_internal: true,
    is_cancelled: false,
    location: 'fotan',
  },
];

// Location labels will be retrieved from translations

type ViewType = 'month' | 'week' | 'day';

export default function ClassesPage() {
  const { t, i18n } = useTranslation();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<ViewType>('month');
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('all');
  const [form, setForm] = useState({
    name: '',
    instructor: '',
    start_time: '',
    end_time: '',
    capacity: 10,
    is_internal: false,
    location: 'sanpokong' as 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui',
  });

  useEffect(() => {
    loadClasses();
  }, []);

  async function loadClasses() {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setClasses(MOCK_CLASSES);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const newClass: Class = {
      id: Date.now().toString(),
      name: form.name,
      instructor: form.instructor,
      start_time: form.start_time,
      end_time: form.end_time,
      capacity: form.capacity,
      enrolled_count: 0,
      is_internal: form.is_internal,
      is_cancelled: false,
      location: form.location,
    };

    setClasses([newClass, ...classes]);
    alert(t('admin.classes.classCreated'));
    setShowModal(false);
    setForm({
      name: '',
      instructor: '',
      start_time: '',
      end_time: '',
      capacity: 10,
      is_internal: false,
      location: 'sanpokong',
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

    return (
      <div className="space-y-4">
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
                    <p className="text-gray-600 mb-1">{t('admin.classes.instructor')}: {classItem.instructor}</p>
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
              </div>
            ))}
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
            onClick={() => setShowModal(true)}
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
                  ? formatDate(currentDate) 
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

          {/* Calendar Grid */}
          {view === 'day' && renderDayView()}
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
                  <p className="text-gray-600 mb-1">{t('admin.classes.instructor')}: {classItem.instructor}</p>
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
            </div>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('admin.classes.createClass')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.classes.instructor')}</label>
                <input
                  type="text"
                  required
                  value={form.instructor}
                  onChange={(e) => setForm({ ...form, instructor: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
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
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  {t('admin.classes.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                >
                  {t('admin.classes.createClass')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
