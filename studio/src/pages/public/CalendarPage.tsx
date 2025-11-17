import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import { Calendar, ChevronLeft, ChevronRight, Clock, Users } from 'lucide-react';

interface Lesson {
  id: string;
  name: string;
  instructor: string;
  start_time: string;
  end_time: string;
  capacity: number;
  enrolled_count: number;
}

type ViewType = 'day' | 'week' | 'month';

// Dummy lesson data for the next 30 days
const generateDummyLessons = (): Lesson[] => {
  const lessons: Lesson[] = [];
  const today = new Date();
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    // Add 2-3 lessons per day
    const numLessons = Math.floor(Math.random() * 2) + 2;
    
    for (let j = 0; j < numLessons; j++) {
      const hour = 9 + j * 3 + Math.floor(Math.random() * 2);
      const startTime = new Date(date);
      startTime.setHours(hour, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setHours(hour + 1, 0, 0, 0);
      
      const classNames = ['Yoga Basics', 'Pilates Core', 'Morning Stretch', 'Evening Flow', 'Power Yoga', 'Gentle Yoga'];
      const instructors = ['Jane Smith', 'John Doe', 'Sarah Johnson', 'Mike Chen'];
      
      lessons.push({
        id: `lesson-${i}-${j}`,
        name: classNames[Math.floor(Math.random() * classNames.length)],
        instructor: instructors[Math.floor(Math.random() * instructors.length)],
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        capacity: 15,
        enrolled_count: Math.floor(Math.random() * 10) + 5,
      });
    }
  }
  
  return lessons;
};

const DUMMY_LESSONS = generateDummyLessons();

export default function CalendarPage() {
  const { t } = useTranslation();
  const [view, setView] = useState<ViewType>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lessons, setLessons] = useState<Lesson[]>([]);

  useEffect(() => {
    loadLessons();
  }, [currentDate, view]);

  async function loadLessons() {
    await new Promise(resolve => setTimeout(resolve, 300));
    setLessons(DUMMY_LESSONS);
  }

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

  const getLessonsForDate = (date: Date): Lesson[] => {
    const dateStr = date.toISOString().split('T')[0];
    return lessons.filter(lesson => {
      const lessonDate = new Date(lesson.start_time).toISOString().split('T')[0];
      return lessonDate === dateStr;
    });
  };

  const getLessonsForWeek = (startDate: Date): Lesson[] => {
    const endDate = getEndOfWeek(startDate);
    return lessons.filter(lesson => {
      const lessonDate = new Date(lesson.start_time);
      return lessonDate >= startDate && lessonDate <= endDate;
    });
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatDay = (date: Date): string => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
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
  };

  const renderDayView = () => {
    const dayLessons = getLessonsForDate(currentDate);
    const hours = Array.from({ length: 12 }, (_, i) => i + 8);

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            {formatDay(currentDate)}
          </h3>
          <div className="space-y-3">
            {dayLessons.length === 0 ? (
              <p className="text-gray-600 text-center py-8">{t('calendar.noLessons')}</p>
            ) : (
              dayLessons.map((lesson) => (
                <div key={lesson.id} className="border-l-4 border-primary p-4 bg-primary-lighter rounded">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{lesson.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">with {lesson.instructor}</p>
                      <div className="flex items-center text-sm text-gray-500 mt-2">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatTime(new Date(lesson.start_time))} - {formatTime(new Date(lesson.end_time))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-1" />
                        {lesson.enrolled_count} / {lesson.capacity}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
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
    const weekLessons = getLessonsForWeek(startOfWeek);

    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {weekDays.map((day, idx) => (
            <div key={idx} className="border-r last:border-r-0 p-3 text-center bg-gray-50">
              <div className="text-sm font-medium text-gray-600">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
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
            const dayLessons = getLessonsForDate(day);
            const isToday = day.toDateString() === new Date().toDateString();
            
            return (
              <div
                key={idx}
                className={`border-r last:border-r-0 p-2 ${
                  isToday ? 'bg-primary-lighter' : ''
                }`}
              >
                {dayLessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="mb-2 p-2 bg-primary text-white rounded text-xs cursor-pointer hover:bg-primary-dark transition-colors"
                  >
                    <div className="font-medium truncate">{lesson.name}</div>
                    <div className="text-white/80 text-xs mt-1">
                      {formatTime(new Date(lesson.start_time))}
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
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {weekDays.map((day) => (
            <div key={day} className="p-3 text-center bg-gray-50 font-medium text-gray-700 border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const dayLessons = getLessonsForDate(day);
            const isToday = day.toDateString() === new Date().toDateString();
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            
            return (
              <div
                key={idx}
                className={`min-h-[100px] border-r border-b last:border-r-0 p-2 ${
                  isToday ? 'bg-primary-lighter' : ''
                } ${!isCurrentMonth ? 'bg-gray-50' : ''}`}
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
                  {dayLessons.slice(0, 3).map((lesson) => (
                    <div
                      key={lesson.id}
                      className="text-xs p-1 bg-primary text-white rounded truncate cursor-pointer hover:bg-primary-dark transition-colors"
                      title={`${lesson.name} - ${formatTime(new Date(lesson.start_time))}`}
                    >
                      {formatTime(new Date(lesson.start_time))} {lesson.name}
                    </div>
                  ))}
                  {dayLessons.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{dayLessons.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{t('calendar.title')}</h1>
          
          {/* View Switcher and Navigation */}
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
                {t('calendar.day')}
              </button>
              <button
                onClick={() => setView('week')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === 'week'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('calendar.week')}
              </button>
              <button
                onClick={() => setView('month')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === 'month'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('calendar.month')}
              </button>
            </div>

            <div className="flex items-center gap-4">
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
                {t('calendar.today')}
              </button>
              <button
                onClick={() => navigateDate('next')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Date Display */}
          <div className="mb-4">
            <h2 className="text-2xl font-semibold text-gray-900">
              {view === 'month' 
                ? formatDate(currentDate)
                : view === 'week'
                ? `${formatDay(getStartOfWeek(currentDate))} - ${formatDay(getEndOfWeek(currentDate))}`
                : formatDay(currentDate)
              }
            </h2>
          </div>
        </div>

        {/* Calendar View */}
        <div>
          {view === 'day' && renderDayView()}
          {view === 'week' && renderWeekView()}
          {view === 'month' && renderMonthView()}
        </div>
      </div>
    </PublicLayout>
  );
}

