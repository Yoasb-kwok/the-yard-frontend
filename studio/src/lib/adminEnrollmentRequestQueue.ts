import { api } from './api';
import {
  normalizeEnrollmentRequestCounts,
  type EnrollmentScope,
} from './classEnrollmentTokens';
import { getAdminUserTokenBalance } from './adminUserTokens';
import { parseLessonClassIds } from './courseLessonEnrollment';
import { readProfilesArray } from './adminUserFields';
import { normalizeClassId } from './adminClassEnrollments';

export type EnrollmentRequestKind = 'enrollment_request' | 'token_ready';

export type EnrollmentRequest = {
  id: string;
  kind: EnrollmentRequestKind;
  userId: string;
  studentProfileId: string | null;
  studentName: string;
  userMobile: string | null;
  classId: string;
  className: string;
  classCode?: string;
  lessonCount: number;
  tokensRequired: number;
  enrollmentScope: EnrollmentScope;
  createdAt: string;
  unassignedTokens: number | null;
  assignedTokens: number | null;
  totalTokens: number | null;
  status: string;
  tokensChargedForRequest: number;
  alreadyEnrolled: boolean;
  lessonClassIds: string[];
};

export function isTokenReadyRow(request: EnrollmentRequest): boolean {
  return request.kind === 'token_ready';
}

export function isClassPendingRow(request: EnrollmentRequest): boolean {
  return isTokenReadyRow(request) && !request.classId;
}

export function parseEnrollmentRequestId(row: Record<string, unknown>): string {
  for (const key of ['id', 'request_id', 'enrollment_request_id', 'enrollmentRequestId'] as const) {
    const value = row[key];
    if (value == null || value === '') continue;
    const id = String(value).trim();
    if (id && id !== '0' && id !== 'undefined') return id;
  }
  return '';
}

export function normaliseRequestStatus(raw: unknown): string {
  const status = String(raw ?? 'pending').trim().toLowerCase();
  return status || 'pending';
}

function isPendingRequestStatus(status: string): boolean {
  return (
    status === 'pending' ||
    status === 'submitted' ||
    status === 'awaiting_tokens' ||
    status === 'awaiting_assignment' ||
    status === 'pending_assignment' ||
    status === 'needs_tokens'
  );
}

function isTerminalRequestStatus(status: string): boolean {
  return status === 'fulfilled' || status === 'rejected' || status === 'cancelled' || status === 'assigned';
}

function isRejectedOrCancelledRequest(request: EnrollmentRequest): boolean {
  const status = normaliseRequestStatus(request.status);
  return status === 'rejected' || status === 'cancelled';
}

export function isCompletedTokenAssignment(request: EnrollmentRequest): boolean {
  if (isTokenReadyRow(request)) return false;
  if (!request.id || isRejectedOrCancelledRequest(request)) return false;
  const status = normaliseRequestStatus(request.status);
  if (status === 'fulfilled' || status === 'assigned') return true;
  if (request.tokensChargedForRequest > 0) return true;
  return false;
}

/** Still needs admin token assignment (matches 未完成代幣分配 tab). */
export function isIncompleteTokenAssignment(request: EnrollmentRequest): boolean {
  if (isTokenReadyRow(request)) {
    return (request.unassignedTokens ?? 0) > 0;
  }
  if (!request.id || isRejectedOrCancelledRequest(request)) return false;
  if (isCompletedTokenAssignment(request)) return false;
  const status = normaliseRequestStatus(request.status);
  if (isTerminalRequestStatus(status)) return false;
  if (isPendingRequestStatus(status)) return true;
  if (request.alreadyEnrolled && request.tokensChargedForRequest === 0) return true;
  if (request.tokensRequired > 0) return true;
  return false;
}

export function isAwaitingTokenAssignment(request: EnrollmentRequest): boolean {
  return request.alreadyEnrolled && request.tokensChargedForRequest === 0;
}

export function hasSufficientUnassigned(request: EnrollmentRequest): boolean {
  if (request.tokensRequired <= 0) {
    return (request.unassignedTokens ?? 0) > 0;
  }
  return request.unassignedTokens != null && request.unassignedTokens >= request.tokensRequired;
}

export function isReadyToAssignRequest(request: EnrollmentRequest): boolean {
  return isIncompleteTokenAssignment(request) && hasSufficientUnassigned(request);
}

export function isWaitingForTokensRequest(request: EnrollmentRequest): boolean {
  if (isTokenReadyRow(request)) return false;
  return isIncompleteTokenAssignment(request) && !hasSufficientUnassigned(request);
}

export function canRejectRequest(request: EnrollmentRequest): boolean {
  if (isTokenReadyRow(request)) return false;
  return Boolean(request.id) && isPendingRequestStatus(normaliseRequestStatus(request.status));
}

