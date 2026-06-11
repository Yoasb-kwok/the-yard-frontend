/**
 * Group admin class rows into courses (same program_code / series) for token assignment UI.
 */

import {
  findSeriesLessons,
  getBookableLessonsInSeries,
  isLessonFull,
  isLessonPast,
} from './courseLessonEnrollment';
import { normalizeClassId } from './adminClassEnrollments';
import { parseLessonClassIds } from './courseLessonEnrollment';

export interface TokenAssignmentClassRow {
  id: string;
  name: string;
  class_code: string;
  instructor: string;
  start_time: string;
  end_time: string;
  capacity: number;
  enrolled_count: number;
  is_internal: boolean;
  is_cancelled: boolean;
  location?: 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui';
  lesson_number?: number | null;
  total_lessons?: number;
  token_cost?: number;
}

export interface TokenAssignmentEnrollmentSlice {
  class_id: string;
  tokens_charged: number;
  status: string;
}

export interface TokenAssignmentCourseGroup {
  key: string;
  programCode: string;
  displayName: string;
  instructor: string;
  location?: TokenAssignmentClassRow['location'];
  totalLessons: number;
  lessons: TokenAssignmentClassRow[];
  /** Lessons with an enrollment (token assigned), regardless of past/future. */
  assignedLessonCount: number;
  unassignedCount: number;
  assignedTokenCount: number;
}

export function getCourseGroupKey(
  c: Pick<
    TokenAssignmentClassRow,
    'id' | 'class_code' | 'name' | 'instructor' | 'location' | 'is_internal'
  >,
): string {
  const code = (c.class_code || '').trim();
  if (code) {
    return `code:${code}:${c.is_internal ? 'internal' : 'regular'}`;
  }
  return `solo:${c.id}`;
}

/** All lesson rows belonging to the same course series as `target`. */
export function findCourseSiblingLessons(
  target: TokenAssignmentClassRow,
  classes: TokenAssignmentClassRow[],
): TokenAssignmentClassRow[] {
  return findSeriesLessons(target, classes);
}

function getCourseTotalLessons(target: TokenAssignmentClassRow, siblings: TokenAssignmentClassRow[]): number {
  const fromRows = Math.max(0, ...siblings.map((l) => Number(l.total_lessons) || 0));
  return Math.max(fromRows, siblings.length, Number(target.total_lessons) || 0);
}

export function buildCourseGroups(
  lessons: TokenAssignmentClassRow[],
  assignedClassIds: Set<string>,
  enrollmentByClassId: Map<string, TokenAssignmentEnrollmentSlice>,
): TokenAssignmentCourseGroup[] {
  const byKey = new Map<string, TokenAssignmentClassRow[]>();
  for (const lesson of lessons) {
    const key = getCourseGroupKey(lesson);
    const list = byKey.get(key) ?? [];
    list.push(lesson);
    byKey.set(key, list);
  }

  const groups: TokenAssignmentCourseGroup[] = [];
  for (const [key, list] of byKey) {
    list.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    const first = list[0];
    let assignedLessonCount = 0;
    let unassignedCount = 0;
    let assignedTokenCount = 0;
    for (const lesson of list) {
      const lessonKey = normalizeClassId(lesson.id);
      if (assignedClassIds.has(lessonKey)) {
        assignedLessonCount += 1;
        const en = enrollmentByClassId.get(lessonKey);
        assignedTokenCount += en?.tokens_charged && en.tokens_charged > 0 ? en.tokens_charged : 1;
      } else if (!lesson.is_cancelled && !isLessonPast(lesson) && !isLessonFull(lesson)) {
        unassignedCount += 1;
      }
    }
    const totalFromApi = Math.max(0, ...list.map((l) => Number(l.total_lessons) || 0));
    groups.push({
      key,
      programCode: first.class_code,
      displayName: first.name,
      instructor: first.instructor,
      location: first.location,
      totalLessons: Math.max(totalFromApi, list.length),
      lessons: list,
      assignedLessonCount,
      unassignedCount,
      assignedTokenCount,
    });
  }

  return groups.sort(
    (a, b) =>
      new Date(a.lessons[0].start_time).getTime() - new Date(b.lessons[0].start_time).getTime(),
  );
}

