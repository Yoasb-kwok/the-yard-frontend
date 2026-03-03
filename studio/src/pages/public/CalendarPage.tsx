import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, Link } from 'react-router-dom';
import PublicLayout from '../../components/PublicLayout';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, Filter, X, Repeat, Info } from 'lucide-react';
import { theme } from '../../lib/theme';
import { useAuth } from '../../contexts/AuthContext';
import { getAgeTagFromDateOfBirth, getDateStringFromStartTime, formatProgramCodeDisplay, getNextNonHolidayDateWithSet } from '../../lib/utils';
import { useHolidays } from '../../lib/useHolidays';
import InstructorIntroCard from '../../components/InstructorIntroCard';
import { getInstructorProfile } from '../../lib/instructorProfiles';
import { api } from '../../lib/api';
import { CourseLevel, AgeTag } from '../../contexts/AuthContext';
import { getFallbackCalendarLessons } from '../../lib/demoCourses';
import { useModalA11y } from '../../lib/useModalA11y';

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
  /** Lesson number in the course (1, 2, 3…). Shown as L01, L02. */
  lesson_number?: number | null;
  level: CourseLevel;
  age_tag: AgeTag;
  /** 0=Sun, 1=Mon, ..., 6=Sat. Recurring weekday for this class. */
  weekday: number;
  /** Total lessons in the course (4, 8, or 16 – 每週一次). */
  total_lessons: 4 | 8 | 16;
}

type ViewType = 'day' | 'threeDay' | 'week' | 'month';

const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

type LocationFilter = 'all' | 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui';

/** Time-grid layout (Google Calendar style): 8:00–22:00, 30-min slots */
const TIME_GRID_START_HOUR = 8;
const TIME_GRID_END_HOUR = 22;
const TIME_GRID_ROW_HEIGHT_PX = 48;
/** 週視圖方塊最小高度，讓不同時長的課程方塊視覺一致 */
const WEEK_VIEW_EVENT_MIN_HEIGHT_PX = 48;
/** 重疊時段內每個課程方塊的最小寬度（px），以便完整顯示課程名稱 */
const WEEK_VIEW_OVERLAP_EVENT_MIN_WIDTH_PX = 100;