function parseOptionalTokenCount(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

type UserTokenSnapshot = { total: number; assigned: number; unassigned: number };

function getUserTokenSnapshot(raw: Record<string, unknown>): UserTokenSnapshot {
  const balance = getAdminUserTokenBalance(raw);
  return {
    total: balance.purchased,
    assigned: balance.assigned,
    unassigned: balance.remaining,
  };
}

function normaliseRequests(
  data: unknown,
  userTokensById: Map<string, UserTokenSnapshot>,
  profileTokensById: Map<string, UserTokenSnapshot>,
): EnrollmentRequest[] {
  if (!Array.isArray(data)) return [];
  return data.map((row: Record<string, unknown>) => {
    const userId = String(row.user_id ?? row.userId ?? '');
    const snapshot = userId ? userTokensById.get(userId) : undefined;
    const fromApiUnassigned =
      parseOptionalTokenCount(row.unassigned_tokens ?? row.unassignedTokens ?? row.available_tokens ?? row.availableTokens) ??
      parseOptionalTokenCount(row.user_unassigned_tokens ?? row.userUnassignedTokens);
    const fromApiAssigned =
      parseOptionalTokenCount(row.assigned_tokens ?? row.assignedTokens ?? row.user_assigned_tokens ?? row.userAssignedTokens);
    const fromApiTotal = parseOptionalTokenCount(row.total_tokens ?? row.totalTokens ?? row.user_total_tokens ?? row.userTotalTokens);

    const studentProfileId =
      row.student_profile_id != null
        ? String(row.student_profile_id).trim()
        : row.studentProfileId != null
          ? String(row.studentProfileId).trim()
          : row.profile_id != null
            ? String(row.profile_id).trim()
            : '';

    const profileSnapshot = studentProfileId ? profileTokensById.get(studentProfileId) : undefined;

    const unassignedTokens =
      fromApiUnassigned ?? profileSnapshot?.unassigned ?? snapshot?.unassigned ?? null;
    const assignedTokens = fromApiAssigned ?? profileSnapshot?.assigned ?? snapshot?.assigned ?? null;
    const totalTokens = fromApiTotal ?? profileSnapshot?.total ?? snapshot?.total ?? null;

    const status = normaliseRequestStatus(row.status);
    const tokensChargedForRequest = Number(
      row.tokens_charged ??
        row.tokensCharged ??
        row.tokens_assigned ??
        row.tokensAssigned ??
        row.request_tokens_charged ??
        0,
    );
    const alreadyEnrolled =
      row.already_enrolled === true ||
      row.already_enrolled === 1 ||
      row.alreadyEnrolled === true ||
      row.alreadyEnrolled === 1;

    const counts = normalizeEnrollmentRequestCounts(row);

    return {
      id: parseEnrollmentRequestId(row),
      kind: 'enrollment_request' as const,
      userId,
      studentProfileId: studentProfileId || null,
      studentName: String(row.student_name ?? row.studentName ?? row.user_name ?? row.userName ?? ''),
      userMobile: row.user_mobile != null ? String(row.user_mobile) : row.mobile != null ? String(row.mobile) : null,
      classId: String(row.class_id ?? row.classId ?? ''),
      className: String(row.class_name ?? row.className ?? ''),
      classCode: row.class_code != null ? String(row.class_code) : row.program_code != null ? String(row.program_code) : undefined,
      lessonCount: counts.lessonCount,
      tokensRequired: counts.tokensRequired,
      enrollmentScope: counts.enrollmentScope,
      createdAt: String(row.created_at ?? row.createdAt ?? ''),
      unassignedTokens,
      assignedTokens,
      totalTokens,
      status,
      tokensChargedForRequest: Number.isFinite(tokensChargedForRequest) && tokensChargedForRequest > 0 ? tokensChargedForRequest : 0,
      alreadyEnrolled,
      lessonClassIds: parseLessonClassIds(
        row.lesson_class_ids ?? row.lessonClassIds ?? row.lesson_ids ?? row.lessonIds,
      ),
    };
  });
}

function queueStudentKey(userId: string, profileId: string | null | undefined): string {
  return `${userId}:${profileId?.trim() || ''}`;
}

function buildTokenReadyRows(
  users: Record<string, unknown>[],
  existingRequests: EnrollmentRequest[],
): EnrollmentRequest[] {
  const covered = new Set(
    existingRequests
      .filter((r) => r.kind === 'enrollment_request' && isIncompleteTokenAssignment(r))
      .map((r) => queueStudentKey(r.userId, r.studentProfileId)),
  );
  const rows: EnrollmentRequest[] = [];

  for (const user of users) {
    const userId = String(user.id ?? '').trim();
    if (!userId) continue;
    const mobile =
      user.mobile != null
        ? String(user.mobile)
        : user.contact_number != null
          ? String(user.contact_number)
          : null;
    const profiles = readProfilesArray(user);

    const addRow = (profileId: string | null, studentName: string) => {
      const key = queueStudentKey(userId, profileId);
      if (covered.has(key)) return;
      const balance = getAdminUserTokenBalance(user, undefined, profileId ?? undefined);
      if (balance.remaining <= 0) return;
      rows.push({
        id: `token-ready-${userId}-${profileId ?? 'account'}`,
        kind: 'token_ready',
        userId,
        studentProfileId: profileId,
        studentName,
        userMobile: mobile,
        classId: '',
        className: '',
        lessonCount: 0,
        tokensRequired: 0,
        enrollmentScope: 'single_lesson',
        createdAt: '',
        unassignedTokens: balance.remaining,
        assignedTokens: balance.assigned,
        totalTokens: balance.purchased,
        status: 'pending',
        tokensChargedForRequest: 0,
        alreadyEnrolled: false,
        lessonClassIds: [],
      });
    };

    if (profiles.length === 0) {
      const name = String(user.full_name ?? user.name ?? '').trim();
      if (name) addRow(null, name);
      continue;
    }

    for (const profile of profiles) {
      if (!profile || typeof profile !== 'object') continue;
      const p = profile as Record<string, unknown>;
      const profileId = normalizeClassId(p.id);
      const studentName = String(p.full_name ?? p.name ?? user.full_name ?? user.name ?? '').trim();
      if (!studentName) continue;
      addRow(profileId || null, studentName);
    }
  }

  return rows;
}

export function extractEnrollmentRequestRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as Record<string, unknown>;
  const candidates = [
    root.data,
    root.requests,
    root.enrollment_requests,
    root.enrollmentRequests,
    root.pending_enrollment_requests,
    root.pendingEnrollmentRequests,
    root.items,
    root.results,
    root.rows,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  const nested = root.data;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const inner = nested as Record<string, unknown>;
    for (const key of ['data', 'requests', 'enrollment_requests', 'enrollmentRequests', 'items'] as const) {
      if (Array.isArray(inner[key])) return inner[key] as unknown[];
    }
  }
  return [];
}

