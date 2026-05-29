/**
 * Admin-managed news posts (最新消息). Legacy localStorage helpers for admin cache.
 * Public pages load news from the API only.
 */

/** Supported news languages (admin inputs all three; public gets one via ?lang=). */
export type NewsLang = 'zh-TW' | 'zh-CN' | 'en';

export interface StoredNewsPost {
  id: string;
  /** Legacy single title (used when multilang not set). */
  title: string;
  /** Legacy single content (used when multilang not set). */
  content: string;
  /** Title in 繁體中文 (admin input). */
  title_zh_tw?: string;
  /** Title in 简体中文 (admin input). */
  title_zh_cn?: string;
  /** Title in English (admin input). */
  title_en?: string;
  /** Content in 繁體中文. */
  content_zh_tw?: string;
  /** Content in 简体中文. */
  content_zh_cn?: string;
  /** Content in English. */
  content_en?: string;
  /** Image URL (external URL or data URL from upload). */
  image_url: string | null;
  published_at: string; // ISO
  created_at: string;   // ISO
  /** If true, show this post in a pop-up when user visits the site. */
  show_as_popup?: boolean;
}

/** Display title for list (first non-empty language). */
export function getPostDisplayTitle(p: StoredNewsPost): string {
  return p.title_zh_tw?.trim() || p.title_zh_cn?.trim() || p.title_en?.trim() || p.title?.trim() || '';
}

const STORAGE_KEY = 'the_yard_news_posts';

function getStored(): StoredNewsPost[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setStored(posts: StoredNewsPost[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch (e) {
    console.warn('Failed to save news posts to localStorage', e);
  }
}

/** Get news posts that are marked to show as pop-up (sorted by published_at desc). */
export function getPopupNewsPosts(): StoredNewsPost[] {
  const posts = getStored().filter((p) => p.show_as_popup === true);
  return [...posts].sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
}

/** Get all news posts saved by admin. */
export function getStoredNewsPosts(): StoredNewsPost[] {
  return getStored();
}

/** Save full list (replace all). Used by admin. */
export function saveStoredNewsPosts(posts: StoredNewsPost[]): void {
  setStored(posts);
}

/** Create a new post (generate id and created_at). */
export function createStoredNewsPost(input: {
  title?: string;
  content?: string;
  title_zh_tw?: string;
  title_zh_cn?: string;
  title_en?: string;
  content_zh_tw?: string;
  content_zh_cn?: string;
  content_en?: string;
  image_url: string | null;
  published_at: string;
  show_as_popup?: boolean;
}): StoredNewsPost {
  const id = `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  return {
    id,
    title: input.title?.trim() ?? '',
    content: input.content?.trim() ?? '',
    title_zh_tw: input.title_zh_tw?.trim(),
    title_zh_cn: input.title_zh_cn?.trim(),
    title_en: input.title_en?.trim(),
    content_zh_tw: input.content_zh_tw?.trim(),
    content_zh_cn: input.content_zh_cn?.trim(),
    content_en: input.content_en?.trim(),
    image_url: input.image_url || null,
    published_at: input.published_at || now,
    created_at: now,
    show_as_popup: input.show_as_popup ?? false,
  };
}

/** Update existing post by id. */
export function updateStoredNewsPost(
  id: string,
  updates: Partial<Pick<StoredNewsPost, 'title' | 'content' | 'title_zh_tw' | 'title_zh_cn' | 'title_en' | 'content_zh_tw' | 'content_zh_cn' | 'content_en' | 'image_url' | 'published_at' | 'show_as_popup'>>
): boolean {
  const posts = getStored();
  const idx = posts.findIndex((p) => p.id === id);
  if (idx < 0) return false;
  posts[idx] = { ...posts[idx], ...updates };
  setStored(posts);
  return true;
}

/** Delete post by id. */
export function deleteStoredNewsPost(id: string): boolean {
  const posts = getStored().filter((p) => p.id !== id);
  if (posts.length === getStored().length) return false;
  setStored(posts);
  return true;
}
