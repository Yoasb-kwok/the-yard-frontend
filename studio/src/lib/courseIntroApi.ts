/**
 * Course intro CMS — `/api/course-intros` + `/api/admin/course-intros*`.
 * See studio/docs/COURSE_INTRO_CMS_SPEC.md
 */

import { api, ApiError } from './api';

export type CourseIntroLang = 'zh-TW' | 'zh-CN' | 'en';

export interface CourseIntroRecord {
  id: number;
  class_code: string;
  name_zh_tw: string;
  name_zh_cn: string;
  name_en: string;
  intro_zh_tw: string;
  intro_zh_cn: string;
  intro_en: string;
  trial_class_name_zh_tw: string;
  trial_class_name_zh_cn: string;
  trial_class_name_en: string;
  is_active: boolean;
  display_order: number;
  updated_at?: string;
}

export type CourseIntroFormFields = {
  name_zh_tw: string;
  name_zh_cn: string;
  name_en: string;
  intro_zh_tw: string;
  intro_zh_cn: string;
  intro_en: string;
  trial_class_name_zh_tw: string;
  trial_class_name_zh_cn: string;
  trial_class_name_en: string;
  is_active: boolean;
};

export type CourseIntroWritePayload = CourseIntroFormFields & {
  class_code: string;
  display_order?: number;
};

const LEGACY_STORAGE_KEY = 'the_yard_course_intros';

