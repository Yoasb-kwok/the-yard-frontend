import type { AgeTag, CourseLevel } from '../contexts/AuthContext';
import { ALL_COURSES } from './coursesData';

const LOCS = ['sanpokong', 'causewaybay', 'fotan', 'sheungshui'] as const;
type Loc = (typeof LOCS)[number];

function normLoc(loc: string | null | undefined, fallback: Loc): Loc {
  if (loc && LOCS.includes(loc as Loc)) return loc as Loc;
  return fallback;
}

/** 從課程介紹／日曆導向試堂頁時，與 `TrialPage` 內 `ClassData` 一致 */
export interface TrialNavClassData {
  id: string;
  name: string;
  instructor: string;
  start_time: string;
  end_time: string;
  location: Loc;
  program_code: string;
  level: CourseLevel;
  age_tag?: AgeTag;
  tag_values?: Record<string, string | null | undefined>;
  /** 後端班別列 id（GET /classes 的 row），有則試堂申請優先帶此值 */
  apiClassRowId?: string;
}

function parseTagValues(raw: string | null): Record<string, string | null> | undefined {
  if (!raw) return undefined;
  try {
    const decoded = decodeURIComponent(raw);
    const obj = JSON.parse(decoded) as Record<string, unknown>;
    if (!obj || typeof obj !== 'object') return undefined;
    const out: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(obj)) {
      const key = String(k || '').trim();
      if (!key) continue;
      const val = v == null ? '' : String(v).trim();
      out[key] = !val || val === '-' ? null : val;
    }
    return out;
  } catch {
    return undefined;
  }
}

function matchCourseByProgramCode(pc: string) {
  const t = pc.trim().toLowerCase();
  return ALL_COURSES.find((c) => c.program_code.trim().toLowerCase() === t);
}

/**
 * 從 URL 還原試堂選擇（不依賴 router state，新分頁／重新整理仍正確）。
 *
 * 課程介紹（與班表對齊）：`pc` + `st` + `et` + `loc`，選填 `courseId`、`rowId`、`tn`…
 * 舊靜態 id：`courseId` 在 ALL_COURSES 有列者
 * 日曆：`classId` + `st` + `et` + `name` + `instructor` + `pc` + `level` + `loc`（選填 `age`）
 */
export function trialNavClassDataFromSearchParams(sp: URLSearchParams): TrialNavClassData | null {
  const st = sp.get('st');
  const et = sp.get('et');
  if (!st || !et) return null;

  const pcRaw = sp.get('pc')?.trim();
  const tagValues = parseTagValues(sp.get('tags'));
  if (pcRaw) {
    const matched = matchCourseByProgramCode(pcRaw);
    const tn = sp.get('tn')?.trim();
    const nameFromCalendar = sp.get('name')?.trim();
    const name = tn || nameFromCalendar || matched?.trial_class_name || matched?.name || pcRaw;
    const instructor =
      sp.get('instr')?.trim() ||
      sp.get('instructor')?.trim() ||
      matched?.instructor ||
      '';
    const level = (sp.get('lvl')?.trim() as CourseLevel | null) ||
      (sp.get('level')?.trim() as CourseLevel | null) ||
      matched?.level ||
      'entry';
    const ageRaw = sp.get('age')?.trim();
    const age_tag = (ageRaw as AgeTag) || (matched?.age_tag as AgeTag | undefined);
    const loc = normLoc(sp.get('loc'), (matched?.location as Loc) || 'sanpokong');
    const calendarClassId = sp.get('classId')?.trim();
    const catalogCourseId = sp.get('courseId')?.trim();
    const id = calendarClassId || catalogCourseId || matched?.id || `pc:${pcRaw}`;
    const rowId = sp.get('rowId')?.trim();
    return {
      id,
      name,
      instructor,
      start_time: st,
      end_time: et,
      location: loc,
      program_code: pcRaw,
      level: level || 'entry',
      age_tag,
      tag_values: tagValues,
      apiClassRowId: rowId || undefined,
    };
  }

  const courseId = sp.get('courseId');
  if (courseId) {
    const c = ALL_COURSES.find((x) => x.id === courseId);
    if (c) {
      const rowId = sp.get('rowId');
      return {
        id: c.id,
        name: c.trial_class_name,
        instructor: c.instructor,
        start_time: st,
        end_time: et,
        location: normLoc(sp.get('loc'), c.location),
        program_code: c.program_code,
        level: c.level,
        age_tag: c.age_tag as AgeTag,
        tag_values: tagValues,
        apiClassRowId: rowId?.trim() || undefined,
      };
    }
  }

  const id = sp.get('classId');
  const name = sp.get('name');
  const instructor = sp.get('instructor');
  const calendarPc = sp.get('pc');
  const level = sp.get('level') as CourseLevel | null;
  const loc = sp.get('loc');
  const age = sp.get('age') as AgeTag | null;
  if (!id?.trim() || !name?.trim() || !instructor?.trim() || !calendarPc?.trim() || !level) return null;

  const idTrim = id.trim();
  const rowIdFromQuery = sp.get('rowId')?.trim();
  const apiRow =
    rowIdFromQuery || (/^\d+$/.test(idTrim) ? idTrim : undefined);

  return {
    id: idTrim,
    name: name.trim(),
    instructor: instructor.trim(),
    start_time: st,
    end_time: et,
    location: normLoc(loc, 'sanpokong'),
    program_code: calendarPc.trim(),
    level,
    age_tag: age || undefined,
    tag_values: tagValues,
    apiClassRowId: apiRow,
  };
}
