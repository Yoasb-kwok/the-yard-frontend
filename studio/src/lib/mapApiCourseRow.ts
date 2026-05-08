import type { CourseLevel } from '../contexts/AuthContext';
import type { CourseItem, CourseType } from './coursesData';

const LOCATIONS = ['sanpokong', 'causewaybay', 'fotan', 'sheungshui'] as const;

function normalizeLocation(loc: string | undefined): CourseItem['location'] {
  return LOCATIONS.includes(loc as (typeof LOCATIONS)[number])
    ? (loc as CourseItem['location'])
    : 'sanpokong';
}

function pickNum(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * 課程介紹列表用：只顯示 API 已確認有實際班別的 program（有最近一堂班 id 或開班數 > 0）。
 */
export function courseItemHasVerifiedClasses(c: CourseItem): boolean {
  if (!String(c.program_code ?? '').trim()) return false;
  const next = c.next_class_id;
  if (typeof next === 'number' && next > 0) return true;
  const open = c.open_class_count;
  if (typeof open === 'number' && open > 0) return true;
  return false;
}

/**
 * 將 GET /api/courses 單列（含 `?fromClasses=1`）轉成前端 `CourseItem`。
 * 路徑名稱「courses」僅為 REST 資源：後端可完全沒有 `courses` 資料表，只依 `classes`（或 view）聚合即可。
 * `id` 可為 null — 此時用 `pc:${program_code}` 作列表 stable id。
 */
export function mapApiCourseRowToCourseItem(row: Record<string, unknown>): CourseItem {
  const r = row as Record<string, any>;
  const programCode = String(
    r.class_code ?? r.classCode ?? r.program_code ?? r.programCode ?? ''
  ).trim();
  const rawId = r.id;
  const hasCatalogId = rawId != null && rawId !== '';
  const catalogId = hasCatalogId ? String(rawId) : '';
  const listId = catalogId || (programCode ? `pc:${programCode}` : 'pc:unknown');

  const courseType: CourseType =
    r.course_type === 'summer' || r.course_type === 'short_term' ? r.course_type : 'regular';

  return {
    id: listId,
    name: String(r.name ?? ''),
    program_code: programCode,
    intro: String(r.intro ?? ''),
    level: (r.level || 'entry') as CourseLevel,
    age_tag: String(r.age_tag ?? r.ageTag ?? '5-8'),
    instructor: String(r.instructor ?? ''),
    trial_class_name: String(r.trial_class_name ?? r.trialClassName ?? r.name ?? ''),
    location: normalizeLocation(String(r.location ?? '')),
    weekday: typeof r.weekday === 'number' ? r.weekday : 0,
    course_type: courseType,
    next_class_id: pickNum(r.next_class_id ?? r.nextClassId) ?? null,
    open_class_count: pickNum(r.open_class_count ?? r.openClassCount) ?? null,
    has_course_catalog_row:
      r.has_course_catalog_row === true ||
      r.has_course_catalog_row === 1 ||
      r.hasCourseCatalogRow === true,
  };
}
