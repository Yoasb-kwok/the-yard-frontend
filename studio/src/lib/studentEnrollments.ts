/**
 * Single source of truth for student enrollments (報名課程).
 * Used by SchedulePage, StudentSidebarSchedule, and DashboardPage.
 */

import { pickStudentProfileId } from './studentProfileScope';
import { getLessonDates, getLessonDatesSkipHolidays } from './utils';

export interface EnrolledClass {
  id: string;
  status: string;
  created_at?: string;
  class_id?: string;
  user_id?: string;
  profile_id?: string;
  user_name?: string;
  class: {
    name: string;
    instructor: string;
    start_time: string;
    end_time: string;
    program_code?: string;
    /** 上課地點，用於顯示分店名、地址、打開地圖 */
    location?: 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui';
    /** Tokens per lesson for this class (default 1). */
    token_cost?: number;
    /** Lesson number in series (1..N); matches backend classes.lesson_number */
    lesson_number?: number | null;
    is_cancelled?: boolean;
  };
  attended_lessons?: number;
  /** Lessons already used / attended. */
  lessons_used?: number;
  /** Lessons still booked (not yet attended). */
  lessons_remaining?: number;
  /** Tokens deducted at enrollment. */
  tokens_charged?: number;
  /** Lessons paid for at enrollment (same as lesson_count from POST). */
  lesson_count?: number;
  /** Full course length in DB (4/8/16) — not always equal to enrolled slots. */
  course_total_lessons?: number;
  /** @deprecated Prefer getEnrolledLessonSlotCount(); may be course total from API. */
  total_lessons?: number;
  /** Per-lesson leave from API (approved/pending/rejected) */
  leave_requests?: { lesson_index: number; leave_type: 'personal' | 'sick'; status: string }[];
  extension_application?: { status: string; rejection_reason?: string };
  sick_leave_application?: { status: string; rejection_reason?: string };
}

/** Profile id on an enrollment row (never use account user_id for sibling scoping). */
export function pickEnrollmentProfileId(
  e: Pick<EnrolledClass, 'profile_id'> | Record<string, unknown>,
): string | null {
  return pickStudentProfileId(e as Record<string, unknown>);
}

/**
 * Keep only enrollments for the active student profile.
 * When the account has multiple family profiles, rows without profile_id are excluded.
 */
export function filterEnrollmentsForActiveProfile<T extends EnrolledClass>(
  list: T[],
  profileId: string | null | undefined,
  options?: { singleProfileAccount?: boolean },
): T[] {
  const pid = profileId?.trim();
  if (!pid) return list;
  const legacy = options?.singleProfileAccount === true;
  return list.filter((e) => {
    const rowProfile = pickEnrollmentProfileId(e);
    if (rowProfile) return rowProfile === pid;
    return legacy;
  });
}

/**
 * How many lesson dates to show on the student schedule for this enrollment.
 * Uses booked/paid count — not the full course total_lessons (e.g. 16).
 */
export function getEnrolledLessonSlotCount(e: EnrolledClass): number {
  const used = Number(e.attended_lessons ?? e.lessons_used ?? 0);
  const remaining = Number(e.lessons_remaining);
  if (Number.isFinite(remaining) && remaining >= 0) {
    const booked = remaining + (Number.isFinite(used) && used > 0 ? used : 0);
    if (booked > 0) return Math.floor(booked);
  }

  const lessonCount = Number(e.lesson_count);
  if (Number.isFinite(lessonCount) && lessonCount > 0) return Math.floor(lessonCount);

  const charged = Number(e.tokens_charged);
  const perLesson = Math.max(1, Number(e.class?.token_cost) || 1);
  if (Number.isFinite(charged) && charged > 0) {
    return Math.max(1, Math.round(charged / perLesson));
  }

  const courseTotal = Number(e.course_total_lessons ?? e.total_lessons);
  if (Number.isFinite(courseTotal) && courseTotal > 0) return Math.floor(courseTotal);
  return 1;
}

