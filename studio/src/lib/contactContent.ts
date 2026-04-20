/**
 * Contact page content — dedicated API (`/api/contact` + `/api/admin/contact/*`).
 *
 * Data model:
 *   - Settings are singleton (`contact_page`): title, intro.
 *   - Branches are multi-row (`contact_branches`): CRUD + reorder.
 *
 * Branch ids:
 *   - number  → persisted on backend
 *   - string  → new branch created client-side (not yet POSTed).
 *              saveContactContent() will POST these and replace the id.
 */

import { api } from './api';

export interface ContactBranch {
  /** number = persisted; string = new/unsaved. */
  id: number | string;
  /** Branch display name. */
  name: string;
  /** Multiline address. */
  address: string;
  /** Multiline opening hours. */
  hours: string;
  /** Branch image URL (absolute or `/uploads/...`). Null when none. */
  image_url: string | null;
  /** Google Maps embed/share URL or plain address. */
  map_query: string;
  /** Whether the branch is shown on the public page. */
  is_active: boolean;
}

export interface ContactContent {
  title: string;
  intro: string;
  branches: ContactBranch[];
}

function newClientId(): string {
  return `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyBranch(): ContactBranch {
  return {
    id: newClientId(),
    name: '',
    address: '',
    hours: '',
    image_url: null,
    map_query: '',
    is_active: true,
  };
}

export function createDefaultContactContent(): ContactContent {
  return {
    title: '',
    intro: '',
    branches: [],
  };
}

/* -------------------------------------------------------------------------- */
/* Normalization                                                              */
/* -------------------------------------------------------------------------- */

function toBool(v: unknown, fallback = true): boolean {
  if (typeof v === 'boolean') return v;
  if (v === 1 || v === '1' || v === 'true') return true;
  if (v === 0 || v === '0' || v === 'false') return false;
  return fallback;
}

function normalizeBranch(raw: unknown): ContactBranch | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const idRaw = o.id;
  const id =
    typeof idRaw === 'number'
      ? idRaw
      : typeof idRaw === 'string' && idRaw.trim() !== ''
        ? /^\d+$/.test(idRaw)
          ? Number(idRaw)
          : idRaw
        : newClientId();
  return {
    id,
    name: typeof o.name === 'string' ? o.name : '',
    address: typeof o.address === 'string' ? o.address : '',
    hours: typeof o.hours === 'string' ? o.hours : '',
    image_url:
      typeof o.image_url === 'string' && o.image_url.trim() !== ''
        ? o.image_url.trim()
        : null,
    map_query: typeof o.map_query === 'string' ? o.map_query : '',
    is_active: toBool(o.is_active, true),
  };
}

function normalizeSettings(raw: unknown): { title: string; intro: string } {
  if (!raw || typeof raw !== 'object') return { title: '', intro: '' };
  const o = raw as Record<string, unknown>;
  return {
    title: typeof o.title === 'string' ? o.title : '',
    intro: typeof o.intro === 'string' ? o.intro : '',
  };
}

/* -------------------------------------------------------------------------- */
/* Public loader                                                              */
/* -------------------------------------------------------------------------- */

/** Load the public contact page content (used by `/contact`). */
export async function loadPublicContact(): Promise<ContactContent> {
  try {
    const res = await api.get<{
      title?: string;
      intro?: string;
      branches?: unknown[];
    }>('/contact');
    if (res.success && res.data) {
      const branchesRaw = Array.isArray(res.data.branches) ? res.data.branches : [];
      const branches: ContactBranch[] = [];
      for (const b of branchesRaw) {
        const n = normalizeBranch(b);
        if (n) branches.push(n);
      }
      return {
        title: typeof res.data.title === 'string' ? res.data.title : '',
        intro: typeof res.data.intro === 'string' ? res.data.intro : '',
        branches,
      };
    }
  } catch (err) {
    console.warn('GET /api/contact failed', err);
  }
  return createDefaultContactContent();
}

/** Back-compat alias: `loadContactContent()` → public view. */
export const loadContactContent = loadPublicContact;

/* -------------------------------------------------------------------------- */
/* Admin loader                                                               */
/* -------------------------------------------------------------------------- */

/** Load admin view (settings + ALL branches incl. is_active=0). */
export async function loadAdminContact(): Promise<ContactContent> {
  const [settingsRes, branchesRes] = await Promise.all([
    api.get('/admin/contact/settings'),
    api.get<unknown[]>('/admin/contact/branches'),
  ]);

  const settings = settingsRes.success ? normalizeSettings(settingsRes.data) : { title: '', intro: '' };
  const branches: ContactBranch[] = [];
  if (branchesRes.success && Array.isArray(branchesRes.data)) {
    for (const b of branchesRes.data) {
      const n = normalizeBranch(b);
      if (n) branches.push(n);
    }
  }
  return { ...settings, branches };
}

/* -------------------------------------------------------------------------- */
/* Admin save (diff-and-sync)                                                 */
/* -------------------------------------------------------------------------- */

function branchPayload(b: ContactBranch): Record<string, unknown> {
  return {
    name: b.name.trim(),
    address: b.address.trim(),
    hours: b.hours.trim(),
    image_url: b.image_url && b.image_url.trim() !== '' ? b.image_url.trim() : null,
    map_query: b.map_query.trim(),
    is_active: b.is_active,
  };
}

/**
 * Extract the numeric row id from a POST/PATCH response.
 *
 * Accepts any of the shapes backends tend to return:
 *   { data: { id: 2 } }             ← our spec
 *   { data: { id: "2" } }           ← MySQL drivers that stringify BIGINT
 *   { id: 2 }                       ← shape without envelope (legacy)
 *   { data: { branch: { id: 2 } } } ← nested wrapper
 *   { data: { insertId: 2 } }       ← raw mysql2 result
 */
function extractId(res: { data?: unknown } & Record<string, unknown>): number | null {
  const candidates: unknown[] = [];
  const data = res.data as Record<string, unknown> | undefined;
  if (data) {
    candidates.push(data.id, data.insertId);
    for (const key of ['branch', 'item', 'row']) {
      const nested = data[key];
      if (nested && typeof nested === 'object') {
        candidates.push((nested as Record<string, unknown>).id);
      }
    }
  }
  candidates.push(res.id, (res as Record<string, unknown>).insertId);
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c)) return c;
    if (typeof c === 'string' && /^\d+$/.test(c)) return Number(c);
  }
  return null;
}

/**
 * Persist the full content by diff-syncing against the server.
 *
 * Steps (in order, so a failure partway through leaves a consistent state):
 *   1. PATCH `/admin/contact/settings` (title, intro)
 *   2. Fetch current server branches
 *   3. DELETE any server branch that was removed locally
 *   4. POST new (string-id) branches, PATCH existing (number-id) branches
 *   5. POST `/admin/contact/branches/reorder` with the final order
 *   6. Re-fetch everything and return the authoritative state.
 */
export async function saveAdminContact(current: ContactContent): Promise<ContactContent> {
  // 1. Settings
  const settingsRes = await api.patch('/admin/contact/settings', {
    title: current.title.trim(),
    intro: current.intro.trim(),
  });
  if (!settingsRes.success) {
    throw new Error(settingsRes.msg || 'Failed to save contact settings');
  }

  // 2. Current server branches
  const serverRes = await api.get<unknown[]>('/admin/contact/branches');
  if (!serverRes.success || !Array.isArray(serverRes.data)) {
    throw new Error('Failed to load current branches');
  }
  const serverBranches: ContactBranch[] = [];
  for (const b of serverRes.data) {
    const n = normalizeBranch(b);
    if (n) serverBranches.push(n);
  }

  // 3. Delete removed
  const keptServerIds = new Set<number>(
    current.branches
      .filter((b) => typeof b.id === 'number')
      .map((b) => b.id as number)
  );
  for (const s of serverBranches) {
    if (typeof s.id === 'number' && !keptServerIds.has(s.id)) {
      const del = await api.delete(`/admin/contact/branches/${s.id}`);
      if (!del.success) {
        throw new Error(del.msg || `Failed to delete branch ${s.id}`);
      }
    }
  }

  // 4. Upsert
  const finalOrder: number[] = [];
  for (const b of current.branches) {
    if (typeof b.id === 'number') {
      const patchRes = await api.patch(
        `/admin/contact/branches/${b.id}`,
        branchPayload(b)
      );
      if (!patchRes.success) {
        throw new Error(patchRes.msg || `Failed to update branch ${b.id}`);
      }
      finalOrder.push(b.id);
    } else {
      const createRes = await api.post<Record<string, unknown>>(
        '/admin/contact/branches',
        branchPayload(b)
      );
      const newId = extractId(createRes);
      if (newId === null) {
        console.error('Unexpected create-branch response:', createRes);
        throw new Error(
          createRes.msg ||
            `Branch created but server did not return a numeric id. Response: ${JSON.stringify(createRes).slice(0, 200)}`
        );
      }
      finalOrder.push(newId);
    }
  }

  // 5. Reorder
  if (finalOrder.length > 1) {
    const reorderRes = await api.post('/admin/contact/branches/reorder', {
      order: finalOrder.map((id, index) => ({ id, display_order: index })),
    });
    if (!reorderRes.success) {
      // Non-fatal: display order desync is recoverable on next save.
      console.warn('Reorder failed', reorderRes.msg);
    }
  }

  // 6. Return fresh authoritative state
  return loadAdminContact();
}

/** Back-compat alias. */
export const saveContactContent = saveAdminContact;

/* -------------------------------------------------------------------------- */
/* Google Map embed helpers                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Convert a user-provided map reference (embed URL / share URL / plain query)
 * into a safe Google Maps embed URL suitable for iframe `src`.
 */
export function buildMapEmbedUrl(raw: string): string | null {
  const value = (raw || '').trim();
  if (!value) return null;

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (!/(^|\.)google\.[^/]+$/i.test(url.hostname)) {
        return null;
      }
      if (url.pathname.startsWith('/maps/embed')) {
        return url.toString();
      }
      if (url.searchParams.get('output') === 'embed') {
        return url.toString();
      }
      const q =
        url.searchParams.get('q') ||
        url.searchParams.get('query') ||
        url.pathname
          .replace(/^\/maps\/?/, '')
          .replace(/^place\//, '')
          .split('/')[0] ||
        '';
      const decoded = q ? decodeURIComponent(q) : '';
      if (decoded) {
        return `https://www.google.com/maps?q=${encodeURIComponent(decoded)}&output=embed`;
      }
      return `${value}${value.includes('?') ? '&' : '?'}output=embed`;
    } catch {
      return null;
    }
  }

  return `https://www.google.com/maps?q=${encodeURIComponent(value)}&output=embed`;
}
