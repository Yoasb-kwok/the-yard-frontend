import { api, ApiError } from './api';
import type { EnrollmentConfirmedEmailExtras } from './enrollmentConfirmedEmailPayload';

export interface AssignTokensToClassInput {
  userId: string;
  classId: string;
  quantity: number;
  enrollmentRequestId?: string;
  /** Included so confirmation email lists every lesson date and time range. */
  confirmationEmail?: EnrollmentConfirmedEmailExtras;
}

export interface AssignTokensToClassResult {
  enrollments?: unknown[];
}

export async function postAdminAssignTokensToClass(
  input: AssignTokensToClassInput,
): Promise<AssignTokensToClassResult> {
  const body: Record<string, unknown> = {
    user_id: input.userId,
    userId: input.userId,
    class_id: input.classId,
    classId: input.classId,
    quantity: input.quantity,
  };
  if (input.enrollmentRequestId) {
    body.enrollment_request_id = input.enrollmentRequestId;
    body.enrollmentRequestId = input.enrollmentRequestId;
  }
  if (input.confirmationEmail) {
    Object.assign(body, input.confirmationEmail);
  }

  const res = await api.post<AssignTokensToClassResult>('/admin/token-assignment/assign-to-class', body);
  if (res.success === false) {
    throw new ApiError(400, res.msg || 'Request failed');
  }
  return res.data ?? {};
}
