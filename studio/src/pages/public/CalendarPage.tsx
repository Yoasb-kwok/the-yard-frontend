import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, Link } from 'react-router-dom';
import PublicLayout from '../../components/PublicLayout';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, Filter, X } from 'lucide-react';
import { theme } from '../../lib/theme';
import { useAuth } from '../../contexts/AuthContext';
import { getHongKongHolidayName, getAgeTagFromDateOfBirth } from '../../lib/utils';
import { CourseLevel, AgeTag } from '../../contexts/AuthContext';

interface Lesson {
  id: string;
  name: string;
  instructor: string;
  start_time: string;
  end_time: string;
  capacity: number;
  enrolled_count: number;
  location: 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui';
  program_code: string;
  level: CourseLevel;
  age_tag: AgeTag;
}

type ViewType = 'day' | 'threeDay' | 'week' | 'month';

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
      
      const classData = [
        { name: '幼兒街舞入門班', level: 'entry' as CourseLevel, ageTag: '5-8' as AgeTag, programCode: 'PSW6R3' },
        { name: '初階街舞基礎班', level: 'entry' as CourseLevel, ageTag: '5-8' as AgeTag, programCode: 'BSW6R9' },
        { name: '韓風小明星KPOP班', level: 'intermediate' as CourseLevel, ageTag: '9-12' as AgeTag, programCode: 'KPW1L1-FT' },
        { name: 'Yoga Basics', level: 'entry' as CourseLevel, ageTag: '9-12' as AgeTag, programCode: 'YG001' },
        { name: 'Pilates Core', level: 'intermediate' as CourseLevel, ageTag: '13-16' as AgeTag, programCode: 'PL002' },
        { name: 'Morning Stretch', level: 'entry' as CourseLevel, ageTag: '5-8' as AgeTag, programCode: 'MS003' },
        { name: 'Advanced Street Dance', level: 'advanced' as CourseLevel, ageTag: '13-16' as AgeTag, programCode: 'ASD001' },
        { name: 'Intermediate KPOP', level: 'intermediate' as CourseLevel, ageTag: '9-12' as AgeTag, programCode: 'IKP001' },
        { name: 'Advanced Yoga', level: 'advanced' as CourseLevel, ageTag: '13-16' as AgeTag, programCode: 'AYG001' },
      ];
      const instructors = ['Wawa', 'C+', 'Shirley', 'Jane Smith', 'John Doe', 'Sarah Johnson'];
      const locations: ('sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui')[] = ['sanpokong', 'causewaybay', 'fotan', 'sheungshui'];
      
      const selectedClass = classData[Math.floor(Math.random() * classData.length)];
      
      lessons.push({
        id: `lesson-${i}-${j}`,
        name: selectedClass.name,
        instructor: instructors[Math.floor(Math.random() * instructors.length)],
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        capacity: 15,
        enrolled_count: Math.floor(Math.random() * 10) + 5,
        location: locations[Math.floor(Math.random() * locations.length)],
        program_code: selectedClass.programCode,
        level: selectedClass.level,
        age_tag: selectedClass.ageTag,
      });
    }
  }
  
  return lessons;
};

const DUMMY_LESSONS = generateDummyLessons();

type LocationFilter = 'all' | 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui';

