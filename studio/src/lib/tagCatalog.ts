/**
 * Class tag catalog — dedicated API.
 *
 * Two resources:
 *   - Tag types   (class_tag_types): the dimensions themselves
 *                 (level / age / category / admin-created ones).
 *   - Tags        (class_tags): the values inside a type
 *                 (entry / intermediate / advanced ...).
 *
 * Phase 1 ships with three system types pre-seeded
 * (level / age / category, `is_system = true`); admins can add any number
 * of additional types, and the UI builds its tab list dynamically from
 * `GET /api/admin/tag-types`.
 *
 * Public endpoints:
 *   GET    /api/tag-types                         → TagTypeRow[] (is_active = 1 only)
 *   GET    /api/tags?type=:code                   → TagRow[]     (is_active = 1 only)
 *   GET    /api/tags                               → { <typeCode>: TagRow[], ... }
 *
 * Admin endpoints — tag types:
 *   GET    /api/admin/tag-types                  → all rows
 *   POST   /api/admin/tag-types                  body: { code, label_zh_tw, ... }
 *   PATCH  /api/admin/tag-types/:id              body: partial
 *   DELETE /api/admin/tag-types/:id
 *   POST   /api/admin/tag-types/reorder          body: { order: number[] }
 *
 * Admin endpoints — tags:
 *   GET    /api/admin/tags?type=:code            → all rows for that type
 *   POST   /api/admin/tags                       body: { type, code, label_zh_tw, ... }
 *   PATCH  /api/admin/tags/:id                   body: partial
 *   DELETE /api/admin/tags/:id
 *   POST   /api/admin/tags/reorder               body: { type, order: number[] }
 *
 * IDs:
 *   - number → persisted
 *   - string → new client-side row (created via POST on save)
 *
 * See also: studio/docs/TAGS_CMS_SPEC.md
 */

import { api } from './api';

/** The `code` column of a tag type — any slug the admin defined. */
export type TagType = string;

export interface TagTypeRow {
  id: number | string;
  code: TagType;
  label_zh_tw: string;
  label_zh_cn: string;
  label_en: string;
  sort_order: number;
  is_active: boolean;
  /** True for built-in types (level / age / category). Cannot be deleted. */
  is_system: boolean;
}

export interface TagRow {
  id: number | string;
  type: TagType;
  code: string;
  label_zh_tw: string;
  label_zh_cn: string;
  label_en: string;
  sort_order: number;
  is_active: boolean;
}

/** Built-in type codes that cannot be deleted via the UI. Kept in sync with the spec seed. */
export const SYSTEM_TAG_TYPE_CODES: readonly TagType[] = ['level', 'age', 'category'];

