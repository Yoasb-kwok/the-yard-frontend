/**
 * Canonical wallet fields from backend (admin + student APIs).
 * Prefer these over summing user_tokens batches client-side.
 */

import { readProfilesArray } from './adminUserFields';

export type WalletSnapshot = {
  remaining_tokens: number;
  assigned_tokens?: number;
  total_tokens?: number;
};

function readNonNegative(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function readWalletObject(block: Record<string, unknown>): WalletSnapshot | null {
  const remaining = readNonNegative(
    block.remaining_tokens ??
      block.remainingTokens ??
      block.unassigned_tokens ??
      block.unassignedTokens,
  );
  if (remaining == null) return null;
  const assigned = readNonNegative(block.assigned_tokens ?? block.assignedTokens);
  const total = readNonNegative(block.total_tokens ?? block.totalTokens);
  return {
    remaining_tokens: remaining,
    assigned_tokens: assigned ?? undefined,
    total_tokens: total ?? undefined,
  };
}

/** Read `wallet` object or flat `wallet_*` fields on a user/profile row. */
export function readWalletFromRecord(raw: Record<string, unknown>): WalletSnapshot | null {
  const nested = raw.wallet ?? raw.Wallet;
  if (nested && typeof nested === 'object') {
    const fromNested = readWalletObject(nested as Record<string, unknown>);
    if (fromNested) return fromNested;
  }

  const remaining = readNonNegative(
    raw.wallet_remaining_tokens ??
      raw.walletRemainingTokens ??
      raw.unassigned_tokens ??
      raw.unassignedTokens,
  );
  if (remaining == null) return null;

  const assigned = readNonNegative(raw.wallet_assigned_tokens ?? raw.walletAssignedTokens ?? raw.assigned_tokens ?? raw.assignedTokens);
  const total = readNonNegative(raw.wallet_total_tokens ?? raw.walletTotalTokens ?? raw.total_tokens ?? raw.totalTokens);

  return {
    remaining_tokens: remaining,
    assigned_tokens: assigned ?? undefined,
    total_tokens: total ?? undefined,
  };
}

export function findProfileWallet(
  userRow: Record<string, unknown>,
  profileId: string,
): WalletSnapshot | null {
  const pid = profileId.trim();
  if (!pid) return null;
  for (const profile of readProfilesArray(userRow)) {
    const row = profile as Record<string, unknown>;
    if (String(row.id ?? '').trim() !== pid) continue;
    return readWalletFromRecord(row);
  }
  return null;
}

export function resolveWalletRemaining(
  wallet: WalletSnapshot | null | undefined,
  batchSum: number,
): number {
  if (wallet != null && Number.isFinite(wallet.remaining_tokens)) {
    return wallet.remaining_tokens;
  }
  return batchSum;
}
