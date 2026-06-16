/**
 * Normalize admin GET /admin/users/:userId/class-enrollments responses.
 */

import type { TokenAssignmentClassRow } from './tokenAssignmentGroups';

export type AdminClassEnrollmentRow = {
  id: string;
  class_id: string;
  status: 'enrolled' | 'attended' | 'absent' | 'sick_leave' | 'cancelled' | 'leave_pending';
  tokens_charged: number;
  enrollment_scope?: string | null;
  created_at: string;
  className: string;
  classCode: string;
  instructor: string;
  start_time: string;
  end_time: string;
  location?: TokenAssignmentClassRow['location'];
  is_internal?: boolean;
  is_cancelled?: boolean;
  lesson_number?: number | null;
  total_lessons?: number;
  token_cost?: number;
};

/** Stable string id for Set/Map lookups (API may return number or string). */
export function normalizeClassId(id: string | number | null | undefined): string {
  if (id == null || id === '') return '';
  return String(id).trim();
}

function readTokensCharged(raw: Record<string, unknown>): number {
  const direct = Number(
    raw.tokens_charged ??
      raw.tokensCharged ??
      raw.tokens_assigned ??
      raw.tokensAssigned ??
      raw.token_count ??
      raw.tokenCount ??
      NaN,
  );
  if (Number.isFinite(direct) && direct > 0) return direct;

  const cls = raw.class as Record<string, unknown> | undefined;
  if (cls) {
    const nested = Number(cls.tokens_charged ?? cls.tokensCharged ?? NaN);
    if (Number.isFinite(nested) && nested > 0) return nested;
  }
  return 0;
}

/** Unwrap list payloads from various backend shapes. */
export function extractClassEnrollmentRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as Record<string, unknown>;
  const candidates = [
    root.data,
    root.enrollments,
    root.class_enrollments,
    root.classEnrollments,
    root.items,
    root.results,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  const nested = root.data;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const inner = nested as Record<string, unknown>;
    for (const key of ['data', 'enrollments', 'class_enrollments', 'classEnrollments', 'items'] as const) {
      if (Array.isArray(inner[key])) return inner[key] as unknown[];
    }
  }
  return [];
}

export function mapAdminClassEnrollmentRow(raw: Record<string, unknown>): AdminClassEnrollmentRow | null {
  const cls = (raw.class ?? raw.class_info ?? raw.classInfo) as Record<string, unknown> | undefined;
  const classId = normalizeClassId(raw.class_id ?? raw.classId ?? cls?.id);
  if (!classId) return null;

  const start = String(cls?.start_time ?? raw.start_time ?? '');
  const end = String(cls?.end_time ?? raw.end_time ?? start);
  const enrollmentId = String(raw.id ?? raw.enrollment_id ?? raw.enrollmentId ?? '').trim();
  const id =
    enrollmentId && enrollmentId !== '0' && enrollmentId !== 'undefined'
      ? enrollmentId
      : `${classId}-${start || 'row'}`;

  const tokensCharged = readTokensCharged(raw);
  const status = (raw.status as AdminClassEnrollmentRow['status']) || 'enrolled';
  const enrollmentScopeRaw = raw.enrollment_scope ?? raw.enrollmentScope;
  const enrollment_scope =
    enrollmentScopeRaw == null || enrollmentScopeRaw === ''
      ? null
      : String(enrollmentScopeRaw).trim();

  return {
    id,
    class_id: classId,
    status,
    tokens_charged: tokensCharged,
    enrollment_scope,
    created_at: String(raw.created_at ?? raw.createdAt ?? ''),
    className: String(cls?.name ?? cls?.class_name ?? raw.class_name ?? raw.className ?? ''),
    classCode: String(cls?.class_code ?? cls?.program_code ?? raw.class_code ?? raw.program_code ?? ''),
    instructor: String(cls?.instructor ?? raw.instructor ?? ''),
    start_time: start,
    end_time: end,
    location: cls?.location as AdminClassEnrollmentRow['location'],
    is_internal: cls?.is_internal === 1 || cls?.is_internal === true,
    is_cancelled: cls?.is_cancelled === 1 || cls?.is_cancelled === true,
    lesson_number: cls?.lesson_number != null ? Number(cls.lesson_number) : null,
    total_lessons:
      cls?.total_lessons != null
        ? Number(cls.total_lessons)
        : raw.total_lessons != null
          ? Number(raw.total_lessons)
          : undefined,
    token_cost:
      cls?.token_cost != null
        ? Number(cls.token_cost)
        : raw.token_cost != null
          ? Number(raw.token_cost)
          : undefined,
  };
}

