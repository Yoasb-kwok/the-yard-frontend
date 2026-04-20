import { api } from './api';

export interface TokenPackageRow {
  id: number;
  name: string;
  description: string;
  token_count: number;
  price: number;
  validity_days: number;
  is_active?: boolean;
}

export interface TokenPackageUpsertPayload {
  name: string;
  description: string;
  token_count: number;
  price: number;
  validity_days: number;
  is_active?: boolean;
}

function normalizeRow(raw: Record<string, unknown>): TokenPackageRow | null {
  const id = Number(raw.id);
  if (!Number.isFinite(id)) return null;
  const isActiveRaw = raw.is_active;
  const is_active =
    typeof isActiveRaw === 'boolean'
      ? isActiveRaw
      : isActiveRaw === 1 || isActiveRaw === '1' || isActiveRaw === 'true'
      ? true
      : isActiveRaw === 0 || isActiveRaw === '0' || isActiveRaw === 'false'
      ? false
      : undefined;
  return {
    id,
    name: String(raw.name ?? ''),
    description: String(raw.description ?? ''),
    token_count: Number(raw.token_count ?? 0),
    price: Number(raw.price ?? 0),
    validity_days: Number(raw.validity_days ?? 0),
    is_active,
  };
}

function extractRows(data: unknown): TokenPackageRow[] {
  if (!Array.isArray(data)) return [];
  const rows: TokenPackageRow[] = [];
  for (const item of data) {
    if (item && typeof item === 'object') {
      const row = normalizeRow(item as Record<string, unknown>);
      if (row) rows.push(row);
    }
  }
  return rows;
}

/** Loads active token packages from the public API (is_active = 1 only). */
export async function fetchTokenPackages(): Promise<TokenPackageRow[]> {
  const res = await api.get<TokenPackageRow[]>('/token-packages');
  if (!res.success) {
    throw new Error((res as { msg?: string }).msg || 'Failed to load packages');
  }
  return extractRows((res as { data?: unknown }).data);
}

/** Admin: loads all token packages (active + inactive) for CMS management. */
export async function fetchAdminTokenPackages(): Promise<TokenPackageRow[]> {
  const res = await api.get<TokenPackageRow[]>('/admin/token-packages');
  if (!res.success) {
    throw new Error((res as { msg?: string }).msg || 'Failed to load packages');
  }
  return extractRows((res as { data?: unknown }).data);
}

/** Admin: create a new token package. */
export async function createAdminTokenPackage(
  payload: TokenPackageUpsertPayload
): Promise<TokenPackageRow | null> {
  const res = await api.post<TokenPackageRow>('/admin/token-packages', payload);
  if (!res.success) {
    throw new Error((res as { msg?: string }).msg || 'Failed to create package');
  }
  const data = (res as { data?: unknown }).data;
  if (data && typeof data === 'object') {
    return normalizeRow(data as Record<string, unknown>);
  }
  return null;
}

/** Admin: update an existing token package. */
export async function updateAdminTokenPackage(
  id: number,
  payload: Partial<TokenPackageUpsertPayload>
): Promise<TokenPackageRow | null> {
  const res = await api.patch<TokenPackageRow>(`/admin/token-packages/${id}`, payload);
  if (!res.success) {
    throw new Error((res as { msg?: string }).msg || 'Failed to update package');
  }
  const data = (res as { data?: unknown }).data;
  if (data && typeof data === 'object') {
    return normalizeRow(data as Record<string, unknown>);
  }
  return null;
}

/** Admin: delete a token package. */
export async function deleteAdminTokenPackage(id: number): Promise<void> {
  const res = await api.delete(`/admin/token-packages/${id}`);
  if (!res.success) {
    throw new Error((res as { msg?: string }).msg || 'Failed to delete package');
  }
}