export default function CalendarPage() {
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();
  const { getHolidayName, holidayDatesSet } = useHolidays();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view') as ViewType | null;
  const [view, setView] = useState<ViewType>(viewParam && ['day', 'threeDay', 'week', 'month'].includes(viewParam) ? viewParam : 'month');
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setFullYear(2026);
    d.setMonth(1); // February
    return d;
  });
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonsError, setLessonsError] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('all');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [calendarFilterMode, setCalendarFilterMode] = useState<'suggested' | 'all'>('suggested');
  const [isNarrowScreen, setIsNarrowScreen] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const lessonModalRef = useRef<HTMLDivElement>(null);
  useModalA11y(showLessonModal && !!selectedLesson, () => { setShowLessonModal(false); setSelectedLesson(null); }, lessonModalRef);

  useEffect(() => {
    const onResize = () => setIsNarrowScreen(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isStudent = user && profile?.role === 'student';
  const profileAgeTag = getAgeTagFromDateOfBirth(profile?.date_of_birth ?? null);
  const displayLessons = !isStudent
    ? lessons
    : calendarFilterMode === 'suggested'
      ? lessons.filter((l) => l.level === profile?.level && l.age_tag === profileAgeTag)
      : lessons;
  const isLessonSuggested = (lesson: Lesson): boolean =>
    !isStudent || ((!profile?.level || lesson.level === profile.level) && (!profileAgeTag || lesson.age_tag === profileAgeTag));

  /** Each lesson with display date: if original date is a holiday, show on next week same day (順延). */
  const lessonsWithDisplay = useMemo(() => {
    const set = holidayDatesSet;
    return displayLessons.map((lesson) => {
      const start = new Date(lesson.start_time);
      const y = start.getFullYear();
      const m = String(start.getMonth() + 1).padStart(2, '0');
      const d = String(start.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      if (!set.has(dateStr))
        return { lesson, displayDateStr: dateStr, isPostponed: false as const, originalDateStr: undefined as string | undefined };
      const next = getNextNonHolidayDateWithSet(start, set);
      const ny = next.getFullYear();
      const nm = String(next.getMonth() + 1).padStart(2, '0');
      const nd = String(next.getDate()).padStart(2, '0');
      return { lesson, displayDateStr: `${ny}-${nm}-${nd}`, isPostponed: true as const, originalDateStr: dateStr };
    });
  }, [displayLessons, holidayDatesSet]);

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
    setLessonsLoading(true);
    setLessonsError(null);
    try {
      // Public 課程表: use public endpoint so unauthenticated users get DB data (same getClassesList as admin)
      const response = await api.get<any[]>('/classes');
      const rows = Array.isArray(response?.data) ? response.data : [];
      if (!response?.success) {
        setLessons(getFallbackCalendarLessons(currentDate));
        return;
      }
      const programTotalLessons: Record<string, number> = {};
      for (const row of rows) {
        const code = (row.program_code || '').toString().trim() || 'default';
        const num = row.lesson_number != null ? Number(row.lesson_number) : 1;
        programTotalLessons[code] = Math.max(programTotalLessons[code] ?? 0, num);
      }
      const clampTotal = (n: number): 4 | 8 | 16 => (n >= 16 ? 16 : n >= 8 ? 8 : 4);
      const mapped: Lesson[] = rows
        .filter((row: any) => !(row.is_cancelled === 1 || row.is_cancelled === true))
        .map((cls: any) => {
          const startTime = cls.start_time instanceof Date ? cls.start_time : new Date(cls.start_time);
          const startTimeStr = typeof cls.start_time === 'string' ? cls.start_time : startTime.toISOString();
          const programCode = (cls.program_code || '').toString().trim();
          const total = programTotalLessons[programCode || 'default'] ?? 8;
          return {
            id: String(cls.id),
            name: cls.name || '',
            instructor: cls.instructor || cls.substitute_instructor || '',
            start_time: startTimeStr,
            end_time: typeof cls.end_time === 'string' ? cls.end_time : (cls.end_time instanceof Date ? cls.end_time : new Date(cls.end_time)).toISOString(),
            capacity: cls.capacity ?? 0,
            enrolled_count: cls.enrolled_count ?? 0,
            location: (cls.location || 'sanpokong') as Lesson['location'],
            program_code: programCode,
            lesson_number: cls.lesson_number != null ? Number(cls.lesson_number) : null,
            level: (cls.level || 'entry') as CourseLevel,
            age_tag: (cls.age_group || '9-12') as AgeTag,
            weekday: startTime.getDay(),
            total_lessons: clampTotal(total) as 4 | 8 | 16,
          };
        });
      setLessons(mapped.length > 0 ? mapped : getFallbackCalendarLessons(currentDate));
    } catch (error) {
      console.error('Error loading calendar classes:', error);
      setLessons(getFallbackCalendarLessons(currentDate));
      const msg = error instanceof Error ? error.message : 'Failed to load classes';
      if (!msg.includes('Network') && !msg.includes('fetch')) {
        setLessonsError(msg);
      } else {
        setLessonsError(null);
      }
    } finally {
      setLessonsLoading(false);
    }
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

  /** Returns lessons to show on this date (holiday-postponed lessons appear on their 順延 date). */
  const getLessonsForDate = (date: Date): { lesson: Lesson; _postponedFrom?: string }[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    return lessonsWithDisplay
      .filter(
        (x) =>
          x.displayDateStr === dateStr &&
          (locationFilter === 'all' || x.lesson.location === locationFilter)
      )
      .map((x) => ({ lesson: x.lesson, _postponedFrom: x.isPostponed ? x.originalDateStr : undefined }));
  };

  /**
   * For time-grid view: get events for a day with start/end in minutes from midnight,
   * and column index for overlapping events (side-by-side like Google Calendar).
   */
  const getDayEventsForTimeGrid = (day: Date): { lesson: Lesson; _postponedFrom?: string; startMinutes: number; endMinutes: number; columnIndex: number; totalColumns: number }[] => {
    const dayLessons = getLessonsForDate(day);
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const startMin = TIME_GRID_START_HOUR * 60;
    const endMin = TIME_GRID_END_HOUR * 60;

    const events: { lesson: Lesson; _postponedFrom?: string; startMinutes: number; endMinutes: number }[] = [];
    for (const { lesson, _postponedFrom } of dayLessons) {
      const start = new Date(lesson.start_time);
      const end = new Date(lesson.end_time);
      const displayStart = new Date(dayStart);
      displayStart.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), 0);
      const displayEnd = new Date(dayStart);
      displayEnd.setHours(end.getHours(), end.getMinutes(), end.getSeconds(), 0);
      let sm = displayStart.getHours() * 60 + displayStart.getMinutes();
      let em = displayEnd.getHours() * 60 + displayEnd.getMinutes();
      if (displayEnd <= displayStart) em += 24 * 60;
      sm = Math.max(startMin, Math.min(endMin, sm));
      em = Math.max(startMin, Math.min(endMin, em));
      if (sm < em) events.push({ lesson, _postponedFrom, startMinutes: sm, endMinutes: em });
    }
    events.sort((a, b) => a.startMinutes - b.startMinutes);

    const columnAssignments = new Map<typeof events[0], number>();
    for (const ev of events) {
      const overlapping = events.filter(
        (o) => ev.startMinutes < o.endMinutes && ev.endMinutes > o.startMinutes
      );
      const used = new Set(
        overlapping.filter((o) => columnAssignments.has(o)).map((o) => columnAssignments.get(o)!)
      );
      let k = 0;
      while (used.has(k)) k++;
      columnAssignments.set(ev, k);
    }
    const withColumns = events.map((ev) => {
      const overlapping = events.filter(
        (o) => ev.startMinutes < o.endMinutes && ev.endMinutes > o.startMinutes
      );
      const columnIndex = columnAssignments.get(ev)!;
      const totalColumns = overlapping.length > 0
        ? Math.max(...overlapping.map((o) => columnAssignments.get(o)!)) + 1
        : 1;
      return { ...ev, columnIndex, totalColumns };
    });
    return withColumns;
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

  const formatShortDate = (ymd: string): string => {
    const d = new Date(ymd + 'T12:00:00');
    return d.toLocaleDateString(getLocale(), { month: 'short', day: 'numeric' });
  };

  // Generate tutor profile image URL from UI Avatars
  // Use admin-set profile avatar when available (synced with 導師主頁 / admin 導師管理)
  const getTutorImageUrl = (name: string): string => {
    const profile = getInstructorProfile(name);
    if (profile?.avatar_url) return profile.avatar_url;
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
    const holidayName = getHolidayName(currentDate);
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
          (() => {
            const dayEvents = getDayEventsForTimeGrid(currentDate);
            const gridHeightPx = (TIME_GRID_END_HOUR - TIME_GRID_START_HOUR) * TIME_GRID_ROW_HEIGHT_PX;
            const startMin = TIME_GRID_START_HOUR * 60;
            const hourLabels = Array.from(
              { length: TIME_GRID_END_HOUR - TIME_GRID_START_HOUR },
              (_, i) => `${String(TIME_GRID_START_HOUR + i).padStart(2, '0')}:00`
            );
            return (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="flex border-b" style={{ minHeight: gridHeightPx }}>
                  <div className="w-14 flex-shrink-0 border-r bg-gray-50/80">
                    {hourLabels.map((label) => (
                      <div
                        key={label}
                        className="text-xs text-gray-500 pr-1 text-right border-t border-gray-100 first:border-t-0"
                        style={{ height: TIME_GRID_ROW_HEIGHT_PX }}
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                  <div
                    className="flex-1 relative min-w-0"
                    style={{ minHeight: gridHeightPx }}
                  >
                    {dayEvents.map(({ lesson, _postponedFrom, startMinutes, endMinutes, columnIndex, totalColumns }) => {
                      const locationColors = getLocationColors(lesson.location);
                      const suggested = isLessonSuggested(lesson);
                      const topPx = ((startMinutes - startMin) / 60) * TIME_GRID_ROW_HEIGHT_PX;
                      const heightPx = ((endMinutes - startMinutes) / 60) * TIME_GRID_ROW_HEIGHT_PX;
                      const leftPct = totalColumns > 0 ? (columnIndex / totalColumns) * 100 : 0;
                      const widthPct = totalColumns > 0 ? 100 / totalColumns : 100;
                      const gap = 1;
                      const leftAdj = leftPct + (gap / totalColumns) * columnIndex;
                      const widthAdj = widthPct - gap;
                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() => handleLessonClick(lesson)}
                          className={`absolute left-0.5 right-0.5 text-left rounded overflow-hidden transition-all ${suggested ? 'hover:ring-2 hover:ring-offset-1 hover:ring-primary/50' : 'opacity-80'}`}
                          style={{
                            top: topPx + 2,
                            height: Math.max(heightPx - 4, 24),
                            left: `${leftAdj}%`,
                            width: `${widthAdj}%`,
                            backgroundColor: locationColors.lighter,
                            borderLeft: `4px solid ${locationColors.primary}`,
                          }}
                          title={`${lesson.name} · ${lesson.instructor} · ${formatTime(new Date(lesson.start_time))}${_postponedFrom ? ` · ${t('calendar.postponedFromHoliday', { date: formatShortDate(_postponedFrom) })}` : ''}`}
                        >
                          <div className="p-1.5 h-full overflow-hidden flex flex-col justify-center">
                            <span className="text-sm font-semibold text-gray-900 truncate">{lesson.name}</span>
                            <span className="text-xs text-gray-600 truncate">{formatTime(new Date(lesson.start_time))}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()
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
              const dayLessons = getLessonsForDate(day);
              const isToday = day.toDateString() === new Date().toDateString();
              const holidayName = getHolidayName(day);
              
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
                  {dayLessons.map(({ lesson, _postponedFrom }) => {
                    const locationColors = getLocationColors(lesson.location);
                    const levelTag = getLevelTag(lesson.level);
                    const ageTag = getAgeTag(lesson.age_tag);
                    const suggested = isLessonSuggested(lesson);
                    return (
                      <div
                        key={lesson.id}
                        role="button"
                        tabIndex={0}
                        className={`mb-2 p-2 text-white rounded text-xs cursor-pointer transition-all truncate ${suggested ? 'hover:shadow-md' : 'opacity-70'}`}
                        style={{
                          backgroundColor: locationColors.primary,
                        }}
                        onMouseEnter={suggested ? (e) => {
                          e.currentTarget.style.backgroundColor = locationColors.dark;
                        } : undefined}
                        onMouseLeave={suggested ? (e) => {
                          e.currentTarget.style.backgroundColor = locationColors.primary;
                        } : undefined}
                        onClick={(e) => { e.stopPropagation(); handleLessonClick(lesson); }}
                        title={`${lesson.name} · ${lesson.instructor} · ${formatTime(new Date(lesson.start_time))}${_postponedFrom ? ` · ${t('calendar.postponedFromHoliday', { date: formatShortDate(_postponedFrom) })}` : ''}`}
                      >
                        <div className="font-medium truncate">{lesson.name}</div>
                        <div className="text-white/90 text-[10px] mt-0.5">{formatTime(new Date(lesson.start_time))}</div>
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

        <div className="bg-white rounded-lg shadow-md overflow-x-auto overflow-y-hidden">
          <div className="min-w-[800px]">
            {/* Header row: 56px time column + 7 equal day columns so borders align with time grid below */}
            <div
              className="grid border-b bg-gray-50"
              style={{ gridTemplateColumns: '56px repeat(7, minmax(0, 1fr))' }}
            >
              <div className="border-r p-2 text-xs font-medium text-gray-500 bg-gray-50/80" />
              {weekDays.map((day) => {
                const holidayName = getHolidayName(day);
                const isToday = day.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={day.toISOString()}
                    className={`p-2 text-center border-r last:border-r-0 ${isToday ? 'bg-primary-lighter' : ''}`}
                  >
                    <div className="text-sm font-medium text-gray-600">
                      {day.toLocaleDateString(getLocale(), { weekday: 'short' })}
                    </div>
                    <div className={`text-lg font-semibold mt-0.5 ${isToday ? 'text-primary' : 'text-gray-900'}`}>
                      {day.getDate()}
                    </div>
                    {holidayName && (
                      <div className="text-xs text-gray-400 italic truncate" title={holidayName}>
                        {holidayName}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {(() => {
              const gridHeightPx = (TIME_GRID_END_HOUR - TIME_GRID_START_HOUR) * TIME_GRID_ROW_HEIGHT_PX;
              const startMin = TIME_GRID_START_HOUR * 60;
              const hourLabels = Array.from(
                { length: TIME_GRID_END_HOUR - TIME_GRID_START_HOUR },
                (_, i) => `${String(TIME_GRID_START_HOUR + i).padStart(2, '0')}:00`
              );
              return (
                <div
                  className="grid border-b"
                  style={{
                    gridTemplateColumns: '56px repeat(7, minmax(0, 1fr))',
                    minHeight: gridHeightPx,
                  }}
                >
                  <div className="border-r bg-gray-50/80">
                    {hourLabels.map((label) => (
                      <div
                        key={label}
                        className="text-xs text-gray-500 pr-1 text-right border-t border-gray-100 first:border-t-0"
                        style={{ height: TIME_GRID_ROW_HEIGHT_PX }}
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                  {weekDays.map((day) => {
                    const isToday = day.toDateString() === new Date().toDateString();
                    const dayEvents = getDayEventsForTimeGrid(day);
                    const maxColumns = dayEvents.length > 0
                      ? Math.max(...dayEvents.map((e) => e.totalColumns))
                      : 1;
                    const useHorizontalScroll = maxColumns > 1 && !isNarrowScreen;
                    const contentMinWidth = useHorizontalScroll ? maxColumns * WEEK_VIEW_OVERLAP_EVENT_MIN_WIDTH_PX : '100%';
                    return (
                      <div
                        key={day.toISOString()}
                        className={`border-r last:border-r-0 relative ${isToday ? 'bg-primary-lighter/20' : 'bg-white'}`}
                        style={{ minHeight: gridHeightPx }}
                      >
                        <div className="absolute inset-0 overflow-x-auto overflow-y-hidden">
                          <div
                            className="relative h-full"
                            style={{
                              minWidth: contentMinWidth,
                              minHeight: gridHeightPx,
                            }}
                          >
                        {dayEvents.map(({ lesson, _postponedFrom, startMinutes, endMinutes, columnIndex, totalColumns }) => {
                          const locationColors = getLocationColors(lesson.location);
                          const suggested = isLessonSuggested(lesson);
                          const topPx = ((startMinutes - startMin) / 60) * TIME_GRID_ROW_HEIGHT_PX;
                          const heightPx = ((endMinutes - startMinutes) / 60) * TIME_GRID_ROW_HEIGHT_PX;
                          const isOverlap = totalColumns > 1;
                          const stackVertically = isNarrowScreen && isOverlap;
                          const blockWidth = isOverlap && !stackVertically ? WEEK_VIEW_OVERLAP_EVENT_MIN_WIDTH_PX : undefined;
                          const blockLeftPct = !isOverlap && totalColumns > 0 ? (columnIndex / totalColumns) * 100 : undefined;
                          const blockLeftPx = isOverlap && !stackVertically ? columnIndex * WEEK_VIEW_OVERLAP_EVENT_MIN_WIDTH_PX : undefined;
                          const widthPct = !isOverlap && totalColumns > 0 ? 100 / totalColumns : 100;
                          const gap = isOverlap && !stackVertically ? 2 : 2;
                          const leftAdj = blockLeftPct != null ? blockLeftPct + (gap / totalColumns) * columnIndex : undefined;
                          const widthAdj = blockLeftPct != null ? widthPct - gap : undefined;
                          const stackTopPx = stackVertically ? topPx + columnIndex * (WEEK_VIEW_EVENT_MIN_HEIGHT_PX + 4) : undefined;
                          return (
                            <button
                              key={lesson.id}
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleLessonClick(lesson); }}
                              className={`absolute text-left rounded overflow-hidden transition-all ${suggested ? 'hover:ring-2 hover:ring-offset-1 hover:ring-primary/50' : 'opacity-80'}`}
                                style={{
                                  top: (stackVertically ? stackTopPx : topPx + 2) ?? topPx + 2,
                                  height: Math.max(heightPx - 4, WEEK_VIEW_EVENT_MIN_HEIGHT_PX),
                                  ...(stackVertically
                                    ? { left: 2, right: 2, width: 'calc(100% - 4px)' }
                                    : isOverlap
                                    ? {
                                        left: blockLeftPx,
                                        width: (blockWidth ?? 0) - 4,
                                        minWidth: (blockWidth ?? 0) - 4,
                                      }
                                    : {
                                        left: `${leftAdj ?? 0}%`,
                                        width: `${widthAdj ?? 100}%`,
                                      }),
                                  backgroundColor: locationColors.lighter,
                                  borderLeft: `4px solid ${locationColors.primary}`,
                                }}
                              title={`${lesson.name} · ${lesson.instructor} · ${formatTime(new Date(lesson.start_time))}${_postponedFrom ? ` · ${t('calendar.postponedFromHoliday', { date: formatShortDate(_postponedFrom) })}` : ''}`}
                            >
                              <div className="p-1.5 h-full flex flex-col justify-center gap-0.5 min-h-0 min-w-0 overflow-hidden">
                                <span className={`text-xs font-semibold text-gray-900 min-h-[1.25em] block ${(isOverlap && !stackVertically) ? 'break-words line-clamp-2 leading-tight' : 'truncate min-w-0'}`} title={lesson.name}>{lesson.name || (t('calendar.unnamedClass') || '課程')}</span>
                                <span className="text-[10px] text-gray-600 shrink-0">{formatTime(new Date(lesson.start_time))}</span>
                              </div>
                            </button>
                          );
                        })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
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
            const holidayName = getHolidayName(day);
            
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
                  {dayLessons.slice(0, 3).map(({ lesson, _postponedFrom }) => {
                    const locationColors = getLocationColors(lesson.location);
                    const suggested = isLessonSuggested(lesson);
                    const titleExtra = _postponedFrom
                      ? ` · ${t('calendar.postponedFromHoliday', { date: formatShortDate(_postponedFrom) })}`
                      : '';
                    return (
                      <div
                        key={lesson.id}
                        role="button"
                        tabIndex={0}
                        className={`text-xs py-1 px-1.5 text-white rounded cursor-pointer transition-colors truncate ${suggested ? '' : 'opacity-70'}`}
                        style={{
                          backgroundColor: locationColors.primary,
                        }}
                        onMouseEnter={suggested ? (e) => {
                          e.currentTarget.style.backgroundColor = locationColors.dark;
                        } : undefined}
                        onMouseLeave={suggested ? (e) => {
                          e.currentTarget.style.backgroundColor = locationColors.primary;
                        } : undefined}
                        onClick={() => handleLessonClick(lesson)}
                        title={`${lesson.name} - ${lesson.instructor} - ${formatTime(new Date(lesson.start_time))}${titleExtra}`}
                      >
                        {formatTime(new Date(lesson.start_time))} {lesson.name}
                      </div>
                    );
                  })}
                  {dayLessons.length > 3 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setView('day');
                        setCurrentDate(new Date(day));
                      }}
                      className="text-xs text-primary font-medium hover:underline cursor-pointer mt-0.5 w-full text-left"
                      title={t('calendar.viewAllOnDay', { count: dayLessons.length })}
                    >
                      +{dayLessons.length - 3} more
                    </button>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('calendar.title')}</h1>
          <p className="text-gray-600 mb-4">{t('calendar.trialSlotsHint', '以下時段均可試堂，點擊課程可預約試堂。')}</p>
          
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

          {isStudent && (
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setCalendarFilterMode('suggested')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  calendarFilterMode === 'suggested' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('calendar.suggested')}
              </button>
              <button
                onClick={() => setCalendarFilterMode('all')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  calendarFilterMode === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('calendar.all')}
              </button>
            </div>
          )}
        </div>

        {/* Calendar View */}
        <div className="relative">
          {lessonsError && (
            <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800" role="alert">
              {lessonsError}
            </div>
          )}
          {!lessonsError && !lessonsLoading && lessons.length === 0 && (
            <div className="mb-4 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600">
              {t('calendar.noClasses') || 'No classes this month. Add classes in Admin or run the seed script (e.g. reset-classes-and-seed.sql).'}
            </div>
          )}
          {lessonsLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 rounded-lg">
              <span className="text-sm text-gray-600">{t('common.loading') || 'Loading...'}</span>
            </div>
          )}
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
            <div ref={lessonModalRef} className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full" role="dialog" aria-modal="true" aria-label={t('calendar.lessonDetails', 'Lesson details')}>
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
                            {formatProgramCodeDisplay(selectedLesson.program_code, selectedLesson.lesson_number) || selectedLesson.program_code}
                          </span>
                          {(selectedLesson.lesson_number != null && selectedLesson.lesson_number >= 1) && (
                            <span className="text-sm font-medium text-gray-700">
                              {t('calendar.lessonXOfY', { current: selectedLesson.lesson_number, total: selectedLesson.total_lessons })}
                            </span>
                          )}
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

                      {/* Teacher intro (awards, experience, dance school) */}
                      {getInstructorProfile(selectedLesson.instructor) && (
                        <div className="mb-6 pb-6 border-b-2 border-gray-100">
                          <InstructorIntroCard instructorName={selectedLesson.instructor} compact />
                        </div>
                      )}

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

                        <div className="flex items-center text-gray-800 rounded-lg p-3">
                          <Repeat
                            className="h-5 w-5 mr-3 flex-shrink-0"
                            style={{ color: locationColors.primary }}
                          />
                          <span className="text-base font-semibold">
                            {t('calendar.everyWeekday', { day: t(`calendar.weekdays.${WEEKDAY_KEYS[selectedLesson.weekday]}`) })} · {t('calendar.lessonsInTotal', { count: selectedLesson.total_lessons })}
                          </span>
                        </div>

                      </div>

                      {/* Book Trial / Enroll */}
                      <div className="space-y-3">
                        {selectedLesson && !isLessonSuggested(selectedLesson) && isStudent && (
                          <p className="text-sm text-gray-500 py-2">{t('calendar.notSuggested')}</p>
                        )}
                        {selectedLesson && (isStudent ? isLessonSuggested(selectedLesson) : true) && (
                          <>
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
                              {t('calendar.bookTrial')}
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
                          </>
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

