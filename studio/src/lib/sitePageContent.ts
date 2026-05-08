/**
 * Terms & Privacy page loader/saver — dedicated API endpoints.
 *
 *   Terms:    GET /api/terms, GET/PATCH /api/admin/terms
 *   Privacy:  GET /api/privacy, GET/PATCH /api/admin/privacy
 *
 * Each table is a singleton with columns: title, content_html, updated_at.
 */

import { api } from './api';

export type SimpleSitePageKey = 'terms' | 'privacy';
export type SitePageLocale = 'zh-TW' | 'zh-CN' | 'en';

export interface SimpleSitePageContent {
  title: string;
  contentHtml: string;
}

interface PackedSitePageI18nValue {
  schemaVersion: 1;
  values: {
    'zh-TW': string;
    'zh-CN': string;
    en: string;
  };
}

const SITE_PAGE_I18N_PREFIX = '__SITE_PAGE_I18N__';

function emptyPackedValues() {
  return {
    'zh-TW': '',
    'zh-CN': '',
    en: '',
  };
}

function normalizeSitePageLocale(lang?: string): SitePageLocale {
  if (!lang) return 'zh-TW';
  if (lang === 'zh-CN' || lang.toLowerCase() === 'zh-cn') return 'zh-CN';
  if (lang === 'en' || lang.toLowerCase().startsWith('en')) return 'en';
  return 'zh-TW';
}

function parsePackedI18n(raw: string): PackedSitePageI18nValue | null {
  const value = raw.trim();
  if (!value.startsWith(SITE_PAGE_I18N_PREFIX)) return null;
  const jsonText = value.slice(SITE_PAGE_I18N_PREFIX.length).trim();
  if (!jsonText) return null;
  try {
    const parsed = JSON.parse(jsonText) as Partial<PackedSitePageI18nValue>;
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

function stringifyPackedI18n(values: PackedSitePageI18nValue['values']): string {
  return `${SITE_PAGE_I18N_PREFIX}${JSON.stringify({ schemaVersion: 1, values })}`;
}

export function getSitePageContentForLocale(raw: string, lang?: string): string {
  const packed = parsePackedI18n(raw || '');
  if (!packed) return raw || '';
  const locale = normalizeSitePageLocale(lang);
  if (packed.values[locale].trim()) return packed.values[locale];
  if (packed.values['zh-TW'].trim()) return packed.values['zh-TW'];
  if (packed.values['zh-CN'].trim()) return packed.values['zh-CN'];
  if (packed.values.en.trim()) return packed.values.en;
  return '';
}

export function getSitePageContentForLocaleExact(raw: string, lang?: string): string {
  const locale = normalizeSitePageLocale(lang);
  const packed = parsePackedI18n(raw || '');
  if (!packed) return locale === 'zh-TW' ? raw || '' : '';
  return packed.values[locale] || '';
}

export function setSitePageContentForLocale(raw: string, lang: string, nextValue: string): string {
  const locale = normalizeSitePageLocale(lang);
  const packed = parsePackedI18n(raw || '');
  const values = packed ? { ...packed.values } : emptyPackedValues();
  if (!packed && (raw || '').trim() !== '') {
    values['zh-TW'] = raw;
  }
  values[locale] = nextValue;
  return stringifyPackedI18n(values);
}

type PageRow = { title?: unknown; content_html?: unknown };

function normalize(raw: unknown): SimpleSitePageContent {
  if (!raw || typeof raw !== 'object') return { title: '', contentHtml: '' };
  const o = raw as PageRow;
  return {
    title: typeof o.title === 'string' ? o.title : '',
    contentHtml: typeof o.content_html === 'string' ? o.content_html : '',
  };
}

/**
 * Load the page. Uses the public endpoint (`/api/{key}`) — the admin endpoint
 * returns the same shape, so there is no need to hit both.
 *
 * Returns `null` only when the backend is unreachable or returns an empty row,
 * so the caller can fall back to i18n defaults.
 */
export async function loadSimpleSitePage(
  pageKey: SimpleSitePageKey
): Promise<SimpleSitePageContent | null> {
  try {
    const res = await api.get<PageRow>(`/${pageKey}`);
    if (res.success && res.data) {
      const page = normalize(res.data);
      if (page.title.trim() !== '' || page.contentHtml.trim() !== '') {
        return page;
      }
    }
  } catch (err) {
    console.warn(`GET /api/${pageKey} failed`, err);
  }
  return null;
}

/** Admin update (requires admin Bearer token). */
export async function saveSimpleSitePage(
  pageKey: SimpleSitePageKey,
  data: SimpleSitePageContent
): Promise<void> {
  const response = await api.patch(`/admin/${pageKey}`, {
    title: data.title.trim(),
    content_html: data.contentHtml,
  });
  if (!response.success) {
    throw new Error(response.msg || `Failed to update ${pageKey}`);
  }
}
