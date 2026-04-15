import { api } from './api';

export interface TokenPackageRow {
  id: number;
  name: string;
  description: string;
  token_count: number;
  price: number;
  validity_days: number;
}

function normalizeRow(raw: Record<string, unknown>): TokenPackageRow | null {
  const id = Number(raw.id);
  if (!Number.isFinite(id)) return null;
  return {
    id,
    name: String(raw.name ?? ''),
    description: String(raw.description ?? ''),
    token_count: Number(raw.token_count ?? 0),
    price: Number(raw.price ?? 0),
    validity_days: Number(raw.validity_days ?? 0),
  };
}

/** Loads active token packages from the API. */
export async function fetchTokenPackages(): Promise<TokenPackageRow[]> {
  const res = await api.get<TokenPackageRow[]>('/token-packages');
  const rawList = (res as { data?: unknown }).data;
  if (!res.success || !Array.isArray(rawList)) {
    throw new Error((res as { msg?: string }).msg || 'Failed to load packages');
  }
  const rows: TokenPackageRow[] = [];
  for (const item of rawList) {
    if (item && typeof item === 'object') {
      const row = normalizeRow(item as Record<string, unknown>);
      if (row) rows.push(row);
    }
  }
  return rows;
}