export function newClientTagId(): string {
  return `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyTag(type: TagType, sortOrder: number): TagRow {
  return {
    id: newClientTagId(),
    type,
    code: '',
    label_zh_tw: '',
    label_zh_cn: '',
    label_en: '',
    sort_order: sortOrder,
    is_active: true,
  };
}

export function createEmptyTagType(sortOrder: number): TagTypeRow {
  return {
    id: newClientTagId(),
    code: '',
    label_zh_tw: '',
    label_zh_cn: '',
    label_en: '',
    sort_order: sortOrder,
    is_active: true,
    is_system: false,
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

function toStr(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function toNum(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function toIdOrClient(raw: unknown): number | string {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    if (/^\d+$/.test(raw)) return Number(raw);
    if (raw.trim() !== '') return raw;
  }
  return newClientTagId();
}

/**
 * Tolerant tag normaliser — MySQL returns numeric ids as strings, booleans as
 * 0/1 ints, nullable text columns as NULL. Fall back on `label_zh_tw` for
 * any missing translated label so the UI never shows an empty chip.
 */
function normalizeRow(raw: unknown): TagRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const type = toStr(o.type).trim();
  if (!type) return null;

  const label_zh_tw = toStr(o.label_zh_tw);
  return {
    id: toIdOrClient(o.id),
    type,
    code: toStr(o.code),
    label_zh_tw,
    label_zh_cn: toStr(o.label_zh_cn) || label_zh_tw,
    label_en: toStr(o.label_en) || label_zh_tw,
    sort_order: toNum(o.sort_order, 0),
    is_active: toBool(o.is_active, true),
  };
}

function normalizeTypeRow(raw: unknown): TagTypeRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const code = toStr(o.code).trim();
  if (!code) return null;

  const label_zh_tw = toStr(o.label_zh_tw);
  return {
    id: toIdOrClient(o.id),
    code,
    label_zh_tw,
    label_zh_cn: toStr(o.label_zh_cn) || label_zh_tw,
    label_en: toStr(o.label_en) || label_zh_tw,
    sort_order: toNum(o.sort_order, 0),
    is_active: toBool(o.is_active, true),
    is_system: toBool(o.is_system, false),
  };
}

function extractRows(raw: unknown): TagRow[] {
  if (!Array.isArray(raw)) return [];
  const out: TagRow[] = [];
  for (const item of raw) {
    const row = normalizeRow(item);
    if (row) out.push(row);
  }
  return out;
}

function extractTypeRows(raw: unknown): TagTypeRow[] {
  if (!Array.isArray(raw)) return [];
  const out: TagTypeRow[] = [];
  for (const item of raw) {
    const row = normalizeTypeRow(item);
    if (row) out.push(row);
  }
  return out;
}

/** Extract an inserted numeric id from a variety of backend response shapes. */
function extractInsertedId(raw: unknown): number | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const candidates: unknown[] = [
    o.id,
    (o.data as Record<string, unknown> | undefined)?.id,
    o.insertId,
  ];
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c)) return c;
    if (typeof c === 'string' && /^\d+$/.test(c)) return Number(c);
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Public API — tag types                                                     */
/* -------------------------------------------------------------------------- */

export async function fetchPublicTagTypes(): Promise<TagTypeRow[]> {
  const res = await api.get<TagTypeRow[]>('/tag-types');
  if (!res.success) {
    throw new Error(res.msg || 'Failed to load tag types');
  }
  const rows = extractTypeRows(res.data);
  rows.sort((a, b) => a.sort_order - b.sort_order || String(a.id).localeCompare(String(b.id)));
  return rows;
}

/* -------------------------------------------------------------------------- */
/* Public API — tags                                                          */
/* -------------------------------------------------------------------------- */

export async function fetchPublicTags(type: TagType): Promise<TagRow[]> {
  const res = await api.get<TagRow[]>('/tags', { type });
  if (!res.success) {
    throw new Error(res.msg || 'Failed to load tags');
  }
  return extractRows(res.data);
}

/* -------------------------------------------------------------------------- */
/* Admin API — tag types                                                      */
/* -------------------------------------------------------------------------- */

export async function fetchAdminTagTypes(): Promise<TagTypeRow[]> {
  const res = await api.get<TagTypeRow[]>('/admin/tag-types');
  if (!res.success) {
    throw new Error(res.msg || 'Failed to load tag types');
  }
  const rows = extractTypeRows(res.data);
  rows.sort((a, b) => a.sort_order - b.sort_order || String(a.id).localeCompare(String(b.id)));
  return rows;
}

export async function createTagType(
  input: Omit<TagTypeRow, 'id' | 'is_system'>,
): Promise<number> {
  const payload = {
    code: input.code.trim(),
    label_zh_tw: input.label_zh_tw.trim(),
    label_zh_cn: input.label_zh_cn.trim(),
    label_en: input.label_en.trim(),
    sort_order: input.sort_order,
    is_active: input.is_active,
  };
  const res = await api.post<Record<string, unknown>>('/admin/tag-types', payload);
  if (!res.success) {
    throw new Error(res.msg || 'Failed to create tag type');
  }
  const id = extractInsertedId(res.data) ?? extractInsertedId(res);
  if (id == null) {
    throw new Error('Tag type created but backend did not return an id');
  }
  return id;
}

export async function updateTagType(
  id: number,
  patch: Partial<Omit<TagTypeRow, 'id' | 'is_system'>>,
): Promise<void> {
  const body: Record<string, unknown> = {};
  if (patch.code !== undefined) body.code = patch.code.trim();
  if (patch.label_zh_tw !== undefined) body.label_zh_tw = patch.label_zh_tw.trim();
  if (patch.label_zh_cn !== undefined) body.label_zh_cn = patch.label_zh_cn.trim();
  if (patch.label_en !== undefined) body.label_en = patch.label_en.trim();
  if (patch.sort_order !== undefined) body.sort_order = patch.sort_order;
  if (patch.is_active !== undefined) body.is_active = patch.is_active;
  if (Object.keys(body).length === 0) return;
  const res = await api.patch<Record<string, unknown>>(`/admin/tag-types/${id}`, body);
  if (!res.success) {
    throw new Error(res.msg || 'Failed to update tag type');
  }
}

export async function deleteTagType(id: number): Promise<void> {
  const res = await api.delete(`/admin/tag-types/${id}`);
  if (!res.success) {
    throw new Error(res.msg || 'Failed to delete tag type');
  }
}

export async function reorderTagTypes(order: number[]): Promise<void> {
  const res = await api.post<Record<string, unknown>>('/admin/tag-types/reorder', { order });
  if (!res.success) {
    throw new Error(res.msg || 'Failed to reorder tag types');
  }
}

/* -------------------------------------------------------------------------- */
/* Admin API — tags                                                           */
/* -------------------------------------------------------------------------- */

export async function fetchAdminTagsByType(type: TagType): Promise<TagRow[]> {
  const res = await api.get<TagRow[]>('/admin/tags', { type });
  if (!res.success) {
    throw new Error(res.msg || 'Failed to load tags');
  }
  const rows = extractRows(res.data);
  rows.sort((a, b) => a.sort_order - b.sort_order || String(a.id).localeCompare(String(b.id)));
  return rows;
}

export async function createTag(input: Omit<TagRow, 'id'>): Promise<number> {
  const payload = {
    type: input.type,
    code: input.code.trim(),
    label_zh_tw: input.label_zh_tw.trim(),
    label_zh_cn: input.label_zh_cn.trim(),
    label_en: input.label_en.trim(),
    sort_order: input.sort_order,
    is_active: input.is_active,
  };
  const res = await api.post<Record<string, unknown>>('/admin/tags', payload);
  if (!res.success) {
    throw new Error(res.msg || 'Failed to create tag');
  }
  const id = extractInsertedId(res.data) ?? extractInsertedId(res);
  if (id == null) {
    throw new Error('Tag created but backend did not return an id');
  }
  return id;
}

export async function updateTag(
  id: number,
  patch: Partial<Omit<TagRow, 'id' | 'type'>>,
): Promise<void> {
  const body: Record<string, unknown> = {};
  if (patch.code !== undefined) body.code = patch.code.trim();
  if (patch.label_zh_tw !== undefined) body.label_zh_tw = patch.label_zh_tw.trim();
  if (patch.label_zh_cn !== undefined) body.label_zh_cn = patch.label_zh_cn.trim();
  if (patch.label_en !== undefined) body.label_en = patch.label_en.trim();
  if (patch.sort_order !== undefined) body.sort_order = patch.sort_order;
  if (patch.is_active !== undefined) body.is_active = patch.is_active;
  if (Object.keys(body).length === 0) return;
  const res = await api.patch<Record<string, unknown>>(`/admin/tags/${id}`, body);
  if (!res.success) {
    throw new Error(res.msg || 'Failed to update tag');
  }
}

export async function deleteTag(id: number): Promise<void> {
  const res = await api.delete(`/admin/tags/${id}`);
  if (!res.success) {
    throw new Error(res.msg || 'Failed to delete tag');
  }
}

/** Send the new ordering as a list of persisted ids. Client-side ids must be saved first. */
export async function reorderTags(type: TagType, order: number[]): Promise<void> {
  const res = await api.post<Record<string, unknown>>('/admin/tags/reorder', { type, order });
  if (!res.success) {
    throw new Error(res.msg || 'Failed to reorder tags');
  }
}

/* -------------------------------------------------------------------------- */
/* Validation helpers                                                         */
/* -------------------------------------------------------------------------- */

/** Stable slug used by `classes.level` / `classes.age_tag` / `classes.category`. */
export const TAG_CODE_REGEX = /^[a-z0-9_\-]+$/;

/** Stricter than tag codes — must start with a lowercase letter to make a safe JS-ish key. */
export const TAG_TYPE_CODE_REGEX = /^[a-z][a-z0-9_\-]*$/;

export function validateTagDraft(
  draft: Pick<TagRow, 'code' | 'label_zh_tw'>,
  peers: TagRow[],
  currentId: TagRow['id'],
): string | null {
  const code = draft.code.trim();
  if (!code) return 'code_required';
  if (code.length > 64) return 'code_too_long';
  if (!TAG_CODE_REGEX.test(code)) return 'code_invalid';
  if (!draft.label_zh_tw.trim()) return 'label_required';
  if (draft.label_zh_tw.length > 128) return 'label_too_long';
  if (peers.some((p) => p.id !== currentId && p.code.trim().toLowerCase() === code.toLowerCase())) {
    return 'code_duplicate';
  }
  return null;
}

export function validateTagTypeDraft(
  draft: Pick<TagTypeRow, 'code' | 'label_zh_tw'>,
  peers: TagTypeRow[],
  currentId: TagTypeRow['id'],
): string | null {
  const code = draft.code.trim();
  if (!code) return 'code_required';
  if (code.length > 32) return 'code_too_long';
  if (!TAG_TYPE_CODE_REGEX.test(code)) return 'code_invalid';
  if (!draft.label_zh_tw.trim()) return 'label_required';
  if (draft.label_zh_tw.length > 128) return 'label_too_long';
  if (peers.some((p) => p.id !== currentId && p.code.trim().toLowerCase() === code.toLowerCase())) {
    return 'code_duplicate';
  }
  return null;
}