/** Drop deprecated browser-only demo cache. */
export function clearLegacyCourseIntroLocalStorage(): void {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Align list ids (`pc:CODE`) with CMS `class_code`. */
export function normalizeCourseIntroClassCode(code: string): string {
  const id = String(code ?? '').trim();
  if (!id) return id;
  return id.startsWith('pc:') ? id.slice(3) : id;
}

function str(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

function bool(v: unknown, fallback = true): boolean {
  if (v === false || v === 0 || v === '0') return false;
  if (v === true || v === 1 || v === '1') return true;
  return fallback;
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function mapApiCourseIntroRow(row: Record<string, unknown>): CourseIntroRecord | null {
  const classCode = normalizeCourseIntroClassCode(
    str(row.class_code ?? row.classCode ?? row.program_code ?? row.programCode),
  );
  if (!classCode) return null;
  const id = num(row.id);
  if (!id) return null;
  return {
    id,
    class_code: classCode,
    name_zh_tw: str(row.name_zh_tw ?? row.nameZhTw),
    name_zh_cn: str(row.name_zh_cn ?? row.nameZhCn),
    name_en: str(row.name_en ?? row.nameEn),
    intro_zh_tw: str(row.intro_zh_tw ?? row.introZhTw),
    intro_zh_cn: str(row.intro_zh_cn ?? row.introZhCn),
    intro_en: str(row.intro_en ?? row.introEn),
    trial_class_name_zh_tw: str(row.trial_class_name_zh_tw ?? row.trialClassNameZhTw),
    trial_class_name_zh_cn: str(row.trial_class_name_zh_cn ?? row.trialClassNameZhCn),
    trial_class_name_en: str(row.trial_class_name_en ?? row.trialClassNameEn),
    is_active: bool(row.is_active ?? row.isActive, true),
    display_order: num(row.display_order ?? row.displayOrder, 0),
    updated_at: row.updated_at != null ? String(row.updated_at) : undefined,
  };
}

function parseList(data: unknown): CourseIntroRecord[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((row) => mapApiCourseIntroRow(row as Record<string, unknown>))
    .filter((r): r is CourseIntroRecord => r != null)
    .sort((a, b) => a.display_order - b.display_order || a.class_code.localeCompare(b.class_code));
}

function toWriteBody(payload: CourseIntroWritePayload): Record<string, unknown> {
  return {
    class_code: normalizeCourseIntroClassCode(payload.class_code),
    name_zh_tw: payload.name_zh_tw.trim(),
    name_zh_cn: payload.name_zh_cn.trim(),
    name_en: payload.name_en.trim(),
    intro_zh_tw: payload.intro_zh_tw.trim(),
    intro_zh_cn: payload.intro_zh_cn.trim(),
    intro_en: payload.intro_en.trim(),
    trial_class_name_zh_tw: payload.trial_class_name_zh_tw.trim(),
    trial_class_name_zh_cn: payload.trial_class_name_zh_cn.trim(),
    trial_class_name_en: payload.trial_class_name_en.trim(),
    is_active: payload.is_active,
    display_order: payload.display_order,
  };
}

export function isCourseIntroApiUnavailable(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  return err.status === 404 || err.status === 501;
}

export async function fetchAdminCourseIntros(): Promise<CourseIntroRecord[]> {
  const res = await api.get<unknown[]>('/admin/course-intros');
  if (!res.success) {
    throw new ApiError(500, res.msg || 'Failed to load course intros');
  }
  return parseList(res.data);
}

export async function fetchPublicCourseIntros(): Promise<CourseIntroRecord[]> {
  const res = await api.get<unknown[]>('/course-intros');
  if (!res.success) {
    throw new ApiError(500, res.msg || 'Failed to load course intros');
  }
  return parseList(res.data).filter((r) => r.is_active);
}

export async function createCourseIntro(payload: CourseIntroWritePayload): Promise<CourseIntroRecord> {
  const res = await api.post<Record<string, unknown>>('/admin/course-intros', toWriteBody(payload));
  if (!res.success || !res.data) {
    throw new ApiError(400, res.msg || 'Create failed');
  }
  const row = mapApiCourseIntroRow(res.data);
  if (!row) throw new ApiError(500, 'Invalid create response');
  return row;
}

export async function updateCourseIntro(
  id: number,
  payload: Partial<CourseIntroWritePayload>,
): Promise<CourseIntroRecord> {
  const body: Record<string, unknown> = {};
  if (payload.class_code != null) body.class_code = normalizeCourseIntroClassCode(payload.class_code);
  if (payload.name_zh_tw != null) body.name_zh_tw = payload.name_zh_tw.trim();
  if (payload.name_zh_cn != null) body.name_zh_cn = payload.name_zh_cn.trim();
  if (payload.name_en != null) body.name_en = payload.name_en.trim();
  if (payload.intro_zh_tw != null) body.intro_zh_tw = payload.intro_zh_tw.trim();
  if (payload.intro_zh_cn != null) body.intro_zh_cn = payload.intro_zh_cn.trim();
  if (payload.intro_en != null) body.intro_en = payload.intro_en.trim();
  if (payload.trial_class_name_zh_tw != null) body.trial_class_name_zh_tw = payload.trial_class_name_zh_tw.trim();
  if (payload.trial_class_name_zh_cn != null) body.trial_class_name_zh_cn = payload.trial_class_name_zh_cn.trim();
  if (payload.trial_class_name_en != null) body.trial_class_name_en = payload.trial_class_name_en.trim();
  if (payload.is_active != null) body.is_active = payload.is_active;
  if (payload.display_order != null) body.display_order = payload.display_order;

  const res = await api.patch<Record<string, unknown>>(`/admin/course-intros/${id}`, body);
  if (!res.success || !res.data) {
    throw new ApiError(400, res.msg || 'Update failed');
  }
  const row = mapApiCourseIntroRow(res.data);
  if (!row) throw new ApiError(500, 'Invalid update response');
  return row;
}

export async function deleteCourseIntro(id: number): Promise<void> {
  const res = await api.delete(`/admin/course-intros/${id}`);
  if (!res.success) {
    throw new ApiError(400, res.msg || 'Delete failed');
  }
}

export function courseIntrosByClassCode(records: CourseIntroRecord[]): Map<string, CourseIntroRecord> {
  const map = new Map<string, CourseIntroRecord>();
  for (const r of records) {
    map.set(normalizeCourseIntroClassCode(r.class_code), r);
  }
  return map;
}

function pickLang(lang: string): CourseIntroLang {
  if (lang === 'zh-CN' || lang.startsWith('zh-CN')) return 'zh-CN';
  if (lang === 'en' || lang.startsWith('en')) return 'en';
  return 'zh-TW';
}

function pickField(
  zhTw: string,
  zhCn: string,
  en: string,
  lang: CourseIntroLang,
): string {
  const v =
    lang === 'zh-TW' ? zhTw : lang === 'zh-CN' ? zhCn : en;
  if (v.trim()) return v.trim();
  if (zhTw.trim()) return zhTw.trim();
  if (zhCn.trim()) return zhCn.trim();
  if (en.trim()) return en.trim();
  return '';
}

export function getCourseIntroName(record: CourseIntroRecord, lang: string): string {
  const l = pickLang(lang);
  return pickField(record.name_zh_tw, record.name_zh_cn, record.name_en, l);
}

export function getCourseIntroText(record: CourseIntroRecord, lang: string): string {
  const l = pickLang(lang);
  return pickField(record.intro_zh_tw, record.intro_zh_cn, record.intro_en, l);
}

export function getCourseIntroTrialName(record: CourseIntroRecord, lang: string): string {
  const l = pickLang(lang);
  return pickField(
    record.trial_class_name_zh_tw,
    record.trial_class_name_zh_cn,
    record.trial_class_name_en,
    l,
  );
}

export function recordToFormFields(record: CourseIntroRecord): CourseIntroFormFields {
  return {
    name_zh_tw: record.name_zh_tw,
    name_zh_cn: record.name_zh_cn,
    name_en: record.name_en,
    intro_zh_tw: record.intro_zh_tw,
    intro_zh_cn: record.intro_zh_cn,
    intro_en: record.intro_en,
    trial_class_name_zh_tw: record.trial_class_name_zh_tw,
    trial_class_name_zh_cn: record.trial_class_name_zh_cn,
    trial_class_name_en: record.trial_class_name_en,
    is_active: record.is_active,
  };
}

export function emptyCourseIntroForm(): CourseIntroFormFields {
  return {
    name_zh_tw: '',
    name_zh_cn: '',
    name_en: '',
    intro_zh_tw: '',
    intro_zh_cn: '',
    intro_en: '',
    trial_class_name_zh_tw: '',
    trial_class_name_zh_cn: '',
    trial_class_name_en: '',
    is_active: true,
  };
}

export function hasCourseIntroContent(fields: CourseIntroFormFields): boolean {
  return (
    fields.name_zh_tw.trim() !== '' ||
    fields.name_zh_cn.trim() !== '' ||
    fields.name_en.trim() !== '' ||
    fields.intro_zh_tw.trim() !== '' ||
    fields.intro_zh_cn.trim() !== '' ||
    fields.intro_en.trim() !== '' ||
    fields.trial_class_name_zh_tw.trim() !== '' ||
    fields.trial_class_name_zh_cn.trim() !== '' ||
    fields.trial_class_name_en.trim() !== ''
  );
}

export type CourseIntroCatalogStatus = 'loading' | 'ready' | 'unavailable';

/** True when this program should appear on the public 課程介紹 page. */
export function isCourseIntroPublishedOnPublicSite(
  programCode: string,
  catalog: Map<string, CourseIntroRecord>,
): boolean {
  const code = normalizeCourseIntroClassCode(programCode);
  const record = catalog.get(code);
  return !!record?.is_active;
}

/**
 * Public listing is driven by course_intros CMS, not the raw class schedule.
 * Schedule rows without an active CMS entry are hidden (incl. trial booking).
 */
export function filterCoursesForPublicListing<T extends { id: string; program_code?: string }>(
  courses: T[],
  catalog: Map<string, CourseIntroRecord>,
): T[] {
  return courses.filter((course) =>
    isCourseIntroPublishedOnPublicSite(String(course.program_code ?? course.id), catalog),
  );
}

/** Merge CMS copy onto a course row from classes/courses API. */
export function applyCourseIntroCatalog<T extends {
  id: string;
  program_code?: string;
  name: string;
  intro: string;
  trial_class_name: string;
}>(course: T, catalog: Map<string, CourseIntroRecord>, lang: string): T {
  const code = normalizeCourseIntroClassCode(course.program_code ?? course.id);
  const record = catalog.get(code);
  if (!record) return course;
  const name = getCourseIntroName(record, lang);
  const intro = getCourseIntroText(record, lang);
  const trial = getCourseIntroTrialName(record, lang);
  return {
    ...course,
    name: name || course.name,
    intro: intro || course.intro,
    trial_class_name: trial || course.trial_class_name,
  };
}

/** Collect unique class codes from schedule rows (for admin create picker). */
export function collectClassCodesFromScheduleRows(rows: Record<string, unknown>[]): string[] {
  const codes = new Set<string>();
  for (const row of rows) {
    const code = normalizeCourseIntroClassCode(
      str(row.class_code ?? row.program_code ?? row.classCode ?? row.programCode),
    );
    if (code) codes.add(code);
  }
  return Array.from(codes).sort((a, b) => a.localeCompare(b));
}
