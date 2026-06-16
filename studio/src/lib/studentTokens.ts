import { api } from './api';
import { readWalletFromRecord, type WalletSnapshot } from './walletBalance';
import { formatDateTimeRange } from './utils';

export interface UserToken {
  id: string;
  remaining_tokens: number;
  total_tokens: number;
  expiry_date: string;
}

function parseLessonDetail(raw: unknown): TokenUsageLessonDetail | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const className = String(r.class_name ?? r.className ?? '').trim();
  if (!className) return null;
  const start = r.start_time != null ? String(r.start_time) : r.startTime != null ? String(r.startTime) : undefined;
  const end = r.end_time != null ? String(r.end_time) : r.endTime != null ? String(r.endTime) : undefined;
  return {
    class_name: className,
    class_id: r.class_id != null ? String(r.class_id) : r.classId != null ? String(r.classId) : undefined,
    program_code:
      r.program_code != null
        ? String(r.program_code)
        : r.programCode != null
          ? String(r.programCode)
          : undefined,
    start_time: start,
    end_time: end,
    date_time_formatted:
      r.date_time_formatted != null
        ? String(r.date_time_formatted)
        : r.dateTimeFormatted != null
          ? String(r.dateTimeFormatted)
          : undefined,
    location: r.location != null ? String(r.location) : undefined,
  };
}

function parseLessonDetails(raw: unknown): TokenUsageLessonDetail[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const lessons = raw.map(parseLessonDetail).filter((x): x is TokenUsageLessonDetail => x != null);
  return lessons.length > 0 ? lessons : undefined;
}

function toSecondKey(iso: string): string {
  return String(iso || '').slice(0, 19);
}

