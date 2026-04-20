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

export interface SimpleSitePageContent {
  title: string;
  contentHtml: string;
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
