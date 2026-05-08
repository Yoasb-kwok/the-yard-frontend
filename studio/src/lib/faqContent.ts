/**
 * FAQ page content — dedicated API.
 *
 * Public:
 *   GET    /api/faq                          → { title, intro, items: [...] }
 *
 * Admin:
 *   GET    /api/admin/faq                    → { title, intro, updated_at }
 *   PATCH  /api/admin/faq                    body: { title?, intro? }
 *   GET    /api/admin/faq/items              → all items including is_active=0
 *   POST   /api/admin/faq/items              body: { question, answer_html, is_active?, display_order? }
 *   PATCH  /api/admin/faq/items/:id          body: partial item fields
 *   DELETE /api/admin/faq/items/:id
 *   POST   /api/admin/faq/items/reorder      body: { order: [id1, id2, ...] }
 *
 * Item ids:
 *   - number  → persisted
 *   - string  → new item created client-side (saved via POST on save)
 */

import { api } from './api';

export interface FaqItem {
  id: number | string;
  /** Plain text question. */
  question: string;
  /** Rich text HTML answer. */
  answer_html: string;
  is_active: boolean;
}

export interface FaqContent {
  title: string;
  intro: string;
  items: FaqItem[];
}

export type FaqLocale = 'zh-TW' | 'zh-CN' | 'en';

interface PackedFaqI18nValue {
  schemaVersion: 1;
  values: {
    'zh-TW': string;
    'zh-CN': string;
    en: string;
  };
}

const FAQ_I18N_PREFIX = '__FAQ_I18N__';

