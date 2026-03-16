/**
 * Admin-editable course intro (課堂介紹) in 3 languages.
 * Keyed by course id; used by 課程介紹 page and trial/calendar when showing course name/intro.
 */
export type CourseIntroLang = 'zh-TW' | 'zh-CN' | 'en';

export interface CourseIntroOverrides {
  name_zh_tw?: string;
  name_zh_cn?: string;
  name_en?: string;
  intro_zh_tw?: string;
  intro_zh_cn?: string;
  intro_en?: string;
  trial_class_name_zh_tw?: string;
  trial_class_name_zh_cn?: string;
  trial_class_name_en?: string;
}

const STORAGE_KEY = 'the_yard_course_intros';

function getStored(): Record<string, CourseIntroOverrides> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function setStored(data: Record<string, CourseIntroOverrides>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save course intros to localStorage', e);
  }
}

export function getCourseIntroOverrides(courseId: string): CourseIntroOverrides | undefined {
  return getStored()[courseId];
}

export function setCourseIntroOverrides(courseId: string, overrides: CourseIntroOverrides): void {
  const all = getStored();
  all[courseId] = overrides;
  setStored(all);
}

export function getForLocale<T extends string | undefined>(
  zhTw: T,
  zhCn: T,
  en: T,
  lang: string
): string {
  const l = lang === 'zh-CN' ? 'zh-CN' : lang === 'en' || lang.startsWith('en') ? 'en' : 'zh-TW';
  const v = l === 'zh-TW' ? zhTw : l === 'zh-CN' ? zhCn : en;
  return (v && String(v).trim()) || '';
}

/** Resolve name for display by language (overrides + fallback to default). */
export function getNameForLocale(overrides: CourseIntroOverrides | undefined, defaultName: string, lang: string): string {
  const n = getForLocale(overrides?.name_zh_tw, overrides?.name_zh_cn, overrides?.name_en, lang);
  return n || defaultName || '';
}

export function getIntroForLocale(overrides: CourseIntroOverrides | undefined, defaultIntro: string, lang: string): string {
  const n = getForLocale(overrides?.intro_zh_tw, overrides?.intro_zh_cn, overrides?.intro_en, lang);
  return n || defaultIntro || '';
}

export function getTrialClassNameForLocale(overrides: CourseIntroOverrides | undefined, defaultName: string, lang: string): string {
  const n = getForLocale(overrides?.trial_class_name_zh_tw, overrides?.trial_class_name_zh_cn, overrides?.trial_class_name_en, lang);
  return n || defaultName || '';
}

/** Apply 3-lang overrides to a course item for display. Use in CoursesPage. */
export function applyCourseIntroOverrides<T extends { id: string; name: string; intro: string; trial_class_name: string }>(
  course: T,
  lang: string
): T {
  const overrides = getCourseIntroOverrides(course.id);
  return {
    ...course,
    name: getNameForLocale(overrides, course.name, lang),
    intro: getIntroForLocale(overrides, course.intro, lang),
    trial_class_name: getTrialClassNameForLocale(overrides, course.trial_class_name, lang),
  };
}
