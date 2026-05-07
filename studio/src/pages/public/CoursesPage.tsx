import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/PublicLayout';
import { BookOpen, Calendar, MapPin, Search, ArrowDownWideNarrow, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import type { AgeTag, CourseLevel } from '../../contexts/AuthContext';
import type { CourseItem, CourseType } from '../../lib/coursesData';
import { courseItemHasVerifiedClasses, mapApiCourseRowToCourseItem } from '../../lib/mapApiCourseRow';
import { applyCourseIntroOverrides } from '../../lib/courseIntroStorage';
import { getCoursesPageHero, getHeroTitleForLocale, getHeroDescForLocale, getHeroNoteForLocale } from '../../lib/coursesPageHeroStorage';
import { api, ApiError } from '../../lib/api';

export type { CourseItem, CourseType };

type SortOption = 'ageGroup' | 'level' | 'name' | 'weekday';

const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

/** 可供試堂的時段（來自 GET /classes） */
export interface TrialSlot {
  start_time: string;
  end_time: string;
  /** 該時段的地點（API 回傳的 class 可能有不同地點） */
  location?: CourseItem['location'];
  /** API 班別 id，試堂申請時可帶上 */
  class_id?: number;
  tag_values?: Record<string, string | null | undefined>;
}

const LOCATIONS = ['sanpokong', 'causewaybay', 'fotan', 'sheungshui'] as const;
function normalizeLocation(loc: string | undefined): CourseItem['location'] {
  return LOCATIONS.includes(loc as any) ? (loc as CourseItem['location']) : 'sanpokong';
}

/** 從 API /classes 回傳的班別轉成試堂時段（未來 14 日、未取消） */
function apiClassesToTrialSlots(rows: any[]): TrialSlot[] {
  const now = new Date();
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  const to = new Date(now);
  to.setDate(to.getDate() + 14);
  const fromTime = from.getTime();
  const toTime = to.getTime();
  return (rows || [])
    .filter((row: any) => !(row.is_cancelled === 1 || row.is_cancelled === true))
    .map((row: any) => {
      const start = new Date(row.start_time);
      return start.getTime() >= fromTime && start.getTime() <= toTime
        ? {
            start_time: row.start_time,
            end_time: row.end_time,
            location: normalizeLocation(row.location),
            class_id: row.id,
            tag_values: row.tag_values ?? row.tagValues ?? row.tags ?? {},
          }
        : null;
    })
    .filter(Boolean) as TrialSlot[];
}

function getAgeSortKey(age_tag: string): number {
  const map: Record<string, number> = { '5-8': 0, '9-12': 1, '13-16': 2 };
  if (map[age_tag] != null) return map[age_tag];
  const m = age_tag.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : 99;
}

function getLevelSortKey(level: CourseLevel): number {
  const map: Record<CourseLevel, number> = { entry: 0, intermediate: 1, advanced: 2 };
  return map[level] ?? 0;
}

function mapApiClassesToCourseItems(rows: Record<string, unknown>[]): CourseItem[] {
  const byProgram = new Map<string, Record<string, unknown>[]>();
  for (const row of rows) {
    const r = row as Record<string, unknown>;
    const programCode = String(r.program_code ?? '').trim();
    if (!programCode) continue;
    const bucket = byProgram.get(programCode);
    if (bucket) bucket.push(r);
    else byProgram.set(programCode, [r]);
  }

  return Array.from(byProgram.entries())
    .map(([programCode, group]) => {
      const first = group[0];
      const sortedByTime = [...group].sort((a, b) =>
        String(a.start_time ?? '').localeCompare(String(b.start_time ?? ''))
      );
      const next = sortedByTime.find((row) => {
        const t = String(row.start_time ?? '');
        return t && new Date(t).getTime() >= Date.now();
      }) ?? sortedByTime[0];
      const category = String(first.category ?? first.course_type ?? '').toLowerCase();
      const courseType: CourseType =
        category === 'summer'
          ? 'summer'
          : category === 'short' || category === 'short_term'
            ? 'short_term'
            : 'regular';

      return {
        id: `pc:${programCode}`,
        name: String(first.name ?? programCode),
        program_code: programCode,
        intro: String(first.intro ?? first.description ?? ''),
        level: (String(first.level ?? 'entry') as CourseLevel),
        age_tag: String(first.age_tag ?? '5-8'),
        instructor: String(first.instructor ?? ''),
        trial_class_name: String(first.trial_class_name ?? first.name ?? programCode),
        location: normalizeLocation(String(first.location ?? '')),
        weekday:
          typeof first.weekday === 'number'
            ? first.weekday
            : next.start_time
              ? new Date(String(next.start_time)).getDay()
              : 0,
        course_type: courseType,
        next_class_id: typeof next.id === 'number' ? next.id : Number(next.id ?? 0) || null,
        open_class_count: group.length,
        has_course_catalog_row: false,
      } as CourseItem;
    })
    .filter(courseItemHasVerifiedClasses);
}

export default function CoursesPage() {
  const { t, i18n } = useTranslation();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [coursesListLoading, setCoursesListLoading] = useState(true);
  /** 與「後端回傳空陣列」區分：5xx／連線失敗等 */
  const [coursesListError, setCoursesListError] = useState<'none' | 'server' | 'network'>('none');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('ageGroup');
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  /** 每課程的「可供試堂時段」快取：展開時呼叫 GET /classes，無資料則不顯示假時段 */
  const [trialSlotsCache, setTrialSlotsCache] = useState<Record<string, { slots: TrialSlot[]; loading: boolean }>>({});

  // GET /api/courses 為「課程介紹用聚合 API」，不必對應名為 courses 的 table；fromClasses=1 應僅由 classes 等推出。
  useEffect(() => {
    let cancelled = false;
    setCoursesListLoading(true);
    setCoursesListError('none');
    api
      .get<Record<string, unknown>[]>('/courses', { fromClasses: 1 })
      .then(async (res) => {
        if (cancelled) return;
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const mapped = res.data.map((row) => mapApiCourseRowToCourseItem(row as Record<string, unknown>));
          const verified = mapped.filter(courseItemHasVerifiedClasses);
          // Backends that do not expose next/open counters should still render.
          setCourses(verified.length > 0 ? verified : mapped.filter((c) => !!String(c.program_code).trim()));
          return;
        }
        const classesRes = await api.get<Record<string, unknown>[]>('/classes');
        if (cancelled) return;
        if (classesRes.success && Array.isArray(classesRes.data)) {
          setCourses(mapApiClassesToCourseItems(classesRes.data));
        } else {
          setCourses([]);
        }
      })
      .catch(async (err: unknown) => {
        if (cancelled) return;
        try {
          const classesRes = await api.get<Record<string, unknown>[]>('/classes');
          if (cancelled) return;
          if (classesRes.success && Array.isArray(classesRes.data) && classesRes.data.length > 0) {
            setCourses(mapApiClassesToCourseItems(classesRes.data));
            return;
          }
        } catch {
          // ignore fallback errors and use the original error state below
        }
        setCourses([]);
        if (err instanceof ApiError && err.status >= 500) {
          setCoursesListError('server');
        } else {
          setCoursesListError('network');
        }
      })
      .finally(() => {
        if (!cancelled) setCoursesListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** 展開某課程時拉取該課程的試堂時段（未來 14 日、program_code） */
  useEffect(() => {
    if (!expandedCourseId) return;
    const course = courses.find((c) => c.id === expandedCourseId);
    if (!course?.program_code) return;
    if (trialSlotsCache[expandedCourseId] !== undefined) return; // 已載入過（含空陣列）

    const courseIdForFetch = expandedCourseId;
    const programCodeForFetch = course.program_code;
    setTrialSlotsCache((prev) => ({ ...prev, [courseIdForFetch]: { slots: [], loading: true } }));
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 14);
    const fromISO = from.toISOString();
    const toISO = to.toISOString();
    api.get<any[]>('/classes', { from: fromISO, to: toISO, program_code: programCodeForFetch })
      .then((res) => {
        const rows = (res.success && Array.isArray(res.data)) ? res.data : [];
        // 前端再依 program_code 篩選（避免後端未篩選時不同課程顯示相同時段）
        const filtered = rows.filter(
          (row: any) => (row.program_code || '').toString().trim() === programCodeForFetch
        );
        // 只顯示「可供試堂」的班別（後端 allow_trial=1）；若後端未提供該欄位則全部顯示
        const hasTrialFlag = filtered.some((row: any) => row.allow_trial === 1 || row.allow_trial === true);
        const forTrial = hasTrialFlag
          ? filtered.filter((row: any) => row.allow_trial === 1 || row.allow_trial === true)
          : filtered;
        const slots = apiClassesToTrialSlots(forTrial);
        setTrialSlotsCache((p) => ({ ...p, [courseIdForFetch]: { slots, loading: false } }));
      })
      .catch(() => {
        setTrialSlotsCache((p) => ({ ...p, [courseIdForFetch]: { slots: [], loading: false } }));
      });
  }, [expandedCourseId, courses]);

  const locale = i18n.language === 'zh-CN' ? 'zh-CN' : i18n.language === 'zh-TW' ? 'zh-TW' : 'en-US';
  const hero = getCoursesPageHero();
  const heroTitle = getHeroTitleForLocale(hero, t('courses.promotionFlowTitle', '舞蹈等級晉升流程（示意）'), i18n.language);
  const heroDesc = getHeroDescForLocale(hero, t('courses.promotionFlowDesc', '學生完成指定堂數及達到導師評核標準後，便有機會晉升至更高級別班別；個別級別或需參與內部評核／考試作實。'), i18n.language);
  const heroNote = getHeroNoteForLocale(hero, t('courses.promotionFlowNote', '以上為示意說明；實際晉升準則以中心最新安排為準。'), i18n.language);

  /** Apply admin 3-lang overrides for 課堂介紹 */
  const displayCourses = useMemo(
    () => courses.map((c) => applyCourseIntroOverrides(c, i18n.language)),
    [courses, i18n.language]
  );

  const toggleTrialExpand = useCallback((courseId: string) => {
    setExpandedCourseId((prev) => (prev === courseId ? null : courseId));
  }, []);

  const filteredAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = q
      ? displayCourses.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.program_code.toLowerCase().includes(q) ||
            c.intro.toLowerCase().includes(q)
        )
      : [...displayCourses];

    list.sort((a, b) => {
      switch (sortBy) {
        case 'ageGroup':
          return getAgeSortKey(a.age_tag) - getAgeSortKey(b.age_tag) || (a.name || '').localeCompare(b.name || '');
        case 'level':
          return getLevelSortKey(a.level) - getLevelSortKey(b.level) || (a.name || '').localeCompare(b.name || '');
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'weekday':
          return a.weekday - b.weekday || (a.name || '').localeCompare(b.name || '');
        default:
          return 0;
      }
    });
    return list;
  }, [displayCourses, searchQuery, sortBy]);

  const getAgeLabel = (age_tag: string) => {
    const key = `calendar.ageTag.${age_tag}`;
    const translated = t(key);
    return translated !== key ? translated : `${age_tag}${t('calendar.ageTag.yearsOld', '歲')}`;
  };

  return (
    <PublicLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <header className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-6">
              <BookOpen className="h-8 w-8" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              {t('courses.title', '課程介紹')}
            </h1>
            <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              {t('courses.subtitle', '按年齡組別瀏覽課程，歡迎預約試堂。')}
            </p>
          </header>

          {/* 課程介紹頂部區塊：圖片 + 晉升流程文字（後台可編輯，圖片用 object-contain 不裁切） */}
          <section className="mb-8">
            <div className="rounded-2xl border border-primary/10 bg-white shadow-sm overflow-hidden flex flex-col sm:flex-row">
              <div className="sm:w-2/5 relative min-h-[160px] max-h-[280px] sm:max-h-[320px] bg-gradient-to-br from-primary/10 via-primary/5 to-amber-50 flex items-center justify-center overflow-hidden">
                <img
                  src={hero?.image_url?.trim() || '/images/Upgrade.png'}
                  alt={t('courses.promotionFlowAlt', '舞蹈等級晉升示意圖')}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </div>
              <div className="sm:w-3/5 p-5 sm:p-6 flex flex-col justify-center gap-2">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                    i
                  </span>
                  {heroTitle}
                </h2>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {heroDesc}
                </p>
                {heroNote && (
                  <p className="text-xs text-gray-500 mt-1">
                    {heroNote}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Search + Sort bar */}
          <div className="mb-8 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('courses.searchPlaceholder', '搜尋課程名稱、代碼或簡介…')}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary shadow-sm"
                aria-label={t('courses.searchPlaceholder', '搜尋課程')}
              />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <ArrowDownWideNarrow className="h-5 w-5 text-gray-500 shrink-0" aria-hidden />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="flex-1 sm:w-44 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary shadow-sm"
                aria-label={t('courses.sortBy', '排序方式')}
              >
                <option value="ageGroup">{t('courses.sortByAgeGroup', '年齡組別')}</option>
                <option value="level">{t('courses.sortByLevel', '課程難度')}</option>
                <option value="name">{t('courses.sortByName', '課程名稱')}</option>
                <option value="weekday">{t('courses.sortByWeekday', '星期幾')}</option>
              </select>
            </div>
          </div>

          {/* Course list：僅顯示後端回傳，不再使用靜態 demo 課程表 */}
          <div className="space-y-4">
            {coursesListLoading ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-500">
                {t('courses.loadingList', '載入課程列表中…')}
              </div>
            ) : courses.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-600 space-y-2">
                {coursesListError === 'server' ? (
                  <p>{t('courses.loadErrorServer', '課程列表暫時無法載入（伺服器錯誤）。請稍後再試，或請管理員查看後端日誌。')}</p>
                ) : coursesListError === 'network' ? (
                  <p>{t('courses.loadErrorNetwork', '無法連線載入課程列表。請檢查網路或 API 位址後再試。')}</p>
                ) : (
                  <p>{t('courses.emptyFromApi', '目前沒有從系統載入到可顯示的課程。請確認後端已提供課程資料，或稍後再試。')}</p>
                )}
                <p className="text-sm text-gray-500">
                  <Link to="/calendar" className="text-primary font-medium hover:underline">
                    {t('courses.viewCalendar', '查看月曆可報名時段')}
                  </Link>
                </p>
              </div>
            ) : filteredAndSorted.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-500">
                {t('courses.noResults', '沒有符合的課程，請試試其他關鍵字或排序。')}
              </div>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-1">
                {filteredAndSorted.map((course) => (
                  <li key={course.id}>
                    <div className="group rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm hover:border-primary/30 hover:shadow-md transition-all duration-300">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900">{course.name}</h3>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                              {t(`courses.courseType.${course.course_type}`)}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30">
                              {course.program_code}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                              {getAgeLabel(course.age_tag)}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-800 border border-teal-200">
                              {t(`calendar.level.${course.level}`)}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-800 border border-sky-200">
                              {t(`calendar.weekdays.${WEEKDAY_KEYS[course.weekday]}`)}
                            </span>
                          </div>
                          <p className="text-gray-600 leading-relaxed">{course.intro}</p>
                          <p className="text-sm text-gray-500 mt-3 flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-gray-700">{t('home.tutor')}:</span>
                            {course.instructor}
                            <span className="text-gray-400 mx-1">·</span>
                            <MapPin className="h-3.5 w-3.5 text-gray-400 inline shrink-0" />
                            <span>{t(`home.locations.${course.location}`, course.location)}</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleTrialExpand(course.id)}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark shadow-md hover:shadow-lg transition-all duration-200 shrink-0"
                        >
                          <Calendar className="h-4 w-4" />
                          {t('courses.bookTrial', '預約試堂')}
                          {expandedCourseId === course.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                      {/* 展開：可供試堂的日子（僅 GET /classes 真實時段） */}
                      {expandedCourseId === course.id && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <p className="text-sm font-medium text-gray-700 mb-3">{t('courses.availableTrialSlots', '可供試堂時段')}</p>
                          {trialSlotsCache[course.id]?.loading ? (
                            <p className="text-sm text-gray-500 py-2">{t('common.loading', '載入中…')}</p>
                          ) : (trialSlotsCache[course.id]?.slots?.length ?? 0) === 0 ? (
                            <p className="text-sm text-gray-500 py-2">
                              {t(
                                'courses.noTrialSlotsInRange',
                                '未來 14 日內暫無符合的試堂時段，請到月曆查看其他日期。'
                              )}
                            </p>
                          ) : (
                            <ul className="space-y-2">
                              {(trialSlotsCache[course.id]!.slots as TrialSlot[]).map((slot, idx) => {
                                const start = new Date(slot.start_time);
                                const end = new Date(slot.end_time);
                                const dateStr = start.toLocaleDateString(locale, { month: 'numeric', day: 'numeric', weekday: 'short' });
                                const timeStr = `${start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })} – ${end.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })}`;
                                const loc = slot.location ?? course.location;
                                const locationStr = t(`home.locations.${loc}`, loc);
                                const rowId =
                                  slot.class_id != null && slot.class_id !== ''
                                    ? String(slot.class_id)
                                    : typeof course.next_class_id === 'number'
                                      ? String(course.next_class_id)
                                      : undefined;
                                const trialSearch = new URLSearchParams({
                                  courseId: course.id,
                                  pc: course.program_code,
                                  tn: course.trial_class_name,
                                  st: slot.start_time,
                                  et: slot.end_time,
                                  loc: String(loc),
                                  instr: course.instructor,
                                  lvl: course.level,
                                  age: course.age_tag,
                                });
                                if (rowId) trialSearch.set('rowId', rowId);
                                if (slot.tag_values) {
                                  trialSearch.set('tags', encodeURIComponent(JSON.stringify(slot.tag_values)));
                                }
                                return (
                                  <li key={`${course.id}-${slot.class_id ?? 'd'}-${slot.start_time}-${idx}`}>
                                    <Link
                                      to={{ pathname: '/trial', search: `?${trialSearch.toString()}` }}
                                      state={{
                                        classData: {
                                          id: course.id,
                                          name: course.trial_class_name,
                                          instructor: course.instructor,
                                          start_time: slot.start_time,
                                          end_time: slot.end_time,
                                          location: loc,
                                          program_code: course.program_code,
                                          level: course.level,
                                          age_tag: course.age_tag as AgeTag,
                                          tag_values: slot.tag_values,
                                          apiClassRowId: rowId,
                                        },
                                      }}
                                      className="grid grid-cols-[minmax(0,1fr)_auto_auto_24px] sm:grid-cols-[140px_100px_1fr_24px] gap-x-3 gap-y-0 items-center py-2.5 px-3 rounded-lg bg-gray-50 hover:bg-primary/10 hover:border-primary/30 border border-transparent transition-colors group text-left"
                                    >
                                      <span className="text-gray-700 group-hover:text-primary font-medium text-sm tabular-nums">{dateStr}</span>
                                      <span className="text-gray-600 group-hover:text-primary text-sm tabular-nums">{timeStr}</span>
                                      <span className="text-sm text-gray-500 truncate">{locationStr}</span>
                                      <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-primary flex-shrink-0" aria-hidden />
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-12 text-center">
            <Link
              to="/calendar"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-100 text-gray-800 font-medium hover:bg-primary hover:text-white hover:shadow-lg transition-all duration-200"
            >
              <Calendar className="h-5 w-5" />
              {t('courses.viewCalendar', '查看月曆可報名時段')}
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