function newClientId(): string {
  return `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyFaqItem(): FaqItem {
  return {
    id: newClientId(),
    question: '',
    answer_html: '',
    is_active: true,
  };
}

export function createDefaultFaqContent(): FaqContent {
  return { title: '', intro: '', items: [] };
}

function emptyPackedValues() {
  return {
    'zh-TW': '',
    'zh-CN': '',
    en: '',
  };
}

function normalizeFaqLocale(lang?: string): FaqLocale {
  if (!lang) return 'zh-TW';
  if (lang === 'zh-CN' || lang.toLowerCase() === 'zh-cn') return 'zh-CN';
  if (lang === 'en' || lang.toLowerCase().startsWith('en')) return 'en';
  return 'zh-TW';
}

function parsePackedI18n(raw: string): PackedFaqI18nValue | null {
  const value = raw.trim();
  if (!value.startsWith(FAQ_I18N_PREFIX)) return null;
  const jsonText = value.slice(FAQ_I18N_PREFIX.length).trim();
  if (!jsonText) return null;
  try {
    const parsed = JSON.parse(jsonText) as Partial<PackedFaqI18nValue>;
    if (!parsed || parsed.schemaVersion !== 1 || !parsed.values) return null;
    return {
      schemaVersion: 1,
      values: {
        'zh-TW': typeof parsed.values['zh-TW'] === 'string' ? parsed.values['zh-TW'] : '',
        'zh-CN': typeof parsed.values['zh-CN'] === 'string' ? parsed.values['zh-CN'] : '',
        en: typeof parsed.values.en === 'string' ? parsed.values.en : '',
      },
    };
  } catch {
    return null;
  }
}

function stringifyPackedI18n(values: PackedFaqI18nValue['values']): string {
  return `${FAQ_I18N_PREFIX}${JSON.stringify({ schemaVersion: 1, values })}`;
}

export function getFaqFieldForLocale(raw: string, lang?: string): string {
  const packed = parsePackedI18n(raw || '');
  if (!packed) return raw || '';
  const locale = normalizeFaqLocale(lang);
  if (packed.values[locale].trim()) return packed.values[locale];
  if (packed.values['zh-TW'].trim()) return packed.values['zh-TW'];
  if (packed.values['zh-CN'].trim()) return packed.values['zh-CN'];
  if (packed.values.en.trim()) return packed.values.en;
  return '';
}

export function getFaqFieldForLocaleExact(raw: string, lang?: string): string {
  const locale = normalizeFaqLocale(lang);
  const packed = parsePackedI18n(raw || '');
  if (!packed) {
    return locale === 'zh-TW' ? raw || '' : '';
  }
  return packed.values[locale] || '';
}

export function setFaqFieldForLocale(raw: string, lang: string, nextValue: string): string {
  const locale = normalizeFaqLocale(lang);
  const packed = parsePackedI18n(raw || '');
  const values = packed ? { ...packed.values } : emptyPackedValues();
  if (!packed && (raw || '').trim() !== '') {
    values['zh-TW'] = raw;
  }
  values[locale] = nextValue;
  return stringifyPackedI18n(values);
}

export function hasFaqFieldVisibleContent(raw: string): boolean {
  const packed = parsePackedI18n(raw || '');
  if (!packed) return (raw || '').trim() !== '';
  return (
    packed.values['zh-TW'].trim() !== '' ||
    packed.values['zh-CN'].trim() !== '' ||
    packed.values.en.trim() !== ''
  );
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

function normalizeItem(raw: unknown): FaqItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const idRaw = o.id;
  const id =
    typeof idRaw === 'number'
      ? idRaw
      : typeof idRaw === 'string' && /^\d+$/.test(idRaw)
        ? Number(idRaw)
        : typeof idRaw === 'string' && idRaw.trim() !== ''
          ? idRaw
          : newClientId();
  return {
    id,
    question: typeof o.question === 'string' ? o.question : '',
    answer_html:
      typeof o.answer_html === 'string'
        ? o.answer_html
        : typeof o.answer === 'string'
          ? o.answer
          : '',
    is_active: toBool(o.is_active, true),
  };
}

function normalizeSettings(raw: unknown): { title: string; intro: string } {
  if (!raw || typeof raw !== 'object') return { title: '', intro: '' };
  const o = raw as Record<string, unknown>;
  const settings =
    o.settings && typeof o.settings === 'object'
      ? (o.settings as Record<string, unknown>)
      : o;
  return {
    title: typeof settings.title === 'string' ? settings.title : '',
    intro:
      typeof settings.intro === 'string'
        ? settings.intro
        : typeof settings.intro_html === 'string'
          ? settings.intro_html
          : typeof o.intro === 'string'
            ? o.intro
            : '',
  };
}

/* -------------------------------------------------------------------------- */
/* Public loader                                                              */
/* -------------------------------------------------------------------------- */

/** Load the public FAQ content. Returns null when the server has nothing. */
export async function loadPublicFaq(): Promise<FaqContent | null> {
  try {
    const res = await api.get<{
      title?: string;
      intro?: string;
      settings?: { title?: string; intro?: string; intro_html?: string };
      items?: unknown[];
    }>('/faq');
    if (res.success && res.data) {
      const items: FaqItem[] = [];
      const rawItems = Array.isArray(res.data.items) ? res.data.items : [];
      for (const it of rawItems) {
        const n = normalizeItem(it);
        if (n) items.push(n);
      }
      const settings = res.data.settings && typeof res.data.settings === 'object' ? res.data.settings : undefined;
      const title =
        typeof res.data.title === 'string'
          ? res.data.title
          : typeof settings?.title === 'string'
            ? settings.title
            : '';
      const intro =
        typeof res.data.intro === 'string'
          ? res.data.intro
          : typeof settings?.intro === 'string'
            ? settings.intro
            : typeof settings?.intro_html === 'string'
              ? settings.intro_html
              : '';
      if (items.length > 0 || title.trim() !== '' || intro.trim() !== '') {
        return { title, intro, items };
      }
    }
  } catch (err) {
    console.warn('GET /api/faq failed', err);
  }
  return null;
}

/** Back-compat alias: `loadFaqContent()` → public view. */
export const loadFaqContent = loadPublicFaq;

/* -------------------------------------------------------------------------- */
/* Admin loader                                                               */
/* -------------------------------------------------------------------------- */

export async function loadAdminFaq(): Promise<FaqContent> {
  const [settingsRes, itemsRes] = await Promise.all([
    api.get('/admin/faq'),
    api.get<unknown[]>('/admin/faq/items'),
  ]);

  const settings = settingsRes.success ? normalizeSettings(settingsRes.data) : { title: '', intro: '' };
  const items: FaqItem[] = [];
  if (itemsRes.success && Array.isArray(itemsRes.data)) {
    for (const it of itemsRes.data) {
      const n = normalizeItem(it);
      if (n) items.push(n);
    }
  }
  return { ...settings, items };
}

/* -------------------------------------------------------------------------- */
/* Admin save (diff-and-sync)                                                 */
/* -------------------------------------------------------------------------- */

function itemPayload(it: FaqItem): Record<string, unknown> {
  return {
    question: it.question.trim(),
    answer_html: it.answer_html,
    is_active: it.is_active,
  };
}

/** Tolerant id extraction — see contactContent.ts for rationale. */
function extractId(res: { data?: unknown; id?: unknown; insertId?: unknown }): number | null {
  const candidates: unknown[] = [];
  const data = res.data as Record<string, unknown> | undefined;
  if (data) {
    candidates.push(data.id, data.insertId);
    for (const key of ['item', 'faq', 'row']) {
      const nested = data[key];
      if (nested && typeof nested === 'object') {
        candidates.push((nested as Record<string, unknown>).id);
      }
    }
  }
  candidates.push(res.id, res.insertId);
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c)) return c;
    if (typeof c === 'string' && /^\d+$/.test(c)) return Number(c);
  }
  return null;
}

/**
 * Persist the full FAQ content by diff-syncing against the server.
 * See {@link saveAdminContact} for the same pattern used for Contact.
 */
export async function saveAdminFaq(current: FaqContent): Promise<FaqContent> {
  // 1. Settings
  const settingsRes = await api.patch('/admin/faq', {
    title: current.title.trim(),
    intro: current.intro.trim(),
  });
  if (!settingsRes.success) {
    throw new Error(settingsRes.msg || 'Failed to save FAQ settings');
  }

  // 2. Current server items
  const serverRes = await api.get<unknown[]>('/admin/faq/items');
  if (!serverRes.success || !Array.isArray(serverRes.data)) {
    throw new Error('Failed to load current FAQ items');
  }
  const serverItems: FaqItem[] = [];
  for (const it of serverRes.data) {
    const n = normalizeItem(it);
    if (n) serverItems.push(n);
  }

  // 3. Delete items removed locally
  const keptIds = new Set<number>(
    current.items.filter((it) => typeof it.id === 'number').map((it) => it.id as number)
  );
  for (const s of serverItems) {
    if (typeof s.id === 'number' && !keptIds.has(s.id)) {
      const del = await api.delete(`/admin/faq/items/${s.id}`);
      if (!del.success) {
        throw new Error(del.msg || `Failed to delete FAQ item ${s.id}`);
      }
    }
  }

  // 4. Upsert
  const finalOrder: number[] = [];
  for (const it of current.items) {
    if (typeof it.id === 'number') {
      const patchRes = await api.patch(`/admin/faq/items/${it.id}`, itemPayload(it));
      if (!patchRes.success) {
        throw new Error(patchRes.msg || `Failed to update FAQ item ${it.id}`);
      }
      finalOrder.push(it.id);
    } else {
      const createRes = await api.post<Record<string, unknown>>(
        '/admin/faq/items',
        itemPayload(it)
      );
      const newId = extractId(createRes);
      if (newId === null) {
        console.error('Unexpected create-faq-item response:', createRes);
        throw new Error(
          createRes.msg ||
            `FAQ item created but server did not return a numeric id. Response: ${JSON.stringify(createRes).slice(0, 200)}`
        );
      }
      finalOrder.push(newId);
    }
  }

  // 5. Reorder
  if (finalOrder.length > 1) {
    const reorderRes = await api.post('/admin/faq/items/reorder', {
      order: finalOrder,
    });
    if (!reorderRes.success) {
      console.warn('FAQ reorder failed', reorderRes.msg);
    }
  }

  // 6. Fresh state
  return loadAdminFaq();
}

/** Back-compat alias. */
export const saveFaqContent = saveAdminFaq;
