import { api, ApiError } from './api';
import type { EnrollmentConfirmedEmailExtras } from './enrollmentConfirmedEmailPayload';

export interface AssignTokensToClassInput {
  userId: string;
  classId: string;
  quantity: number;
  /** Deduct from this student profile's token pool (multi-child accounts). */
  studentProfileId?: string;
  enrollmentRequestId?: string;
  /** Included so confirmation email lists every lesson date and time range. */
  confirmationEmail?: EnrollmentConfirmedEmailExtras;
  /** full_course: admin assigns all lessons in a series (see TOKEN_ENROLLMENT_SPEC §3.2). */
  enrollmentScope?: 'single_lesson' | 'full_course';
  /** Ask backend to skip CLASS_PAST for admin full-course token assignment. */
  allowPastLessons?: boolean;
  /** All class row ids in the course batch (same program_code series). */
  lessonClassIds?: string[];
}

export interface AssignTokensToClassResult {
  enrollments?: unknown[];
}

export interface UnassignTokensFromClassInput {
  enrollmentId: string;
  userId: string;
  classId: string;
  studentProfileId?: string;
  /** Optional audit note (e.g. admin remove from token assignment page). */
  remarks?: string;
}

export interface UnassignTokensFromClassResult {
  tokens_refunded?: number;
  tokensRefunded?: number;
  remaining_tokens?: number;
  remainingTokens?: number;
  assigned_tokens?: number;
  assignedTokens?: number;
  enrollment_request_id?: string;
  enrollmentRequestId?: string;
  enrollment_request_status?: string;
  enrollmentRequestStatus?: string;
}

/** Backend often expects numeric ids; coerce when the string is a plain integer. */
export function coerceAssignApiId(value: string): string | number {
  const trimmed = value.trim();
  if (!trimmed) return value;
  const n = Number(trimmed);
  if (Number.isInteger(n) && String(n) === trimmed) return n;
  return trimmed;
}

export function formatAssignTokensApiError(err: unknown): string {
  if (!(err instanceof ApiError)) {
    return err instanceof Error ? err.message : String(err);
  }
  const parts = [err.message];
  if (err.code) parts.push(`(${err.code})`);
  const status = err.data?.current_status ?? err.data?.currentStatus;
  if (typeof status === 'string' && status.trim()) {
    parts.push(`[status: ${status}]`);
  }
  return parts.join(' ');
}

export async function postAdminAssignTokensToClass(
  input: AssignTokensToClassInput,
): Promise<AssignTokensToClassResult> {
  const body: Record<string, unknown> = {
    user_id: coerceAssignApiId(input.userId),
    class_id: coerceAssignApiId(input.classId),
    quantity: input.quantity,
  };
  if (input.studentProfileId?.trim()) {
    const pid = coerceAssignApiId(input.studentProfileId.trim());
    body.student_profile_id = pid;
    body.studentProfileId = pid;
    body.profile_id = pid;
  }
  if (input.enrollmentRequestId) {
    body.enrollment_request_id = coerceAssignApiId(input.enrollmentRequestId);
  }
  if (input.confirmationEmail) {
    Object.assign(body, input.confirmationEmail);
  }
  if (input.enrollmentScope) {
    body.enrollment_scope = input.enrollmentScope;
  }
  if (input.allowPastLessons) {
    body.allow_past_lessons = true;
    body.allowPastLessons = true;
  }
  if (input.lessonClassIds?.length) {
    body.lesson_class_ids = input.lessonClassIds.map((id) => coerceAssignApiId(id));
    body.lessonClassIds = body.lesson_class_ids;
  }

  const res = await api.post<AssignTokensToClassResult>('/admin/token-assignment/assign-to-class', body);
  if (res.success === false) {
    throw new ApiError(400, res.msg || 'Request failed');
  }
  return res.data ?? {};
}

/** Mark enrollment request fulfilled after per-lesson token assigns (quantity=1 each). */
export async function patchFulfillEnrollmentRequest(requestId: string): Promise<void> {
  const id = encodeURIComponent(String(coerceAssignApiId(requestId)));
  const res = await api.patch(`/admin/enrollment-requests/${id}`, {
    status: 'fulfilled',
  });
  if (res.success === false) {
    throw new ApiError(400, res.msg || 'Failed to fulfill enrollment request');
  }
}

/** Remove token assignment for one lesson; refunds tokens to the user's unassigned pool. */
export async function postAdminUnassignTokensFromClass(
  input: UnassignTokensFromClassInput,
): Promise<UnassignTokensFromClassResult> {
  const body: Record<string, unknown> = {
    enrollment_id: coerceAssignApiId(input.enrollmentId),
    user_id: coerceAssignApiId(input.userId),
    class_id: coerceAssignApiId(input.classId),
  };
  if (input.studentProfileId?.trim()) {
    const pid = coerceAssignApiId(input.studentProfileId.trim());
    body.student_profile_id = pid;
    body.studentProfileId = pid;
    body.profile_id = pid;
  }
  if (input.remarks?.trim()) {
    body.remarks = input.remarks.trim();
  }

  const res = await api.post<UnassignTokensFromClassResult>(
    '/admin/token-assignment/unassign-from-class',
    body,
  );
  if (res.success === false) {
    const code = typeof (res as { code?: unknown }).code === 'string' ? (res as { code: string }).code : undefined;
    throw new ApiError(400, res.msg || 'Request failed', code);
  }
  return res.data ?? {};
}

export function readUnassignTokensRefunded(data: UnassignTokensFromClassResult): number {
  const n = Number(data.tokens_refunded ?? data.tokensRefunded ?? NaN);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Assign API may already fulfill; PATCH may then return not found / not pending. */
export function isBenignFulfillEnrollmentError(err: unknown): boolean {
  const msg = formatAssignTokensApiError(err).toLowerCase();
  if (/not found|already fulfilled|not pending|no longer pending/i.test(msg)) return true;
  if (err instanceof ApiError) {
    const raw = err.data?.current_status ?? err.data?.currentStatus;
    const status = String(raw ?? '').trim().toLowerCase();
    if (status === 'fulfilled' || status === 'assigned') return true;
  }
  return false;
}
