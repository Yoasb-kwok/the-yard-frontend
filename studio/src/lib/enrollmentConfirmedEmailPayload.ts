/**
 * Email context when admin confirms enrollment by assigning tokens to a class.
 * Backend should send `class_enrollment_confirmed` using these fields (see TOKEN_ENROLLMENT_SPEC.md).
 */

import { getEnrollmentLessonSlots, type EnrollmentLessonSlot } from './studentEnrollments';
import { formatDateTimeRange } from './utils';

export const ENROLLMENT_CONFIRMED_EMAIL_TYPE = 'class_enrollment_confirmed' as const;

export type EnrollmentLessonEmailRow = {
  lesson_index: number;
  start_time: string;
  end_time: string;
  date_time_formatted: string;
  /** Present when lesson moved due to public holiday. */
  postponed_from?: string;
};

export type EnrollmentConfirmedEmailContext = {
  student_name: string;
  student_email: string;
  class_name: string;
  class_id: string;
  lesson_count: number;
  tokens_assigned: number;
  lessons: EnrollmentLessonEmailRow[];
  class_code?: string;
  instructor?: string;
  branch?: string;
  branch_label?: string;
  enrollment_scope?: 'single_lesson' | 'full_course';
};

export type EnrollmentConfirmedEmailExtras = EnrollmentConfirmedEmailContext & {
  send_confirmation_email: true;
  sendConfirmationEmail: true;
  confirmation_email_type: typeof ENROLLMENT_CONFIRMED_EMAIL_TYPE;
  confirmationEmailType: typeof ENROLLMENT_CONFIRMED_EMAIL_TYPE;
  language: string;
};

function lessonSlotToEmailRow(slot: EnrollmentLessonSlot, locale: string): EnrollmentLessonEmailRow {
  const startIso = slot.start.toISOString();
  const endIso = slot.end.toISOString();
  return {
    lesson_index: slot.lessonIndex,
    start_time: startIso,
    end_time: endIso,
    date_time_formatted: formatDateTimeRange(startIso, endIso, locale),
    ...(slot.originalDateStr ? { postponed_from: slot.originalDateStr } : {}),
  };
}

/** Build lesson rows for confirmation email (all enrolled lessons with date + time range). */
export function buildEnrollmentLessonEmailRows(input: {
  start_time: string;
  end_time: string;
  lessonCount: number;
  locale: string;
  holidayDatesSet?: Set<string>;
}): EnrollmentLessonEmailRow[] {
  return getEnrollmentLessonSlots(input).map((slot) => lessonSlotToEmailRow(slot, input.locale));
}

export function buildEnrollmentConfirmedEmailExtras(
  ctx: EnrollmentConfirmedEmailContext & { language: string },
): EnrollmentConfirmedEmailExtras {
  return {
    send_confirmation_email: true,
    sendConfirmationEmail: true,
    confirmation_email_type: ENROLLMENT_CONFIRMED_EMAIL_TYPE,
    confirmationEmailType: ENROLLMENT_CONFIRMED_EMAIL_TYPE,
    language: ctx.language,
    student_name: ctx.student_name,
    student_email: ctx.student_email,
    class_name: ctx.class_name,
    class_id: ctx.class_id,
    lesson_count: ctx.lesson_count,
    tokens_assigned: ctx.tokens_assigned,
    lessons: ctx.lessons,
    ...(ctx.class_code ? { class_code: ctx.class_code } : {}),
    ...(ctx.instructor ? { instructor: ctx.instructor } : {}),
    ...(ctx.branch ? { branch: ctx.branch } : {}),
    ...(ctx.branch_label ? { branch_label: ctx.branch_label } : {}),
    ...(ctx.enrollment_scope ? { enrollment_scope: ctx.enrollment_scope } : {}),
  };
}