export default function CalendarPage() {
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view') as ViewType | null;
  const [view, setView] = useState<ViewType>(viewParam && ['day', 'threeDay', 'week', 'month'].includes(viewParam) ? viewParam : 'month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('all');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [showLessonModal, setShowLessonModal] = useState(false);
  
  const isStudent = user && profile?.role === 'student';

  useEffect(() => {
    loadLessons();
  }, [currentDate, view, profile]);

  // Update view when URL parameter changes
  useEffect(() => {
    const viewParam = searchParams.get('view') as ViewType | null;
    if (viewParam && ['day', 'threeDay', 'week', 'month'].includes(viewParam)) {
      const isMobile = window.innerWidth < 768; // md breakpoint
      // On mobile, only allow day and threeDay views
      if (isMobile && (viewParam === 'week' || viewParam === 'month')) {
        setView('day');
        setSearchParams({ view: 'day' });
      } 
      // On desktop, don't allow threeDay view
      else if (!isMobile && viewParam === 'threeDay') {
        setView('day');
        setSearchParams({ view: 'day' });
      } else {
        setView(viewParam);
      }
    }
  }, [searchParams, setSearchParams]);

  // Handle window resize - switch views based on screen size
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768; // md breakpoint
      // On mobile, switch from week/month to day
      if (isMobile && (view === 'week' || view === 'month')) {
        setView('day');
        setSearchParams({ view: 'day' });
      }
      // On desktop, switch from threeDay to day
      else if (!isMobile && view === 'threeDay') {
        setView('day');
        setSearchParams({ view: 'day' });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [view, setSearchParams]);

  async function loadLessons() {
    await new Promise(resolve => setTimeout(resolve, 300));
    let filteredLessons = DUMMY_LESSONS;
    
    // Filter lessons by student level if student is logged in
    if (isStudent && profile?.level) {
      filteredLessons = filteredLessons.filter(lesson => lesson.level === profile.level);
    }
    // Filter lessons by student age group (derived from date of birth) if student is logged in
    const profileAgeTag = getAgeTagFromDateOfBirth(profile?.date_of_birth ?? null);
    if (isStudent && profileAgeTag) {
      filteredLessons = filteredLessons.filter(lesson => lesson.age_tag === profileAgeTag);
    }
    
    setLessons(filteredLessons);
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
    // Use local date strings to avoid timezone issues
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    return lessons.filter(lesson => {
      const lessonDate = new Date(lesson.start_time);
      const lessonYear = lessonDate.getFullYear();
      const lessonMonth = lessonDate.getMonth();
      const lessonDay = lessonDate.getDate();
      const lessonDateStr = `${lessonYear}-${String(lessonMonth + 1).padStart(2, '0')}-${String(lessonDay).padStart(2, '0')}`;
      
      const dateMatches = lessonDateStr === dateStr;
      const locationMatches = locationFilter === 'all' || lesson.location === locationFilter;
      return dateMatches && locationMatches;
    });
  };

  // Get level tag styling
  const getLevelTag = (level: CourseLevel) => {
    const levelConfig = {
      entry: {
        label: t('calendar.level.entry'),
        className: 'bg-blue-100 text-blue-800 border-blue-200',
      },
      intermediate: {
        label: t('calendar.level.intermediate'),
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      },
      advanced: {
        label: t('calendar.level.advanced'),
        className: 'bg-purple-100 text-purple-800 border-purple-200',
      },
    };
    return levelConfig[level];
  };

  // Get age tag styling
  const getAgeTag = (ageTag: AgeTag) => {
    const ageConfig = {
      '5-8': {
        label: t('calendar.ageTag.5-8'),
        className: 'bg-teal-100 text-teal-800 border-teal-200',
      },
      '9-12': {
        label: t('calendar.ageTag.9-12'),
        className: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      },
      '13-16': {
        label: t('calendar.ageTag.13-16'),
        className: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      },
    };
    return ageConfig[ageTag];
  };


  // Map i18n language codes to locale strings for date formatting
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

  const formatDay = (date: Date): string => {
    return date.toLocaleDateString(getLocale(), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString(getLocale(), {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // Generate tutor profile image URL from UI Avatars
  const getTutorImageUrl = (name: string): string => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=128&background=random&color=fff&bold=true`;
  };

  // Get location-specific colors
  const getLocationColors = (location: 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui') => {
    const colorMap = {
      sanpokong: {
        primary: '#10b981', // Light green for 新蒲崗
        dark: '#059669',
        light: '#34d399',
        lighter: '#d1fae5',
      },
      causewaybay: {
        primary: '#a67c52', // Light brown for 銅鑼灣
        dark: '#8b6f47',
        light: '#c49b6a',
        lighter: '#f0e6d2',
      },
      fotan: {
        primary: '#f97316', // Light orange for 火炭
        dark: '#ea580c',
        light: '#fb923c',
        lighter: '#ffedd5',
      },
      sheungshui: {
        primary: '#3b82f6', // Light blue for 上水
        dark: '#2563eb',
        light: '#60a5fa',
        lighter: '#dbeafe',
      },
    };
    return colorMap[location];
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
  };

  const renderDayView = () => {
    const dayLessons = getLessonsForDate(currentDate);
    const holidayName = getHongKongHolidayName(currentDate);
    const locations: { value: LocationFilter; label: string }[] = [
      { value: 'all', label: t('calendar.allLocations') },
      { value: 'sanpokong', label: t('home.locations.sanpokong') },
      { value: 'causewaybay', label: t('home.locations.causewaybay') },
      { value: 'fotan', label: t('home.locations.fotan') },
      { value: 'sheungshui', label: t('home.locations.sheungshui') },
    ];

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
        {/* Location Filter */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3 mb-3">
            <Filter className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">{t('calendar.filterByLocation')}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {locations.map((loc) => {
              const isActive = locationFilter === loc.value;
              const colors = loc.value === 'all' 
                ? { primary: theme.colors.primary, dark: theme.colors.primaryDark }
                : getLocationColors(loc.value as 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui');
              
              return (
                <button
                  key={loc.value}
                  onClick={() => setLocationFilter(loc.value)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={isActive ? {
                    backgroundColor: colors.primary,
                  } : {}}
                >
                  {loc.label}
                </button>
              );
            })}
          </div>
        </div>

        {dayLessons.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 text-center py-8">{t('calendar.noLessons')}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {dayLessons.map((lesson) => {
              const locationColors = getLocationColors(lesson.location);
              
              return (
                <div 
                  key={lesson.id} 
                  className="bg-white rounded-xl shadow-lg border-2 border-gray-100 p-8 hover:shadow-2xl transition-all duration-300 flex flex-col transform hover:-translate-y-1"
                  style={{
                    borderColor: locationColors.lighter,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = locationColors.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = locationColors.lighter;
                  }}
                >
                  {/* Top accent border */}
                  <div 
                    className="h-1 rounded-t-xl -mx-8 -mt-8 mb-6"
                    style={{
                      background: `linear-gradient(to right, ${locationColors.primary}, ${locationColors.light})`,
                    }}
                  ></div>
                  
                  <div className="flex items-start justify-between mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 leading-tight pr-2">{lesson.name}</h3>
                    <div className="flex flex-col gap-2 items-end">
                      <span 
                        className="text-xs font-bold text-white px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0"
                        style={{
                          backgroundColor: locationColors.primary,
                        }}
                      >
                        {lesson.program_code}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-1 rounded border ${getLevelTag(lesson.level).className}`}>
                        {getLevelTag(lesson.level).label}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-1 rounded border ${getAgeTag(lesson.age_tag).className}`}>
                        {getAgeTag(lesson.age_tag).label}
                      </span>
                    </div>
                  </div>

                  {/* Tutor Profile */}
                  <div className="flex items-center mb-6 pb-6 border-b-2 border-gray-100">
                    <img
                      src={getTutorImageUrl(lesson.instructor)}
                      alt={lesson.instructor}
                      className="w-20 h-20 rounded-full object-cover mr-4"
                    />
                    <div>
                      <p className="text-base font-bold text-gray-900">{lesson.instructor}</p>
                    </div>
                  </div>

                  <div className="space-y-4 mb-6 flex-1">
                    <div className="flex items-center text-gray-800 rounded-lg p-3">
                      <Clock 
                        className="h-5 w-5 mr-3 flex-shrink-0" 
                        style={{ color: locationColors.primary }}
                      />
                      <span className="text-base font-semibold">
                        {formatTime(new Date(lesson.start_time))} - {formatTime(new Date(lesson.end_time))}
                      </span>
                    </div>
                    <div className="flex items-center text-gray-800 rounded-lg p-3">
                      <MapPin 
                        className="h-5 w-5 mr-3 flex-shrink-0" 
                        style={{ color: locationColors.primary }}
                      />
                      <span className="text-base font-semibold">{t(`home.locations.${lesson.location}`)}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Link
                      to={`/trial?classId=${lesson.id}`}
                      state={{
                        classData: {
                          id: lesson.id,
                          name: lesson.name,
                          instructor: lesson.instructor,
                          start_time: lesson.start_time,
                          end_time: lesson.end_time,
                          location: lesson.location,
                          program_code: lesson.program_code,
                          level: lesson.level,
                          age_tag: lesson.age_tag,
                        }
                      }}
                      className="w-full text-white px-6 py-3 rounded-lg text-base font-bold transition-all duration-300 text-center shadow-md hover:shadow-lg transform hover:scale-105 block"
                      style={{
                        backgroundColor: theme.colors.primary,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.colors.primaryDark;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = theme.colors.primary;
                      }}
                    >
                      {t('home.bookTrial')}
                    </Link>
                    {isStudent && (
                      <Link
                        to="/token-package"
                        state={{
                          classData: {
                            id: lesson.id,
                            name: lesson.name,
                            instructor: lesson.instructor,
                            start_time: lesson.start_time,
                            end_time: lesson.end_time,
                            location: lesson.location,
                            program_code: lesson.program_code,
                            level: lesson.level,
                            age_tag: lesson.age_tag,
                          }
                        }}
                        className="w-full text-white px-6 py-3 rounded-lg text-base font-bold transition-all duration-300 text-center shadow-md hover:shadow-lg transform hover:scale-105 block"
                        style={{
                          backgroundColor: locationColors.primary,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = locationColors.dark;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = locationColors.primary;
                        }}
                      >
                        {t('calendar.enroll')}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setShowLessonModal(true);
  };

  const renderThreeDayView = () => {
    const threeDays = Array.from({ length: 3 }, (_, i) => {
      const d = new Date(currentDate);
      d.setDate(currentDate.getDate() + i);
      return d;
    });
    const locations: { value: LocationFilter; label: string }[] = [
      { value: 'all', label: t('calendar.allLocations') },
      { value: 'sanpokong', label: t('home.locations.sanpokong') },
      { value: 'causewaybay', label: t('home.locations.causewaybay') },
      { value: 'fotan', label: t('home.locations.fotan') },
      { value: 'sheungshui', label: t('home.locations.sheungshui') },
    ];

    return (
      <div className="space-y-4">
        {/* Location Filter */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3 mb-3">
            <Filter className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">{t('calendar.filterByLocation')}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {locations.map((loc) => {
              const isActive = locationFilter === loc.value;
              const colors = loc.value === 'all' 
                ? { primary: theme.colors.primary, dark: theme.colors.primaryDark }
                : getLocationColors(loc.value as 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui');
              
              return (
                <button
                  key={loc.value}
                  onClick={() => setLocationFilter(loc.value)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={isActive ? {
                    backgroundColor: colors.primary,
                  } : {}}
                >
                  {loc.label}
                </button>
              );
            })}
          </div>
        </div>

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
              const dayLessons = getLessonsForDate(day);
              const isToday = day.toDateString() === new Date().toDateString();
              const holidayName = getHongKongHolidayName(day);
              
              return (
                <div
                  key={idx}
                  className={`border-r last:border-r-0 p-2 ${
                    isToday ? 'bg-primary-lighter' : ''
                  }`}
                >
                  {holidayName && (
                    <div className="text-xs text-gray-400 mb-2 italic truncate" title={holidayName}>
                      {holidayName}
                    </div>
                  )}
                  {dayLessons.map((lesson) => {
                    const locationColors = getLocationColors(lesson.location);
                    const levelTag = getLevelTag(lesson.level);
                    const ageTag = getAgeTag(lesson.age_tag);
                    return (
                      <div
                        key={lesson.id}
                        className="mb-2 p-2 text-white rounded text-xs cursor-pointer transition-all hover:shadow-md"
                        style={{
                          backgroundColor: locationColors.primary,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = locationColors.dark;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = locationColors.primary;
                        }}
                        onClick={() => handleLessonClick(lesson)}
                      >
                        <div className="font-medium truncate">{lesson.name}</div>
                        <div className="text-white/70 text-xs mt-1 truncate">
                          {lesson.instructor}
                        </div>
                        <div className="text-white/80 text-xs mt-0.5">
                          {formatTime(new Date(lesson.start_time))}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${levelTag.className}`}>{levelTag.label}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${ageTag.className}`}>{ageTag.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
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
    const locations: { value: LocationFilter; label: string }[] = [
      { value: 'all', label: t('calendar.allLocations') },
      { value: 'sanpokong', label: t('home.locations.sanpokong') },
      { value: 'causewaybay', label: t('home.locations.causewaybay') },
      { value: 'fotan', label: t('home.locations.fotan') },
      { value: 'sheungshui', label: t('home.locations.sheungshui') },
    ];

    return (
      <div className="space-y-4">
        {/* Location Filter */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3 mb-3">
            <Filter className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">{t('calendar.filterByLocation')}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {locations.map((loc) => {
              const isActive = locationFilter === loc.value;
              const colors = loc.value === 'all' 
                ? { primary: theme.colors.primary, dark: theme.colors.primaryDark }
                : getLocationColors(loc.value as 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui');
              
              return (
                <button
                  key={loc.value}
                  onClick={() => setLocationFilter(loc.value)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={isActive ? {
                    backgroundColor: colors.primary,
                  } : {}}
                >
                  {loc.label}
                </button>
              );
            })}
          </div>
        </div>

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
              const dayLessons = getLessonsForDate(day);
              const isToday = day.toDateString() === new Date().toDateString();
              const holidayName = getHongKongHolidayName(day);
              
              return (
                <div
                  key={idx}
                  className={`border-r last:border-r-0 p-2 ${
                    isToday ? 'bg-primary-lighter' : ''
                  }`}
                >
                  {holidayName && (
                    <div className="text-xs text-gray-400 mb-2 italic truncate" title={holidayName}>
                      {holidayName}
                    </div>
                  )}
                  {dayLessons.map((lesson) => {
                    const locationColors = getLocationColors(lesson.location);
                    const levelTag = getLevelTag(lesson.level);
                    const ageTag = getAgeTag(lesson.age_tag);
                    return (
                      <div
                        key={lesson.id}
                        className="mb-2 p-2 text-white rounded text-xs cursor-pointer transition-all hover:shadow-md"
                        style={{
                          backgroundColor: locationColors.primary,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = locationColors.dark;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = locationColors.primary;
                        }}
                        onClick={() => handleLessonClick(lesson)}
                      >
                        <div className="font-medium truncate">{lesson.name}</div>
                        <div className="text-white/70 text-xs mt-1 truncate">
                          {lesson.instructor}
                        </div>
                        <div className="text-white/80 text-xs mt-0.5">
                          {formatTime(new Date(lesson.start_time))}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${levelTag.className}`}>{levelTag.label}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${ageTag.className}`}>{ageTag.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
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

    const locations: { value: LocationFilter; label: string }[] = [
      { value: 'all', label: t('calendar.allLocations') },
      { value: 'sanpokong', label: t('home.locations.sanpokong') },
      { value: 'causewaybay', label: t('home.locations.causewaybay') },
      { value: 'fotan', label: t('home.locations.fotan') },
      { value: 'sheungshui', label: t('home.locations.sheungshui') },
    ];

    return (
      <div className="space-y-4">
        {/* Location Filter */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3 mb-3">
            <Filter className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">{t('calendar.filterByLocation')}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {locations.map((loc) => {
              const isActive = locationFilter === loc.value;
              const colors = loc.value === 'all' 
                ? { primary: theme.colors.primary, dark: theme.colors.primaryDark }
                : getLocationColors(loc.value as 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui');
              
              return (
                <button
                  key={loc.value}
                  onClick={() => setLocationFilter(loc.value)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={isActive ? {
                    backgroundColor: colors.primary,
                  } : {}}
                >
                  {loc.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {weekDays.map((day, idx) => (
            <div key={idx} className="p-3 text-center bg-gray-50 font-medium text-gray-700 border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const dayLessons = getLessonsForDate(day);
            const isToday = day.toDateString() === new Date().toDateString();
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const holidayName = getHongKongHolidayName(day);
            
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
                {holidayName && (
                  <div className="text-xs text-gray-400 mb-1 italic truncate" title={holidayName}>
                    {holidayName}
                  </div>
                )}
                <div className="space-y-1">
                  {dayLessons.slice(0, 3).map((lesson) => {
                    const locationColors = getLocationColors(lesson.location);
                    const levelTag = getLevelTag(lesson.level);
                    const ageTag = getAgeTag(lesson.age_tag);
                    return (
                      <div
                        key={lesson.id}
                        className="text-xs p-1 text-white rounded cursor-pointer transition-colors"
                        style={{
                          backgroundColor: locationColors.primary,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = locationColors.dark;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = locationColors.primary;
                        }}
                        title={`${lesson.name} - ${lesson.instructor} - ${formatTime(new Date(lesson.start_time))} - ${levelTag.label} - ${ageTag.label}`}
                        onClick={() => handleLessonClick(lesson)}
                      >
                        <div className="truncate">
                          {formatTime(new Date(lesson.start_time))} {lesson.name}
                        </div>
                        <div className="truncate text-white/80">
                          {lesson.instructor}
                        </div>
                        <div className="flex flex-wrap gap-0.5 mt-0.5">
                          <span className={`text-xs px-1 py-0.5 rounded ${levelTag.className}`}>{levelTag.label}</span>
                          <span className={`text-xs px-1 py-0.5 rounded ${ageTag.className}`}>{ageTag.label}</span>
                        </div>
                      </div>
                    );
                  })}
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
                onClick={() => {
                  setView('day');
                  setSearchParams({ view: 'day' });
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === 'day'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('calendar.day')}
              </button>
              {/* Show 3 Days only on mobile */}
              <button
                onClick={() => {
                  setView('threeDay');
                  setSearchParams({ view: 'threeDay' });
                }}
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
                onClick={() => {
                  setView('week');
                  setSearchParams({ view: 'week' });
                }}
                className={`hidden md:block px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === 'week'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('calendar.week')}
              </button>
              <button
                onClick={() => {
                  setView('month');
                  setSearchParams({ view: 'month' });
                }}
                className={`hidden md:block px-4 py-2 rounded-md text-sm font-medium transition-colors ${
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
                : view === 'threeDay'
                ? (() => {
                    const day1 = new Date(currentDate);
                    const day3 = new Date(currentDate);
                    day3.setDate(currentDate.getDate() + 2);
                    return `${formatDay(day1)} - ${formatDay(day3)}`;
                  })()
                : formatDay(currentDate)
              }
            </h2>
          </div>
        </div>

        {/* Calendar View */}
        <div>
          {view === 'day' && renderDayView()}
          {view === 'threeDay' && renderThreeDayView()}
          {view === 'week' && renderWeekView()}
          {view === 'month' && renderMonthView()}
        </div>
      </div>

      {/* Lesson Details Modal */}
      {showLessonModal && selectedLesson && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setShowLessonModal(false)}
            ></div>

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              {(() => {
                const locationColors = getLocationColors(selectedLesson.location);
                
                return (
                  <div className="bg-white">
                    {/* Header with location color accent */}
                    <div
                      className="h-2"
                      style={{
                        background: `linear-gradient(to right, ${locationColors.primary}, ${locationColors.light})`,
                      }}
                    ></div>
                    
                    <div className="p-6">
                      {/* Close button */}
                      <div className="flex justify-end mb-4">
                        <button
                          onClick={() => setShowLessonModal(false)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <X className="h-6 w-6" />
                        </button>
                      </div>

                      {/* Class Name and Program Code */}
                      <div className="flex items-start justify-between mb-6">
                        <h3 className="text-2xl font-bold text-gray-900 leading-tight pr-2">
                          {selectedLesson.name}
                        </h3>
                        <div className="flex flex-col gap-2 items-end">
                          <span
                            className="text-xs font-bold text-white px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0"
                            style={{
                              backgroundColor: locationColors.primary,
                            }}
                          >
                            {selectedLesson.program_code}
                          </span>
                          <span className={`text-xs font-semibold px-2 py-1 rounded border ${getLevelTag(selectedLesson.level).className}`}>
                            {getLevelTag(selectedLesson.level).label}
                          </span>
                          <span className={`text-xs font-semibold px-2 py-1 rounded border ${getAgeTag(selectedLesson.age_tag).className}`}>
                            {getAgeTag(selectedLesson.age_tag).label}
                          </span>
                        </div>
                      </div>

                      {/* Tutor Profile */}
                      <div className="flex items-center mb-6 pb-6 border-b-2 border-gray-100">
                        <img
                          src={getTutorImageUrl(selectedLesson.instructor)}
                          alt={selectedLesson.instructor}
                          className="w-20 h-20 rounded-full object-cover mr-4"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">{t('home.tutor')}</p>
                          <p className="text-lg font-bold text-gray-900">{selectedLesson.instructor}</p>
                        </div>
                      </div>

                      {/* Class Details */}
                      <div className="space-y-4 mb-6">
                        <div className="flex items-center text-gray-800 rounded-lg p-3">
                          <Calendar
                            className="h-5 w-5 mr-3 flex-shrink-0"
                            style={{ color: locationColors.primary }}
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">{t('trial.classDate')}</p>
                            <p className="text-base font-semibold">
                              {new Date(selectedLesson.start_time).toLocaleDateString(getLocale(), {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                weekday: 'long',
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center text-gray-800 rounded-lg p-3">
                          <Clock
                            className="h-5 w-5 mr-3 flex-shrink-0"
                            style={{ color: locationColors.primary }}
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">{t('trial.classTime')}</p>
                            <p className="text-base font-semibold">
                              {formatTime(new Date(selectedLesson.start_time))} - {formatTime(new Date(selectedLesson.end_time))}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center text-gray-800 rounded-lg p-3">
                          <MapPin
                            className="h-5 w-5 mr-3 flex-shrink-0"
                            style={{ color: locationColors.primary }}
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">{t('home.location')}</p>
                            <p className="text-base font-semibold">
                              {t(`home.locations.${selectedLesson.location}`)}
                            </p>
                          </div>
                        </div>

                      </div>

                      {/* Book Trial Button */}
                      <div className="space-y-3">
                        <Link
                          to={`/trial?classId=${selectedLesson.id}`}
                          state={{
                            classData: {
                              id: selectedLesson.id,
                              name: selectedLesson.name,
                              instructor: selectedLesson.instructor,
                              start_time: selectedLesson.start_time,
                              end_time: selectedLesson.end_time,
                              location: selectedLesson.location,
                              program_code: selectedLesson.program_code,
                              level: selectedLesson.level,
                              age_tag: selectedLesson.age_tag,
                            }
                          }}
                          className="w-full text-white px-6 py-3 rounded-lg text-base font-bold transition-all duration-300 text-center shadow-md hover:shadow-lg transform hover:scale-105 block"
                          style={{
                            backgroundColor: locationColors.primary,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = locationColors.dark;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = locationColors.primary;
                          }}
                          onClick={() => setShowLessonModal(false)}
                        >
                          {t('home.bookTrial')}
                        </Link>
                        {isStudent && (
                          <Link
                            to="/token-package"
                            state={{
                              classData: {
                                id: selectedLesson.id,
                                name: selectedLesson.name,
                                instructor: selectedLesson.instructor,
                                start_time: selectedLesson.start_time,
                                end_time: selectedLesson.end_time,
                                location: selectedLesson.location,
                                program_code: selectedLesson.program_code,
                                level: selectedLesson.level,
                                age_tag: selectedLesson.age_tag,
                              }
                            }}
                            className="w-full text-white px-6 py-3 rounded-lg text-base font-bold transition-all duration-300 text-center shadow-md hover:shadow-lg transform hover:scale-105 block"
                            style={{
                              backgroundColor: locationColors.primary,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = locationColors.dark;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = locationColors.primary;
                            }}
                            onClick={() => setShowLessonModal(false)}
                          >
                            {t('calendar.enroll')}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}

