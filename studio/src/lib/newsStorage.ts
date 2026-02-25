/**
 * Admin-managed news posts (最新消息). Stored in localStorage for demo.
 * Public NewsPage reads from here when available; otherwise falls back to DUMMY_NEWS_POSTS.
 */

export interface StoredNewsPost {
  id: string;
  title: string;
  content: string;
  /** Image URL (external URL or data URL from upload). */
  image_url: string | null;
  published_at: string; // ISO
  created_at: string;   // ISO
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

/** Get all news posts saved by admin. */
export function getStoredNewsPosts(): StoredNewsPost[] {
  return getStored();
}

/** Save full list (replace all). Used by admin. */
export function saveStoredNewsPosts(posts: StoredNewsPost[]): void {
  setStored(posts);
}

/** Create a new post (generate id and created_at). */
export function createStoredNewsPost(
  input: { title: string; content: string; image_url: string | null; published_at: string }
): StoredNewsPost {
  const id = `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  return {
    id,
    title: input.title.trim(),
    content: input.content.trim(),
    image_url: input.image_url || null,
    published_at: input.published_at || now,
    created_at: now,
  };
}

/** Update existing post by id. */
export function updateStoredNewsPost(
  id: string,
  updates: Partial<Pick<StoredNewsPost, 'title' | 'content' | 'image_url' | 'published_at'>>
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
