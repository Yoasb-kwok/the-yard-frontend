/**
 * Admin token balance helpers — align with backend:
 * - Prefer profiles[].wallet_remaining_tokens or user.wallet (canonical)
 * - Fallback: sum valid remaining_tokens in user_tokens batches
 * - assigned = wallet.assigned_tokens or tokens_charged on enrollments
 */

import { findProfileWallet, readWalletFromRecord } from './walletBalance';

export type AdminUserTokenBalance = {
  /** Tokens still in wallet (can assign to new classes). */
  remaining: number;
  /** Tokens already charged to class enrollments. */
  assigned: number;
  /** remaining + assigned (display total). */
  purchased: number;
};

function tokenExpiryKey(row: Record<string, unknown>): string | null {
  const exp =
    typeof row.expiry_date === 'string'
      ? row.expiry_date.slice(0, 10)
      : typeof row.expires_at === 'string'
        ? row.expires_at.slice(0, 10)
        : null;
  return exp;
}

function readBatchRemaining(row: Record<string, unknown>): number {
  const direct = Number(row.remaining_tokens ?? row.balance ?? row.remainingTokens ?? NaN);
  if (Number.isFinite(direct) && direct >= 0) return direct;

  const total = Number(row.total_tokens ?? row.initial_tokens ?? row.purchased_tokens ?? 0);
  const used = Number(row.used_tokens ?? row.tokens_used ?? row.spent_tokens ?? 0);
  if (Number.isFinite(total) && total > 0) {
    const usedN = Number.isFinite(used) && used >= 0 ? used : 0;
    return Math.max(0, total - usedN);
  }
  return 0;
}

function readBatchTotal(row: Record<string, unknown>): number {
  const total = Number(row.total_tokens ?? row.initial_tokens ?? row.purchased_tokens ?? 0);
  if (Number.isFinite(total) && total > 0) return total;
  return readBatchRemaining(row);
}

/** Sum remaining_tokens for non-expired batches (wallet / 未分配池). */
export function sumValidRemainingUserTokens(raw: unknown, profileId?: string | null): number {
  if (!Array.isArray(raw)) return 0;
  const profileFilter = profileId?.trim();
  const today = new Date().toISOString().slice(0, 10);
  let sum = 0;
  for (const item of raw) {
    const row = item as Record<string, unknown>;
    if (profileFilter) {
      const rowProfile =
        typeof row.student_profile_id === 'string'
          ? row.student_profile_id
          : typeof row.profile_id === 'string'
            ? row.profile_id
            : typeof row.studentProfileId === 'string'
              ? row.studentProfileId
              : null;
      if (rowProfile && rowProfile !== profileFilter) continue;
    }
    const remaining = readBatchRemaining(row);
    if (remaining <= 0) continue;
    const exp = tokenExpiryKey(row);
    if (exp && exp < today) continue;
    sum += remaining;
  }
  return sum;
}

function sumBatchTotals(raw: unknown, profileId?: string | null): number {
  if (!Array.isArray(raw)) return 0;
  const profileFilter = profileId?.trim();
  const today = new Date().toISOString().slice(0, 10);
  let sum = 0;
  for (const item of raw) {
    const row = item as Record<string, unknown>;
    if (profileFilter) {
      const rowProfile =
        typeof row.student_profile_id === 'string'
          ? row.student_profile_id
          : typeof row.profile_id === 'string'
            ? row.profile_id
            : null;
      if (rowProfile && rowProfile !== profileFilter) continue;
    }
    const exp = tokenExpiryKey(row);
    if (exp && exp < today) continue;
    sum += readBatchTotal(row);
  }
  return sum;
}

