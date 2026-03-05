import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/PublicLayout';
import { BookOpen, Calendar, MapPin, Search, ArrowDownWideNarrow } from 'lucide-react';
import type { CourseLevel } from '../../contexts/AuthContext';

export interface CourseItem {
  id: string;
  name: string;
  program_code: string;
  intro: string;
  level: CourseLevel;
  age_tag: string;
  instructor: string;
  trial_class_name: string;
  location: 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui';
  /** 0=Sun … 6=Sat, for sorting by day */
  weekday: number;
}

const ALL_COURSES: CourseItem[] = [
  { id: 'kb-a', name: '兒童芭蕾', program_code: 'KB-A', intro: '從基礎芭蕾手位與步法開始，培養節奏感與身體協調，適合幼兒啟蒙。', level: 'entry', age_tag: '5-8', instructor: '李老師', trial_class_name: '兒童芭蕾體驗', location: 'sanpokong', weekday: 1 },
  { id: 'kids', name: '幼兒律動', program_code: 'KIDS', intro: '透過音樂與遊戲學習基本節奏與肢體表達，課堂氣氛輕鬆愉快。', level: 'entry', age_tag: '5-8', instructor: '王老師', trial_class_name: '幼兒律動體驗', location: 'sanpokong', weekday: 6 },
  { id: 'ccd', name: '兒童中國舞', program_code: 'CCD', intro: '中國舞基本功與身韻入門，認識民族民間舞小組合。', level: 'entry', age_tag: '5-8', instructor: '黃老師', trial_class_name: '兒童中國舞體驗', location: 'sheungshui', weekday: 2 },
  { id: 'thh', name: '青少年街舞', program_code: 'THH', intro: 'Hip Hop 與街舞基礎，強調節奏感與表現力，可參與表演與比賽。', level: 'intermediate', age_tag: '9-12', instructor: '陳老師', trial_class_name: '青少年街舞體驗', location: 'causewaybay', weekday: 3 },
  { id: 'jazz', name: '爵士舞', program_code: 'JAZZ', intro: '爵士舞基礎與現代舞元素，適合喜歡流行與舞台表現的學員。', level: 'entry', age_tag: '9-12', instructor: '張老師', trial_class_name: '爵士舞體驗', location: 'fotan', weekday: 5 },
  { id: 'kpop', name: 'K-Pop 流行舞', program_code: 'KPOP', intro: 'K-Pop 偶像舞碼與編排，節奏明快，適合喜愛流行舞的學員。', level: 'entry', age_tag: '9-12', instructor: '林老師', trial_class_name: 'K-Pop 流行舞體驗', location: 'causewaybay', weekday: 4 },
  { id: 'thh-teen', name: '青少年街舞（進階）', program_code: 'THH', intro: '街舞進階編舞與技巧，可參與比賽與演出。', level: 'advanced', age_tag: '13-16', instructor: '陳老師', trial_class_name: '青少年街舞體驗', location: 'causewaybay', weekday: 3 },
];

type SortOption = 'ageGroup' | 'level' | 'name' | 'weekday';

const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

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

export default function CoursesPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('ageGroup');

  const filteredAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = q
      ? ALL_COURSES.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.program_code.toLowerCase().includes(q) ||
            c.intro.toLowerCase().includes(q)
        )
      : [...ALL_COURSES];

    list.sort((a, b) => {
      switch (sortBy) {
        case 'ageGroup':
          return getAgeSortKey(a.age_tag) - getAgeSortKey(b.age_tag) || a.name.localeCompare(b.name);
        case 'level':
          return getLevelSortKey(a.level) - getLevelSortKey(b.level) || a.name.localeCompare(b.name);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'weekday':
          return a.weekday - b.weekday || a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
    return list;
  }, [searchQuery, sortBy]);

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

          {/* Course list */}
          <div className="space-y-4">
            {filteredAndSorted.length === 0 ? (
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
                            <span>{t(`locations.${course.location}`, course.location)}</span>
                          </p>
                        </div>
                        <Link
                          to="/trial"
                          state={{
                            classData: {
                              id: course.id,
                              name: course.trial_class_name,
                              instructor: course.instructor,
                              start_time: new Date(Date.now() + 86400000 * 3).toISOString(),
                              end_time: new Date(Date.now() + 86400000 * 3 + 3600000).toISOString(),
                              location: course.location,
                              program_code: course.program_code,
                              level: course.level,
                              age_tag: course.age_tag,
                            },
                          }}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark shadow-md hover:shadow-lg transition-all duration-200 shrink-0"
                        >
                          <Calendar className="h-4 w-4" />
                          {t('courses.bookTrial', '預約試堂')}
                        </Link>
                      </div>
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
