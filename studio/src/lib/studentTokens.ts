export interface UserToken {
  id: string;
  remaining_tokens: number;
  total_tokens: number;
  expiry_date: string;
}

interface OrderTokenLike {
  id?: string | number;
  order_id?: string;
  payment_status?: string;
  token_count?: number;
  created_at?: string;
}

export function normalizeUserTokens(payload: unknown): UserToken[] {
  const p = payload as Record<string, unknown>;
  const candidates = [payload, p?.data, (p?.data as Record<string, unknown>)?.data, p?.tokens, (p?.data as Record<string, unknown>)?.tokens];
  const rows = candidates.find((x) => Array.isArray(x));
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r: Record<string, unknown> | null): UserToken | null => {
      if (!r) return null;
      return {
        id: String(r.id ?? r.user_token_id ?? ''),
        remaining_tokens: Number(r.remaining_tokens ?? r.balance ?? 0),
        total_tokens: Number(r.total_tokens ?? r.initial_tokens ?? r.remaining_tokens ?? 0),
        expiry_date: String(r.expiry_date ?? r.expires_at ?? ''),
      };
    })
    .filter((r): r is UserToken => Boolean(r && r.id));
}

export function tokensFromPaidOrders(payload: unknown): UserToken[] {
  const p = payload as Record<string, unknown>;
  const candidates = [payload, p?.data, (p?.data as Record<string, unknown>)?.data, p?.orders, (p?.data as Record<string, unknown>)?.orders];
  const rows = candidates.find((x) => Array.isArray(x));
  if (!Array.isArray(rows)) return [];
  const paid = (rows as OrderTokenLike[]).filter((o) => String(o?.payment_status ?? '').toLowerCase() === 'paid');
  const sum = paid.reduce((acc, o) => acc + Number(o?.token_count ?? 0), 0);
  if (sum <= 0) return [];
  const latest = paid
    .map((o) => String(o?.created_at ?? ''))
    .filter(Boolean)
    .sort()
    .pop();
  return [
    {
      id: 'orders-derived',
      remaining_tokens: sum,
      total_tokens: sum,
      expiry_date: latest || new Date().toISOString().slice(0, 10),
    },
  ];
}
