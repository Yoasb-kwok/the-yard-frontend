/**
 * Admin token balance helpers — align with backend:
 * - unassigned = sum of valid remaining_tokens in user_tokens (wallet)
 * - assigned = tokens_charged on enrolled classes (from API or enrollments)
 */

export type AdminUserTokenBalance = {
  /** Tokens still in wallet (can assign to new classes). */
  remaining: number;
  /** Tokens already charged to class enrollments. */
  assigned: number;
  /** remaining + assigned (approximate purchased, for display). */
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

/** Sum remaining_tokens for non-expired batches (matches backend getPurchasedTokenBalance). */
export function sumValidRemainingUserTokens(raw: unknown): number {
  if (!Array.isArray(raw)) return 0;
  const today = new Date().toISOString().slice(0, 10);
  let sum = 0;
  for (const item of raw) {
    const row = item as Record<string, unknown>;
    const remaining = Number(row.remaining_tokens ?? row.balance ?? row.remainingTokens ?? 0);
    if (!Number.isFinite(remaining) || remaining <= 0) continue;
    const exp = tokenExpiryKey(row);
    if (exp && exp < today) continue;
    sum += remaining;
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
    // Legacy rows without tokens_charged: count as 1 seat
    sum += 1;
  }
  return sum;
}

export function getAdminUserTokenBalance(
  userRow: Record<string, unknown>,
  enrollmentRows?: unknown,
): AdminUserTokenBalance {
  const remaining = sumValidRemainingUserTokens(userRow.user_tokens);
  const assignedFromUser = readAssignedTokenCount(userRow);
  const assignedFromEnrollments = sumEnrollmentTokensCharged(enrollmentRows ?? []);
  const assigned = Math.max(assignedFromUser, assignedFromEnrollments);
  return {
    remaining,
    assigned,
    purchased: remaining + assigned,
  };
}