export function filterGroupsForTab(
  groups: TokenAssignmentCourseGroup[],
  tab: 'unassigned' | 'assigned',
): TokenAssignmentCourseGroup[] {
  if (tab === 'unassigned') {
    return groups.filter((g) => g.unassignedCount > 0);
  }
  return groups.filter((g) => g.assignedTokenCount > 0);
}

export type TokenAssignPlan =
  | { mode: 'single'; classId: string; quantity: number }
  | {
      mode: 'batch';
      lessonIds: string[];
      courseName: string;
      tokensPerLesson: number;
      /** Shown when fewer class rows exist than the enrollment requires. */
      expectedLessonCount?: number;
    };

/**
 * Full-course token grants should charge one class row per lesson (quantity 1 each),
 * not quantity N on a single class_id.
 */
export function resolveTokenAssignPlan(input: {
  classId: string;
  tokenCount: number;
  classes: TokenAssignmentClassRow[];
  canAssign: (lesson: TokenAssignmentClassRow) => boolean;
  /** Admin full-course batch: allow past dates / existing enrollment without tokens. */
  canAssignFullCourse?: (lesson: TokenAssignmentClassRow) => boolean;
  enrollmentScope?: 'single_lesson' | 'full_course';
  expectedLessonCount?: number;
  /** class_id from enrollment request URL — batch should fulfill request on this lesson first */
  preferredLinkClassId?: string;
  /** Authoritative list from enrollment request (backend lesson_class_ids). */
  requestLessonClassIds?: string[];
}): TokenAssignPlan {
  const count = Math.max(1, Math.floor(Number(input.tokenCount) || 1));
  const target = input.classes.find((c) => c.id === input.classId);
  if (!target) {
    return { mode: 'single', classId: input.classId, quantity: count };
  }

  const tokensPerLesson = Math.max(1, Number(target.token_cost) || 1);
  const siblings = findCourseSiblingLessons(target, input.classes);
  const bookable = getBookableLessonsInSeries(target, input.classes);
  const isFullCourse =
    input.enrollmentScope === 'full_course' ||
    (input.expectedLessonCount != null && input.expectedLessonCount > 1) ||
    count > tokensPerLesson;

  if (siblings.length <= 1 && !isFullCourse) {
    return { mode: 'single', classId: input.classId, quantity: count };
  }

  const lessonsRequested = Math.max(
    1,
    input.expectedLessonCount ?? 0,
    Math.ceil(count / tokensPerLesson),
  );

  const canPick = input.canAssignFullCourse ?? input.canAssign;
  const assignable = bookable.filter((c) => canPick(c));

  const requestIds = parseLessonClassIds(input.requestLessonClassIds);
  if (requestIds.length > 0 && isFullCourse) {
    const byId = new Map(input.classes.map((c) => [normalizeClassId(c.id), c]));
    const fromRequest = requestIds
      .map((id) => byId.get(normalizeClassId(id)))
      .filter((c): c is TokenAssignmentClassRow => c != null && canPick(c));
    if (fromRequest.length > 0) {
      let lessonIds = fromRequest.map((c) => c.id);
      const preferred = input.preferredLinkClassId?.trim();
      if (preferred && lessonIds.includes(preferred)) {
        lessonIds = [preferred, ...lessonIds.filter((id) => id !== preferred)];
      }
      return {
        mode: 'batch',
        lessonIds,
        courseName: target.name,
        tokensPerLesson,
        expectedLessonCount: lessonIds.length,
      };
    }
  }

  if (assignable.length === 0) {
    return { mode: 'single', classId: input.classId, quantity: Math.min(count, tokensPerLesson) };
  }

  const lessonsToAssign = Math.min(
    assignable.length,
    isFullCourse ? lessonsRequested : Math.ceil(count / tokensPerLesson),
  );

  if (lessonsToAssign <= 1 && count <= tokensPerLesson && !isFullCourse) {
    return { mode: 'single', classId: input.classId, quantity: count };
  }

  let lessonIds = assignable.slice(0, lessonsToAssign).map((c) => c.id);
  const preferred = input.preferredLinkClassId?.trim();
  if (preferred && lessonIds.includes(preferred)) {
    lessonIds = [preferred, ...lessonIds.filter((id) => id !== preferred)];
  }

  return {
    mode: 'batch',
    lessonIds,
    courseName: target.name,
    tokensPerLesson,
    expectedLessonCount: isFullCourse ? lessonIds.length : undefined,
  };
}