export function mergeEnrollmentRequestRows(...payloads: unknown[]): unknown[] {
  const byId = new Map<string, unknown>();
  for (const payload of payloads) {
    for (const row of extractEnrollmentRequestRows(payload)) {
      const id = parseEnrollmentRequestId(row as Record<string, unknown>);
      if (id) byId.set(id, row);
    }
  }
  return [...byId.values()];
}

export function countIncompleteEnrollmentRequests(requests: EnrollmentRequest[]): number {
  return requests.filter(isIncompleteTokenAssignment).length;
}

/** Same data source as PendingEnrollmentRequestsPage — used for sidebar badge. */
export async function loadAdminEnrollmentRequestQueue(): Promise<EnrollmentRequest[]> {
  const [pendingRes, fulfilledRes, usersRes] = await Promise.all([
    api.get<unknown>('/admin/enrollment-requests', { status: 'pending' }),
    api
      .get<unknown>('/admin/enrollment-requests', { status: 'fulfilled' })
      .catch(() => ({ success: true, data: [] as unknown[] })),
    api.get<Record<string, unknown>[]>('/admin/users').catch(() => ({ success: false, data: [] as Record<string, unknown>[] })),
  ]);

  const userTokensById = new Map<string, UserTokenSnapshot>();
  const profileTokensById = new Map<string, UserTokenSnapshot>();
  if (usersRes.success && Array.isArray(usersRes.data)) {
    for (const user of usersRes.data) {
      const id = String(user.id ?? '');
      if (!id) continue;
      userTokensById.set(id, getUserTokenSnapshot(user));
      for (const profile of readProfilesArray(user)) {
        const pid = normalizeClassId((profile as Record<string, unknown>).id);
        if (!pid) continue;
        const balance = getAdminUserTokenBalance(user, undefined, pid);
        profileTokensById.set(pid, {
          total: balance.purchased,
          assigned: balance.assigned,
          unassigned: balance.remaining,
        });
      }
    }
  }

  const rows = mergeEnrollmentRequestRows(
    pendingRes.data ?? pendingRes,
    fulfilledRes.data ?? fulfilledRes,
  );
  const apiRequests = normaliseRequests(rows, userTokensById, profileTokensById);
  const usersList = usersRes.success && Array.isArray(usersRes.data) ? usersRes.data : [];
  const tokenReadyRows = buildTokenReadyRows(usersList, apiRequests);
  return [...apiRequests, ...tokenReadyRows];
}