/** Remaining booked lessons for one enrollment row. */
export function getEnrollmentLessonsRemaining(e: EnrolledClass): number {
  const remaining = Number(e.lessons_remaining);
  if (Number.isFinite(remaining) && remaining >= 0) return Math.floor(remaining);
  const booked = getEnrolledLessonSlotCount(e);
  const attended = Math.max(0, Number(e.attended_lessons ?? e.lessons_used ?? 0));
  return Math.max(0, booked - attended);
}

/** One API row = one scheduled lesson (backend returns one enrollment per class row). */
export function isPerLessonEnrollmentRow(e: EnrolledClass): boolean {
  if (e.class.is_cancelled) return false;
  const lessonNum = e.class.lesson_number;
  if (lessonNum != null && lessonNum >= 1) return true;
  const lessonCount = Number(e.lesson_count);
  if (Number.isFinite(lessonCount) && lessonCount === 1) return true;
  const charged = Number(e.tokens_charged);
  const perLesson = Math.max(1, Number(e.class.token_cost) || 1);
  if (Number.isFinite(charged) && charged > 0 && charged <= perLesson) return true;
  return false;
}

/** Group key for the same course series (multiple class rows / lesson numbers). */
export function getEnrollmentCourseGroupKey(e: EnrolledClass): string {
  const code = (e.class.program_code ?? '').trim();
  if (code) return `code:${code.toLowerCase()}`;
  const name = e.class.name.trim();
  const instructor = e.class.instructor.trim();
  const location = e.class.location ?? '';
  return `course:${name}|${instructor}|${location}`;
}

export interface GroupedCourseEnrollment {
  key: string;
  name: string;
  programCode?: string;
  instructor: string;
  location?: EnrolledClass['class']['location'];
  enrollments: EnrolledClass[];
  bookedLessons: number;
  attendedLessons: number;
  remainingLessons: number;
}