/** Group flat spend rows from the same assign action (same second + profile + token batch). */
export function groupTokenUsageSpendItems(items: TokenUsageItem[]): TokenUsageItem[] {
  const others: TokenUsageItem[] = [];
  const spends: TokenUsageItem[] = [];

  for (const item of items) {
    if (item.kind === 'spend' && item.change < 0) spends.push(item);
    else others.push(item);
  }

  const groups = new Map<string, TokenUsageItem[]>();
  for (const item of spends) {
    if (item.lessons && item.lessons.length > 1) {
      others.push(item);
      continue;
    }
    const key = `${item.profile_id || ''}|${toSecondKey(item.date)}|${item.user_token_id || 'none'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  for (const [, rows] of groups) {
    if (rows.length === 1) {
      others.push(rows[0]);
      continue;
    }
    const lessons = rows
      .flatMap((r) => r.lessons ?? [])
      .sort((a, b) => {
        const ta = Date.parse(a.start_time ?? '');
        const tb = Date.parse(b.start_time ?? '');
        return (Number.isFinite(ta) ? ta : 0) - (Number.isFinite(tb) ? tb : 0);
      });
    const totalChange = rows.reduce((sum, r) => sum + r.change, 0);
    const uniqueNames = [...new Set(rows.map((r) => r.class_name).filter(Boolean))];
    others.push({
      id: `batch-${rows.map((r) => r.id).join('-')}`,
      date: rows[0].date,
      class_name: uniqueNames.length === 1 ? uniqueNames[0] : rows[0].class_name,
      change: totalChange,
      kind: 'spend',
      profile_id: rows[0].profile_id,
      user_token_id: rows[0].user_token_id,
      lessons: lessons.length > 0 ? lessons : undefined,
    });
  }

  return others.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export type TokenUsageKind = 'purchase' | 'spend' | 'refund';

export type TokenUsageLessonDetail = {
  class_name: string;
  class_id?: string;
  program_code?: string;
  start_time?: string;
  end_time?: string;
  date_time_formatted?: string;
  location?: string;
};

/** One line on the token activity list (negative = spent, positive = purchase/refund). */
export interface TokenUsageItem {
  id: string;
  date: string;
  class_name: string;
  change: number;
  kind?: TokenUsageKind;
  profile_id?: string;
  user_token_id?: string;
  lessons?: TokenUsageLessonDetail[];
}

interface OrderTokenLike {
  id?: string | number;
  order_id?: string;
  payment_status?: string;
  token_count?: number;
  created_at?: string;
}

function unwrapApiRoot(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return {};
  const root = payload as Record<string, unknown>;
  const data = root.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return root;
}

/** Parse GET /student/tokens — prefer `wallet.remaining_tokens` over batch sums. */
export function parseStudentTokensResponse(payload: unknown): {
  tokens: UserToken[];
  wallet: WalletSnapshot | null;
} {
  const root = unwrapApiRoot(payload);
  const wallet = readWalletFromRecord(root);
  const batchSource = root.tokens ?? root.user_tokens ?? root.userTokens ?? payload;
  return {
    tokens: normalizeUserTokens(batchSource),
    wallet,
  };
}

export function resolveStudentRemainingBalance(
  tokens: UserToken[],
  wallet: WalletSnapshot | null | undefined,
): number {
  if (wallet != null && Number.isFinite(wallet.remaining_tokens)) {
    return wallet.remaining_tokens;
  }
  return getTotalRemainingTokens(tokens);
}

/** True when API failed or returned no wallet and no token batches. */
export function isStudentTokensUnavailable(
  tokens: UserToken[],
  wallet: WalletSnapshot | null | undefined,
  requestFailed: boolean,
): boolean {
  if (requestFailed) return true;
  if (wallet != null) return false;
  return tokens.length === 0;
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

/** Sum of non-expired remaining tokens. */
export function getTotalRemainingTokens(tokens: UserToken[]): number {
  const now = Date.now();
  return tokens.reduce((sum, tok) => {
    const exp = tok.expiry_date ? new Date(tok.expiry_date).getTime() : Number.POSITIVE_INFINITY;
    if (Number.isFinite(exp) && exp < now) return sum;
    const n = Number(tok.remaining_tokens);
    return sum + (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);
}

export function hasEnoughTokens(tokens: UserToken[], required: number): boolean {
  return getTotalRemainingTokens(tokens) >= required;
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

function extractArray(payload: unknown, keys: string[]): unknown[] {
  const p = payload as Record<string, unknown>;
  const candidates = [payload, p?.data, ...(keys.map((k) => (p?.data as Record<string, unknown>)?.[k])), ...keys.map((k) => p?.[k])];
  const rows = candidates.find((x) => Array.isArray(x));
  return Array.isArray(rows) ? rows : [];
}

function inferUsageKind(r: Record<string, unknown>, change: number): TokenUsageKind {
  const rawKind = String(r.kind ?? r.type ?? r.transaction_type ?? '').toLowerCase();
  if (rawKind.includes('refund')) return 'refund';
  if (rawKind.includes('purchase') || rawKind.includes('order')) return 'purchase';
  if (rawKind.includes('enroll') || rawKind.includes('spend') || rawKind.includes('deduct')) {
    return 'spend';
  }
  if (change > 0 && (r.tokens_refunded != null || r.refunded_at != null)) return 'refund';
  return change > 0 ? 'purchase' : 'spend';
}

export function normalizeTokenUsageList(payload: unknown): TokenUsageItem[] {
  const rows = extractArray(payload, ['items', 'transactions', 'usage', 'records', 'refunds']);
  if (rows.length === 0) return [];
  return rows
    .map((raw): TokenUsageItem | null => {
      if (!raw || typeof raw !== 'object') return null;
      const r = raw as Record<string, unknown>;
      const explicitRefund = Number(r.tokens_refunded ?? 0);
      const change =
        explicitRefund > 0
          ? explicitRefund
          : Number(r.change ?? r.amount ?? r.tokens_delta ?? r.tokens ?? 0);
      if (!Number.isFinite(change) || change === 0) return null;
      const date = String(
        r.date ??
          r.refunded_at ??
          r.created_at ??
          r.occurred_at ??
          r.transaction_at ??
          new Date().toISOString(),
      );
      const className = String(
        r.class_name ?? r.description ?? r.reason ?? r.remarks ?? r.package_name ?? r.title ?? '',
      ).trim();
      const id = String(r.id ?? `${date}-${change}-${className}`).trim();
      if (!id) return null;
      const kind = inferUsageKind(r, change);
      return {
        id,
        date,
        class_name: className || '—',
        change: kind === 'spend' ? -Math.abs(change) : Math.abs(change),
        kind,
        profile_id: r.profile_id != null ? String(r.profile_id) : undefined,
        user_token_id:
          r.user_token_id != null
            ? String(r.user_token_id)
            : r.userTokenId != null
              ? String(r.userTokenId)
              : undefined,
        lessons: parseLessonDetails(r.lessons),
      };
    })
    .filter((x): x is TokenUsageItem => x != null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function usageFromRefunds(payload: unknown, refundFallbackLabel: string): TokenUsageItem[] {
  const rows = extractArray(payload, ['refunds', 'records', 'items', 'data']);
  return rows
    .map((raw): TokenUsageItem | null => {
      if (!raw || typeof raw !== 'object') return null;
      const r = raw as Record<string, unknown>;
      const tokens = Number(r.tokens_refunded ?? r.tokens ?? r.change ?? 0);
      if (!Number.isFinite(tokens) || tokens <= 0) return null;
      const date = String(r.refunded_at ?? r.date ?? r.created_at ?? new Date().toISOString());
      const cls = String(r.class_name ?? '').trim();
      const remarks = String(r.remarks ?? r.reason ?? '').trim();
      let label = cls || refundFallbackLabel;
      if (remarks && !label.includes(remarks)) {
        label = cls ? `${cls} · ${remarks}` : remarks;
      }
      return {
        id: `ref-${r.id ?? date}`,
        date,
        class_name: label,
        change: tokens,
        kind: 'refund',
      };
    })
    .filter((x): x is TokenUsageItem => x != null);
}

function usageFromEnrollments(payload: unknown): TokenUsageItem[] {
  const rows = extractArray(payload, ['enrollments']);
  return rows
    .map((raw): TokenUsageItem | null => {
      if (!raw || typeof raw !== 'object') return null;
      const r = raw as Record<string, unknown>;
      const charged = Number(r.tokens_charged ?? 0);
      if (!Number.isFinite(charged) || charged <= 0) return null;
      const cls = (r.class as Record<string, unknown> | undefined) ?? {};
      const start = String(cls.start_time ?? r.class_start_time ?? '');
      const end = String(cls.end_time ?? r.class_end_time ?? start);
      const className = String(cls.name ?? r.class_name ?? '—');
      const date = String(
        r.created_at ?? cls.start_time ?? r.enrolled_at ?? new Date().toISOString(),
      );
      const lesson: TokenUsageLessonDetail = {
        class_name: className,
        class_id: cls.id != null ? String(cls.id) : r.class_id != null ? String(r.class_id) : undefined,
        program_code:
          cls.program_code != null
            ? String(cls.program_code)
            : cls.class_code != null
              ? String(cls.class_code)
              : undefined,
        start_time: start || undefined,
        end_time: end || undefined,
        location: cls.location != null ? String(cls.location) : undefined,
      };
      return {
        id: `enr-${r.id ?? date}`,
        date,
        class_name: className,
        change: -charged,
        kind: 'spend',
        profile_id: r.profile_id != null ? String(r.profile_id) : undefined,
        user_token_id: r.user_token_id != null ? String(r.user_token_id) : undefined,
        lessons: [lesson],
      };
    })
    .filter((x): x is TokenUsageItem => x != null);
}

function usageFromPaidOrders(payload: unknown, purchaseLabel: string): TokenUsageItem[] {
  const rows = extractArray(payload, ['orders']);
  return rows
    .map((raw): TokenUsageItem | null => {
      if (!raw || typeof raw !== 'object') return null;
      const r = raw as Record<string, unknown>;
      if (String(r.payment_status ?? '').toLowerCase() !== 'paid') return null;
      const count = Number(r.token_count ?? r.tokens ?? 0);
      if (!Number.isFinite(count) || count <= 0) return null;
      return {
        id: `ord-${r.id ?? r.order_id ?? count}`,
        date: String(r.created_at ?? r.paid_at ?? new Date().toISOString()),
        class_name: String(r.package_name ?? purchaseLabel),
        change: count,
        kind: 'purchase',
      };
    })
    .filter((x): x is TokenUsageItem => x != null);
}

function mergeUsageLists(...lists: TokenUsageItem[]): TokenUsageItem[] {
  const byId = new Map<string, TokenUsageItem>();
  for (const item of lists) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }
  return [...byId.values()].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

const TOKEN_USAGE_ENDPOINTS = [
  '/student/token-usage',
  '/student/token-transactions',
  '/user-token-transactions',
] as const;

const TOKEN_REFUND_ENDPOINTS = [
  '/student/token-refunds',
  '/student/refund-records',
  '/refunds/me',
] as const;

async function fetchRefundUsageHistory(refundFallbackLabel: string): Promise<TokenUsageItem[]> {
  for (const endpoint of TOKEN_REFUND_ENDPOINTS) {
    try {
      const res = await api.get(endpoint);
      const list = usageFromRefunds(res, refundFallbackLabel);
      if (list.length > 0) return list;
    } catch {
      // try next endpoint
    }
  }
  return [];
}

/** Display label for a token activity row. */
export function formatTokenUsageLabel(
  item: TokenUsageItem,
  t: (key: string, opts?: Record<string, string>) => string,
): string {
  if (item.kind === 'refund') {
    const base = item.class_name?.trim() || t('dashboard.tokenUsageRefundDefault');
    if (/退代幣|退款|refund/i.test(base)) return base;
    return `${t('dashboard.tokenUsageRefundLabel')} · ${base}`;
  }
  if (item.kind === 'purchase') {
    const base = item.class_name?.trim() || t('dashboard.tokenUsagePurchase');
    if (/購買|purchase|套票/i.test(base)) return base;
    return `${t('dashboard.tokenUsagePurchase')} · ${base}`;
  }
  return item.class_name?.trim() || '—';
}

export function formatTokenUsageLessonLine(
  lesson: TokenUsageLessonDetail,
  locale: string,
  t: (key: string, opts?: Record<string, string>) => string,
): string {
  const when =
    lesson.date_time_formatted ||
    (lesson.start_time
      ? formatDateTimeRange(lesson.start_time, lesson.end_time ?? lesson.start_time, locale)
      : '');
  const locationKey = lesson.location?.trim();
  const branch = locationKey ? t(`home.locations.${locationKey}`, { defaultValue: locationKey }) : '';
  const name = lesson.program_code
    ? `${lesson.class_name} (${lesson.program_code})`
    : lesson.class_name;
  const parts = [name];
  if (when) parts.push(when);
  if (branch) parts.push(branch);
  return parts.join(' · ');
}

/**
 * Load token usage + purchase + refund history (merged).
 */
export async function fetchTokenUsageHistory(options?: {
  profileId?: string;
  purchaseLabel?: string;
  refundLabel?: string;
  language?: string;
  limit?: number;
}): Promise<TokenUsageItem[]> {
  const limit = options?.limit ?? 50;
  const purchaseLabel = options?.purchaseLabel ?? 'Token package';
  const refundLabel = options?.refundLabel ?? 'Token refund';
  const query: Record<string, string> = {};
  if (options?.profileId) query.profileId = options.profileId;
  if (options?.language) query.language = options.language;

  let primary: TokenUsageItem[] = [];
  for (const endpoint of TOKEN_USAGE_ENDPOINTS) {
    try {
      const res = await api.get(endpoint, Object.keys(query).length ? query : undefined);
      const list = normalizeTokenUsageList(res);
      if (list.length > 0) {
        primary = list;
        break;
      }
    } catch {
      // try next endpoint
    }
  }

  if (primary.length === 0) {
    const [enrollRes, ordersRes] = await Promise.all([
      api.get('/class-enrollments/me').catch(() => ({ data: [] })),
      api.get('/orders/me').catch(() => ({ data: [] })),
    ]);
    primary = groupTokenUsageSpendItems(
      mergeUsageLists(...usageFromEnrollments(enrollRes), ...usageFromPaidOrders(ordersRes, purchaseLabel)),
    );
  }

  const refunds = await fetchRefundUsageHistory(refundLabel);
  const merged = mergeUsageLists(...primary, ...refunds);
  const result = primary.length === 0 ? groupTokenUsageSpendItems(merged) : merged;
  return filterUsageByProfile(result, options?.profileId).slice(0, limit);
}

function filterUsageByProfile(items: TokenUsageItem[], profileId?: string): TokenUsageItem[] {
  if (!profileId) return items;
  const scoped = items.filter((u) => !u.profile_id || u.profile_id === profileId);
  return scoped.length > 0 ? scoped : items;
}
