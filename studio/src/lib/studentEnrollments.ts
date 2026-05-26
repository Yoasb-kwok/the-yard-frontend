/**
 * Single source of truth for student enrollments (報名課程).
 * Used by SchedulePage, StudentSidebarSchedule, and DashboardPage so
 * 課程表、左側欄、日曆、Dashboard 報名課程 all show the same data per profile.
 * Demo 課程與主頁/日曆一致，來自 demoCourses。
 */

import { getFallbackEnrolledClassesForStudent } from './demoCourses';
import { getLessonDates, getLessonDatesSkipHolidays } from './utils';

export const DEMO_PROFILE_IDS = ['student-001', 'student-001-sub-2', 'student-001-sub-3'];

export interface EnrolledClass {
  id: string;
  status: string;
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

/** 與主頁展示的課程一致：兒童芭蕾、爵士舞、幼兒律動（來自 demoCourses） */
export function getFallbackUpcomingClasses(profileId?: string, profileName?: string): EnrolledClass[] {
  return getFallbackEnrolledClassesForStudent(profileId, profileName);
}

/**
 * Only inject demo enrollments for known demo profiles.
 * New real users should see empty upcoming classes when no data exists.
 */
export function shouldUseDemoUpcomingClasses(profileId?: string): boolean {
  return Boolean(profileId && DEMO_PROFILE_IDS.includes(profileId));
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

/** Weekly lesson dates for this enrollment only (enrolled slot count). */
export function getLessonDatesForEnrollment(
  e: EnrolledClass,
  holidayDatesSet?: Set<string>,
): Date[] {
  const count = getEnrolledLessonSlotCount(e);
  return getLessonDatesForClass(e.class.start_time, count, holidayDatesSet);
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