/** Merge per-lesson enrollment rows into one row per course (program). */
export function groupEnrollmentsByCourse(list: EnrolledClass[]): GroupedCourseEnrollment[] {
  const map = new Map<string, GroupedCourseEnrollment>();
  for (const e of list) {
    const key = getEnrollmentCourseGroupKey(e);
    let group = map.get(key);
    if (!group) {
      group = {
        key,
        name: e.class.name,
        programCode: e.class.program_code,
        instructor: e.class.instructor,
        location: e.class.location,
        enrollments: [],
        bookedLessons: 0,
        attendedLessons: 0,
        remainingLessons: 0,
      };
      map.set(key, group);
    }
    group.enrollments.push(e);
  }

  for (const group of map.values()) {
    const perLesson = group.enrollments.length > 1 && group.enrollments.every(isPerLessonEnrollmentRow);
    if (perLesson) {
      group.bookedLessons = group.enrollments.length;
      group.attendedLessons = group.enrollments.reduce(
        (sum, e) => sum + Math.max(0, Number(e.attended_lessons ?? e.lessons_used ?? 0)),
        0,
      );
      group.remainingLessons = group.enrollments.reduce(
        (sum, e) => sum + getEnrollmentLessonsRemaining(e),
        0,
      );
    } else {
      for (const e of group.enrollments) {
        group.bookedLessons += getEnrolledLessonSlotCount(e);
        group.attendedLessons += Math.max(0, Number(e.attended_lessons ?? e.lessons_used ?? 0));
        group.remainingLessons += getEnrollmentLessonsRemaining(e);
      }
    }
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
}

/**
 * Preview / enroll modal: may shift lessons off public holidays.
 * Do not use for student schedule after enrollment — admin class rows already have final dates.
 */
export function getLessonDatesForEnrollment(
  e: EnrolledClass,
  holidayDatesSet?: Set<string>,
): Date[] {
  const count = getEnrolledLessonSlotCount(e);
  return getLessonDatesForClass(e.class.start_time, count, holidayDatesSet);
}

/**
 * Student schedule: weekly from anchor only, never re-apply holiday skip (avoids double-shift vs admin).
 * Leave requests do not move dates — UI shows status on the original slot only.
 */
export function getLessonDatesForStudentSchedule(e: EnrolledClass): Date[] {
  const count = getEnrolledLessonSlotCount(e);
  if (count <= 1) {
    const d = new Date(e.class.start_time);
    return Number.isNaN(d.getTime()) ? [] : [d];
  }
  return getLessonDates(e.class.start_time, count);
}

/**
 * Build per-enrollment lesson dates for schedule UI.
 * Multiple rows per program_code → each row's class.start_time (authoritative).
 * Single row with N lessons → weekly from anchor, no holiday re-shift.
 */
export function buildLessonDatesByEnrollmentId(enrollments: EnrolledClass[]): Map<string, Date[]> {
  const map = new Map<string, Date[]>();
  const groups = groupEnrollmentsByCourse(enrollments);

  for (const group of groups) {
    const perLesson =
      group.enrollments.length > 1 && group.enrollments.every(isPerLessonEnrollmentRow);
    if (perLesson) {
      const sorted = [...group.enrollments].sort((a, b) => {
        const na = a.class.lesson_number ?? 0;
        const nb = b.class.lesson_number ?? 0;
        if (na !== nb) return na - nb;
        return new Date(a.class.start_time).getTime() - new Date(b.class.start_time).getTime();
      });
      sorted.forEach((e) => {
        const d = new Date(e.class.start_time);
        map.set(e.id, Number.isNaN(d.getTime()) ? [] : [d]);
      });
      continue;
    }
    const e = group.enrollments[0];
    if (e) map.set(e.id, getLessonDatesForStudentSchedule(e));
  }

  for (const e of enrollments) {
    if (!map.has(e.id)) map.set(e.id, getLessonDatesForStudentSchedule(e));
  }
  return map;
}

function dateKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Lesson dates for a class before/while enrolling (preview in enroll modal). */
export function getLessonDatesForClass(
  firstLessonStart: string,
  lessonCount: number,
  holidayDatesSet?: Set<string>,
): Date[] {
  const count = Math.max(1, Math.floor(lessonCount) || 1);
  if (holidayDatesSet && holidayDatesSet.size > 0) {
    return getLessonDatesSkipHolidays(firstLessonStart, count, holidayDatesSet);
  }
  return getLessonDates(firstLessonStart, count);
}

export interface EnrollmentLessonSlot {
  lessonIndex: number;
  start: Date;
  end: Date;
  /** Set when this slot was moved due to a public holiday. */
  originalDateStr?: string;
}

/** Per-lesson start/end for enrollment confirmation UI. */
export function getEnrollmentLessonSlots(input: {
  start_time: string;
  end_time: string;
  lessonCount: number;
  holidayDatesSet?: Set<string>;
}): EnrollmentLessonSlot[] {
  const count = Math.max(1, Math.floor(input.lessonCount) || 1);
  const classStart = new Date(input.start_time);
  const classEnd = new Date(input.end_time);
  const durationMs =
    Number.isFinite(classEnd.getTime()) && Number.isFinite(classStart.getTime())
      ? Math.max(0, classEnd.getTime() - classStart.getTime())
      : 60 * 60 * 1000;

  const naiveDates = getLessonDates(input.start_time, count);
  const dates = getLessonDatesForClass(input.start_time, count, input.holidayDatesSet);

  return dates.map((start, i) => {
    const naive = naiveDates[i];
    const originalDateStr =
      naive && dateKeyLocal(naive) !== dateKeyLocal(start) ? dateKeyLocal(naive) : undefined;
    return {
      lessonIndex: i + 1,
      start,
      end: new Date(start.getTime() + durationMs),
      originalDateStr,
    };
  });
}
