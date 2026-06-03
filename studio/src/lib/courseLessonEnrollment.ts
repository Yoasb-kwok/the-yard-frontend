/**
 * Shared rules: full-course series, bookable remaining lessons, 1 lesson = N tokens (token_cost).
 */

import { isClassOccurrencePast } from './utils';
import { getEnrollmentTokenCost } from './classEnrollmentTokens';
import { normalizeClassId } from './adminClassEnrollments';

export interface CourseLessonRow {
  id: string;
  name: string;
  class_code: string;
  instructor: string;
  start_time: string;
  end_time: string;
  capacity: number;
  enrolled_count: number;
  is_internal?: boolean;
  is_cancelled: boolean;
  location?: string;
  lesson_number?: number | null;
  total_lessons?: number;
  token_cost?: number;
}

export type LessonEnrollmentUiStatus =
  | 'past'
  | 'full'
  | 'cancelled'
  | 'assigned'
  | 'awaiting_tokens'
  | 'bookable';

export function mapApiClassToCourseLesson(raw: Record<string, unknown>): CourseLessonRow {
  return {
    id: normalizeClassId(raw.id),
    name: String(raw.name ?? ''),
    class_code: String(raw.program_code ?? raw.class_code ?? ''),
    instructor: String(raw.instructor ?? ''),
    start_time: String(raw.start_time ?? ''),
    end_time: String(raw.end_time ?? raw.start_time ?? ''),
    capacity: Number(raw.capacity ?? 0),
    enrolled_count: Number(raw.enrolled_count ?? 0),
    is_internal: raw.is_internal === 1 || raw.is_internal === true,
    is_cancelled: raw.is_cancelled === 1 || raw.is_cancelled === true,
    location: raw.location != null ? String(raw.location) : undefined,
    lesson_number: raw.lesson_number != null ? Number(raw.lesson_number) : null,
    total_lessons: raw.total_lessons != null ? Number(raw.total_lessons) : undefined,
    token_cost: raw.token_cost != null ? Number(raw.token_cost) : 1,
  };
}

export function getCourseSeriesKey(
  c: Pick<CourseLessonRow, 'id' | 'class_code' | 'name' | 'instructor' | 'location' | 'is_internal'>,
): string {
  const code = (c.class_code || '').trim();
  if (code) return `code:${code}:${c.is_internal ? 'internal' : 'regular'}`;
  return `solo:${c.id}`;
}

export function findSeriesLessons<T extends CourseLessonRow>(target: T, classes: T[]): T[] {
  const key = getCourseSeriesKey(target);
  const code = (target.class_code || '').trim();
  let siblings = classes.filter((c) => !c.is_cancelled && getCourseSeriesKey(c) === key);

  if (siblings.length <= 1 && code) {
    siblings = classes.filter(
      (c) => !c.is_cancelled && (c.class_code || '').trim().toLowerCase() === code.toLowerCase(),
    );
  }

  if (siblings.length <= 1 && target.name.trim()) {
    siblings = classes.filter(
      (c) =>
        !c.is_cancelled &&
        c.name.trim() === target.name.trim() &&
        c.instructor.trim() === target.instructor.trim() &&
        c.location === target.location,
    );
  }

  return siblings.sort(
    (a, b) =>
      (Number(a.lesson_number) || 0) - (Number(b.lesson_number) || 0) ||
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  );
}

export function isLessonPast(lesson: Pick<CourseLessonRow, 'end_time' | 'start_time'>): boolean {
  return isClassOccurrencePast(lesson.end_time || lesson.start_time);
}

export function isLessonFull(lesson: Pick<CourseLessonRow, 'capacity' | 'enrolled_count'>): boolean {
  const cap = Number(lesson.capacity) || 0;
  if (cap <= 0) return false;
  return Number(lesson.enrolled_count) >= cap;
}

/** Lessons that count toward enrollment / token charge (not past, not full, not cancelled). */
export function getBookableLessonsInSeries<T extends CourseLessonRow>(
  target: T,
  classes: T[],
): T[] {
  return findSeriesLessons(target, classes).filter(
    (l) => !l.is_cancelled && !isLessonPast(l) && !isLessonFull(l),
  );
}