/** Build a class row from enrollment when GET /admin/classes omits that lesson. */
export function classRowFromEnrollment(enrollment: AdminClassEnrollmentRow): TokenAssignmentClassRow {
  return {
    id: enrollment.class_id,
    name: enrollment.className || enrollment.classCode || enrollment.class_id,
    class_code: enrollment.classCode,
    instructor: enrollment.instructor,
    start_time: enrollment.start_time,
    end_time: enrollment.end_time || enrollment.start_time,
    capacity: 0,
    enrolled_count: 0,
    is_internal: enrollment.is_internal === true,
    is_cancelled: enrollment.is_cancelled === true,
    location: enrollment.location,
    lesson_number: enrollment.lesson_number ?? null,
    total_lessons: enrollment.total_lessons,
    token_cost: enrollment.token_cost ?? 1,
  };
}

export function mergeClassRowsWithEnrollments(
  classes: TokenAssignmentClassRow[],
  enrollments: AdminClassEnrollmentRow[],
  options?: { onlyWithTokens?: boolean },
): TokenAssignmentClassRow[] {
  const onlyWithTokens = options?.onlyWithTokens ?? false;
  const byId = new Map<string, TokenAssignmentClassRow>();
  for (const c of classes) {
    const id = normalizeClassId(c.id);
    if (id) byId.set(id, c);
  }
  for (const e of enrollments) {
    if (onlyWithTokens && e.tokens_charged <= 0) continue;
    const id = normalizeClassId(e.class_id);
    if (!id || byId.has(id)) continue;
    byId.set(id, classRowFromEnrollment(e));
  }
  return Array.from(byId.values());
}

export function enrollmentIsTrialEnrollment(enrollment: AdminClassEnrollmentRow): boolean {
  if (String(enrollment.status).toLowerCase() === 'cancelled') return false;
  return String(enrollment.enrollment_scope ?? '').trim().toLowerCase() === 'trial';
}

export function enrollmentIsTokenAssigned(enrollment: AdminClassEnrollmentRow): boolean {
  if (String(enrollment.status).toLowerCase() === 'cancelled') return false;
  return enrollment.tokens_charged > 0;
}

/** Trial enrollments are on the attendance list but must not receive token assignment. */
export function enrollmentBlocksTokenAssignment(enrollment: AdminClassEnrollmentRow): boolean {
  return enrollmentIsTokenAssigned(enrollment) || enrollmentIsTrialEnrollment(enrollment);
}

function enrollmentPickPriority(enrollment: AdminClassEnrollmentRow): number {
  if (String(enrollment.status).toLowerCase() === 'cancelled') return 0;
  if (enrollmentIsTrialEnrollment(enrollment)) return 4;
  if (enrollment.tokens_charged > 0) return 3;
  return 2;
}

/** When remove + re-assign leaves multiple rows per class_id, pick the active enrollment for UI. */
/** Rows suitable for dedupeLatestEnrollmentPerStudent (attendance list, etc.). */
export type StudentKeyedEnrollmentRow = {
  id: string;
  user_id?: string | number | null;
  user_mobile?: string | null;
  created_at?: string | null;
};

function enrollmentRecencyScore(row: StudentKeyedEnrollmentRow): number {
  const parsed = Date.parse(String(row.created_at ?? ''));
  const time = Number.isFinite(parsed) ? parsed : 0;
  const idNum = Number(row.id);
  const idPart = Number.isFinite(idNum) ? idNum : 0;
  return time * 1_000_000 + idPart;
}

/** After token remove + re-assign, API may return multiple rows per student — keep the latest only. */
export function dedupeLatestEnrollmentPerStudent<T extends StudentKeyedEnrollmentRow>(
  enrollments: T[],
): T[] {
  const byStudent = new Map<string, T>();
  for (const enrollment of enrollments) {
    const key =
      String(enrollment.user_id ?? '').trim() ||
      String(enrollment.user_mobile ?? '').trim() ||
      enrollment.id;
    const prev = byStudent.get(key);
    if (!prev || enrollmentRecencyScore(enrollment) > enrollmentRecencyScore(prev)) {
      byStudent.set(key, enrollment);
    }
  }
  return Array.from(byStudent.values());
}

export function pickCanonicalEnrollmentsByClass(
  enrollments: AdminClassEnrollmentRow[],
): Map<string, AdminClassEnrollmentRow> {
  const byClass = new Map<string, AdminClassEnrollmentRow>();
  for (const enrollment of enrollments) {
    const key = normalizeClassId(enrollment.class_id);
    if (!key) continue;
    const prev = byClass.get(key);
    if (!prev) {
      byClass.set(key, enrollment);
      continue;
    }
    const prevScore = enrollmentPickPriority(prev);
    const nextScore = enrollmentPickPriority(enrollment);
    if (nextScore > prevScore) {
      byClass.set(key, enrollment);
      continue;
    }
    if (nextScore === prevScore && enrollment.created_at > prev.created_at) {
      byClass.set(key, enrollment);
    }
  }
  return byClass;
}