export function readAssignedTokenCount(raw: Record<string, unknown>): number {
  const n = Number(raw.assigned_tokens ?? raw.assigned_token_count ?? raw.assignedTokens ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function sumEnrollmentTokensCharged(rows: unknown): number {
  if (!Array.isArray(rows)) return 0;
  let sum = 0;
  for (const item of rows) {
    const row = item as Record<string, unknown>;
    const charged = Number(row.tokens_charged ?? row.tokensCharged ?? 0);
    if (Number.isFinite(charged) && charged > 0) {
      sum += charged;
      continue;
    }
    // Rows without tokens_charged are not token-assigned enrollments (e.g. legacy / pending)
  }
  return sum;
}

/** True when this enrollment row represents tokens assigned to a class. */
export function enrollmentHasTokensAssigned(row: Record<string, unknown>): boolean {
  if (row.tokens_charged != null || row.tokensCharged != null) {
    const charged = Number(row.tokens_charged ?? row.tokensCharged ?? 0);
    return Number.isFinite(charged) && charged > 0;
  }
  const status = String(row.status ?? '').toLowerCase();
  if (status === 'cancelled' || status === 'rejected' || status === 'pending') return false;
  return status === 'enrolled' || status === 'attended' || status === 'absent' || status === 'sick_leave';
}

function balanceFromWallet(
  wallet: { remaining_tokens: number; assigned_tokens?: number; total_tokens?: number },
  enrollmentRows: unknown,
  profileId: string | null | undefined,
  userRow: Record<string, unknown>,
): AdminUserTokenBalance {
  const remaining = wallet.remaining_tokens;
  const enrollmentList = Array.isArray(enrollmentRows)
    ? profileId
      ? (enrollmentRows as Record<string, unknown>[]).filter((row) => {
          const rowProfile =
            typeof row.student_profile_id === 'string'
              ? row.student_profile_id
              : typeof row.profile_id === 'string'
                ? row.profile_id
                : null;
          return !rowProfile || rowProfile === profileId;
        })
      : enrollmentRows
    : enrollmentRows;
  const assignedFromEnrollments = sumEnrollmentTokensCharged(enrollmentList ?? []);
  let assigned =
    wallet.assigned_tokens != null && Number.isFinite(wallet.assigned_tokens)
      ? wallet.assigned_tokens
      : assignedFromEnrollments;
  if (assigned === 0) {
    const fromUser = readAssignedTokenCount(userRow);
    const purchasedHint = Math.max(
      wallet.total_tokens ?? 0,
      remaining + assignedFromEnrollments,
    );
    if (fromUser > 0 && fromUser <= purchasedHint - remaining) {
      assigned = fromUser;
    }
  }
  const purchased = Math.max(
    remaining + assigned,
    wallet.total_tokens ?? 0,
    remaining + assignedFromEnrollments,
  );
  return { remaining, assigned, purchased };
}

export function getAdminUserTokenBalance(
  userRow: Record<string, unknown>,
  enrollmentRows?: unknown,
  profileId?: string | null,
): AdminUserTokenBalance {
  const pid = profileId?.trim() || null;
  const profileWallet = pid ? findProfileWallet(userRow, pid) : null;
  const userWallet = pid ? null : readWalletFromRecord(userRow);
  const wallet = profileWallet ?? userWallet;
  if (wallet) {
    return balanceFromWallet(wallet, enrollmentRows, pid, userRow);
  }

  const remaining = sumValidRemainingUserTokens(userRow.user_tokens, profileId);
  const enrollmentList = Array.isArray(enrollmentRows)
    ? profileId
      ? (enrollmentRows as Record<string, unknown>[]).filter((row) => {
          const rowProfile =
            typeof row.student_profile_id === 'string'
              ? row.student_profile_id
              : typeof row.profile_id === 'string'
                ? row.profile_id
                : null;
          return !rowProfile || rowProfile === profileId;
        })
      : enrollmentRows
    : enrollmentRows;
  const assignedFromEnrollments = sumEnrollmentTokensCharged(enrollmentList ?? []);

  const batchTotal = sumBatchTotals(userRow.user_tokens, profileId);
  const totalFromUser = Number(userRow.total_tokens ?? userRow.totalTokens ?? 0);
  const purchasedHint = Math.max(batchTotal, totalFromUser, remaining + assignedFromEnrollments);

  let assigned = assignedFromEnrollments;
  if (assigned === 0) {
    const fromUser = readAssignedTokenCount(userRow);
    // Use user.assigned_tokens only when it fits wallet (not entire purchase mislabeled as assigned)
    if (fromUser > 0 && fromUser <= purchasedHint - remaining) {
      assigned = fromUser;
    } else if (batchTotal > remaining) {
      assigned = batchTotal - remaining;
    }
  }

  const purchased = Math.max(remaining + assigned, purchasedHint);
  return {
    remaining,
    assigned,
    purchased,
  };
}
