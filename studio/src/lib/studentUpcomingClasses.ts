/**
 * GET /student/upcoming-classes — parse & fetch (one row per lesson when backend provides it).
 */

import { api } from './api';
import { withStudentProfileQuery } from './studentProfileScope';
import {
  filterEnrollmentsForActiveProfile,
  isPerLessonEnrollmentRow,
  pickEnrollmentProfileId,
  type EnrolledClass,
} from './studentEnrollments';

const HIDDEN_ENROLLMENT_STATUSES = new Set(['cancelled', 'canceled', 'refunded']);

function enrollmentStatusIsVisible(status: string): boolean {
  return !HIDDEN_ENROLLMENT_STATUSES.has(status.trim().toLowerCase());
}

function enrollmentRecencyScore(enrollment: EnrolledClass): number {
  const parsed = Date.parse(String(enrollment.created_at ?? ''));
  const time = Number.isFinite(parsed) ? parsed : 0;
  const idNum = Number(enrollment.id);
  const idPart = Number.isFinite(idNum) ? idNum : 0;
  return time * 1_000_000 + idPart;
}

/** Token remove + re-assign can leave multiple rows per class — keep latest; hide cancelled. */
export function dedupeLatestEnrollmentPerClass(enrollments: EnrolledClass[]): EnrolledClass[] {
  const byClass = new Map<string, EnrolledClass>();
  for (const enrollment of enrollments) {
    const classId = enrollment.class_id?.trim();
    const fallbackKey = `${enrollment.class.program_code ?? ''}|${enrollment.class.start_time}`;
    const classKey = classId || fallbackKey;
    const profileKey = pickEnrollmentProfileId(enrollment) ?? '';
    const key =
      classKey && classKey !== '|'
        ? `${profileKey}::${classKey}`
        : `enrollment:${enrollment.id}`;
    const prev = byClass.get(key);
    if (!prev || enrollmentRecencyScore(enrollment) > enrollmentRecencyScore(prev)) {
      byClass.set(key, enrollment);
    }
  }
  return Array.from(byClass.values()).filter((e) => enrollmentStatusIsVisible(e.status));
}

function readClassBlock(raw: Record<string, unknown>): EnrolledClass['class'] {
  const nested =
    raw.class && typeof raw.class === 'object'
      ? (raw.class as Record<string, unknown>)
      : raw;

  const programCode = String(
    nested.program_code ?? nested.class_code ?? nested.programCode ?? '',
  ).trim();

  const lessonNumberRaw = nested.lesson_number ?? nested.lessonNumber;
  const lesson_number =
    lessonNumberRaw != null && lessonNumberRaw !== '' ? Number(lessonNumberRaw) : null;

  const location = nested.location != null ? String(nested.location) : undefined;

  return {
    name: String(nested.name ?? ''),
    instructor: String(nested.instructor ?? ''),
    start_time: String(nested.start_time ?? nested.startTime ?? ''),
    end_time: String(nested.end_time ?? nested.endTime ?? nested.start_time ?? ''),
    program_code: programCode || undefined,
    location: location as EnrolledClass['class']['location'],
    token_cost: nested.token_cost != null ? Number(nested.token_cost) : nested.tokenCost != null ? Number(nested.tokenCost) : undefined,
    lesson_number: Number.isFinite(lesson_number) && lesson_number > 0 ? lesson_number : null,
    is_cancelled: nested.is_cancelled === 1 || nested.is_cancelled === true || nested.isCancelled === true,
  };
}

function readLeaveRequests(raw: Record<string, unknown>): EnrolledClass['leave_requests'] {
  const list = raw.leave_requests ?? raw.leaveRequests;
  if (!Array.isArray(list)) return undefined;
  return list.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      lesson_index: Number(row.lesson_index ?? row.lessonIndex ?? 0),
      leave_type: (row.leave_type ?? row.leaveType ?? 'personal') as 'personal' | 'sick',
      status: String(row.status ?? 'pending'),
    };
  });
}