export function sumLessonTokenCost(lessons: CourseLessonRow[]): number {
  return lessons.reduce((sum, l) => sum + Math.max(1, Number(l.token_cost) || 1), 0);
}

export function getFullCourseEnrollmentCounts(
  target: CourseLessonRow,
  allClasses: CourseLessonRow[],
): {
  bookable: CourseLessonRow[];
  lessonCount: number;
  tokensRequired: number;
  lessonClassIds: string[];
  skippedPast: number;
  skippedFull: number;
  seriesTotal: number;
} {
  const series = findSeriesLessons(target, allClasses);
  const bookable = getBookableLessonsInSeries(target, allClasses);
  const skippedPast = series.filter((l) => !l.is_cancelled && isLessonPast(l)).length;
  const skippedFull = series.filter(
    (l) => !l.is_cancelled && !isLessonPast(l) && isLessonFull(l),
  ).length;
  const lessonCount = bookable.length;
  const tokensRequired = sumLessonTokenCost(bookable);
  return {
    bookable,
    lessonCount,
    tokensRequired,
    lessonClassIds: bookable.map((l) => l.id),
    skippedPast,
    skippedFull,
    seriesTotal: Math.max(series.length, Number(target.total_lessons) || 0),
  };
}

export function getLessonEnrollmentUiStatus(
  lesson: CourseLessonRow,
  options: {
    assignedClassIds: Set<string>;
    awaitingTokensClassIds?: Set<string>;
  },
): LessonEnrollmentUiStatus {
  if (lesson.is_cancelled) return 'cancelled';
  const id = normalizeClassId(lesson.id);
  if (options.assignedClassIds.has(id)) return 'assigned';
  if (isLessonPast(lesson)) return 'past';
  if (isLessonFull(lesson)) return 'full';
  if (options.awaitingTokensClassIds?.has(id)) return 'awaiting_tokens';
  return 'bookable';
}

/** Fetch window for series lessons on public calendar (past + future). */
export function getSeriesFetchRange(): { from: string; to: string } {
  const from = new Date();
  from.setMonth(from.getMonth() - 6);
  from.setHours(0, 0, 0, 0);
  const to = new Date();
  to.setMonth(to.getMonth() + 18);
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

/** Parse lesson_class_ids from API row or enrollment-request create response. */
export function parseLessonClassIds(raw: unknown): string[] {
  if (!raw) return [];
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(',').map((s) => s.trim())
      : [];
  const ids: string[] = [];
  for (const item of list) {
    if (item == null || item === '') continue;
    if (typeof item === 'object') {
      const row = item as Record<string, unknown>;
      const id = normalizeClassId(row.id ?? row.class_id ?? row.classId);
      if (id) ids.push(id);
      continue;
    }
    const id = normalizeClassId(item as string | number);
    if (id) ids.push(id);
  }
  return ids;
}

export function buildEnrollmentRequestBody(input: {
  classId: string;
  lessonCount: number;
  enrollmentScope: 'single_lesson' | 'full_course';
  tokensRequired: number;
  lessonClassIds?: string[];
  studentProfileId?: string | null;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    class_id: input.classId,
    classId: input.classId,
    lesson_count: input.lessonCount,
    enrollment_scope: input.enrollmentScope,
    tokens_required: input.tokensRequired,
  };
  if (input.lessonClassIds?.length) {
    body.lesson_class_ids = input.lessonClassIds;
    body.lessonClassIds = input.lessonClassIds;
  }
  const profileId = input.studentProfileId?.trim();
  if (profileId) {
    body.student_profile_id = profileId;
    body.studentProfileId = profileId;
    body.profile_id = profileId;
  }
  return body;
}

export function getSingleLessonEnrollmentCost(lesson: Pick<CourseLessonRow, 'token_cost'>): number {
  return getEnrollmentTokenCost({ lessonCount: 1, tokenCostPerLesson: lesson.token_cost });
}