/** Normalise one API enrollment row (per-lesson or legacy bundle). */
export function normalizeEnrollmentRow(raw: unknown): EnrolledClass | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const id = String(row.id ?? row.enrollment_id ?? row.enrollmentId ?? '').trim();
  if (!id) return null;

  const cls = readClassBlock(row);
  if (!cls.start_time) return null;

  return {
    id,
    class_id: row.class_id != null ? String(row.class_id) : row.classId != null ? String(row.classId) : undefined,
    status: String(row.status ?? 'active'),
    created_at:
      row.created_at != null
        ? String(row.created_at)
        : row.createdAt != null
          ? String(row.createdAt)
          : undefined,
    user_id: row.user_id != null ? String(row.user_id) : undefined,
    profile_id:
      row.profile_id != null
        ? String(row.profile_id)
        : row.student_profile_id != null
          ? String(row.student_profile_id)
          : undefined,
    user_name: row.user_name != null ? String(row.user_name) : row.student_name != null ? String(row.student_name) : undefined,
    class: cls,
    attended_lessons: row.attended_lessons != null ? Number(row.attended_lessons) : row.attendedLessons != null ? Number(row.attendedLessons) : undefined,
    lessons_used: row.lessons_used != null ? Number(row.lessons_used) : row.lessonsUsed != null ? Number(row.lessonsUsed) : undefined,
    lessons_remaining:
      row.lessons_remaining != null
        ? Number(row.lessons_remaining)
        : row.lessonsRemaining != null
          ? Number(row.lessonsRemaining)
          : undefined,
    tokens_charged: row.tokens_charged != null ? Number(row.tokens_charged) : row.tokensCharged != null ? Number(row.tokensCharged) : undefined,
    lesson_count: row.lesson_count != null ? Number(row.lesson_count) : row.lessonCount != null ? Number(row.lessonCount) : undefined,
    course_total_lessons:
      row.course_total_lessons != null
        ? Number(row.course_total_lessons)
        : row.total_lessons != null
          ? Number(row.total_lessons)
          : undefined,
    total_lessons: row.total_lessons != null ? Number(row.total_lessons) : undefined,
    leave_requests: readLeaveRequests(row),
    extension_application:
      row.extension_application && typeof row.extension_application === 'object'
        ? (row.extension_application as EnrolledClass['extension_application'])
        : undefined,
    sick_leave_application:
      row.sick_leave_application && typeof row.sick_leave_application === 'object'
        ? (row.sick_leave_application as EnrolledClass['sick_leave_application'])
        : undefined,
  };
}

export function parseStudentUpcomingClassesResponse(payload: unknown): EnrolledClass[] {
  if (Array.isArray(payload)) {
    return payload.map(normalizeEnrollmentRow).filter((e): e is EnrolledClass => e != null);
  }
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as Record<string, unknown>;
  const candidates = [root.data, root.enrollments, root.upcoming_classes, root.upcomingClasses, root.items];
  for (const c of candidates) {
    if (Array.isArray(c)) {
      return c.map(normalizeEnrollmentRow).filter((e): e is EnrolledClass => e != null);
    }
  }
  return [];
}

export async function fetchStudentUpcomingClasses(
  profileId?: string | null,
  options?: { singleProfileAccount?: boolean },
): Promise<EnrolledClass[]> {
  const res = await api.get<unknown>(
    '/student/upcoming-classes',
    withStudentProfileQuery(undefined, profileId),
  );
  const raw = (res as { data?: unknown }).data ?? res;
  const list = parseStudentUpcomingClassesResponse(raw).filter((e) => !e.class.is_cancelled);
  const scoped = filterEnrollmentsForActiveProfile(list, profileId, options);
  return dedupeLatestEnrollmentPerClass(scoped);
}

/** Match leave to lesson_number (1-based) or calendar lessonIndex (0-based). Leave never shifts dates. */
export function findLeaveRequestForEnrollment(
  enrollment: EnrolledClass,
  lessonIndex: number,
): NonNullable<EnrolledClass['leave_requests']>[number] | undefined {
  const requests = enrollment.leave_requests ?? [];
  if (requests.length === 0) return undefined;
  const lessonNum = enrollment.class.lesson_number;
  if (lessonNum != null && lessonNum >= 1) {
    return (
      requests.find((r) => r.lesson_index === lessonNum) ??
      requests.find((r) => r.lesson_index === lessonNum - 1)
    );
  }
  return (
    requests.find((r) => r.lesson_index === lessonIndex) ??
    requests.find((r) => r.lesson_index === lessonIndex + 1)
  );
}

export interface StudentScheduleEventOccurrence {
  start: Date;
  end: Date;
  enrollment: EnrolledClass;
  lessonIndex: number;
}

/** Calendar events: per-lesson rows use API start/end; legacy bundle uses computed lesson dates. */
export function buildStudentScheduleEventOccurrences(
  enrollments: EnrolledClass[],
  lessonDatesByEnrollment: Date[][],
): StudentScheduleEventOccurrence[] {
  const out: StudentScheduleEventOccurrence[] = [];

  enrollments.forEach((e, idx) => {
    const dates = lessonDatesByEnrollment[idx] ?? [];

    if (isPerLessonEnrollmentRow(e) && dates.length <= 1) {
      const start = new Date(e.class.start_time);
      if (Number.isNaN(start.getTime())) return;
      let end = new Date(e.class.end_time);
      if (Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
        end = new Date(start.getTime() + 60 * 60 * 1000);
      }
      const lessonIndex = Math.max(0, (e.class.lesson_number ?? 1) - 1);
      out.push({ start, end, enrollment: e, lessonIndex });
      return;
    }

    const anchorStart = new Date(e.class.start_time);
    const anchorEnd = new Date(e.class.end_time);
    const durationMs =
      !Number.isNaN(anchorEnd.getTime()) && !Number.isNaN(anchorStart.getTime()) && anchorEnd > anchorStart
        ? anchorEnd.getTime() - anchorStart.getTime()
        : 60 * 60 * 1000;

    dates.forEach((lessonDate, lessonIndex) => {
      const start = new Date(lessonDate);
      if (!Number.isNaN(anchorStart.getTime())) {
        start.setHours(anchorStart.getHours(), anchorStart.getMinutes(), anchorStart.getSeconds(), 0);
      }
      const end = new Date(start.getTime() + durationMs);
      out.push({ start, end, enrollment: e, lessonIndex });
    });
  });

  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}
