/**
 * Image upload helper for admin CMS.
 *
 * Uses backend `POST /api/admin/uploads` (multipart/form-data) which returns
 * a URL the frontend can store in DB as `image_url` / `content_html src`.
 *
 * Bypasses the shared `api` client because multipart bodies need the browser
 * to set `Content-Type` (with boundary) automatically.
 */

import { isDemoMode } from './mock';

const DEFAULT_PROD_API_URL = 'https://theyardapis.01tech.work/api';
const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? '/api' : DEFAULT_PROD_API_URL);

function buildUrl(endpoint: string): string {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const pathWithApi = path.startsWith('/api') ? path : `/api${path}`;
  const base =
    (API_BASE_URL || '').replace(/\/api\/?$/, '') ||
    (import.meta.env.DEV ? '' : 'http://localhost:3002');
  return base ? `${base}${pathWithApi}` : pathWithApi;
}

export interface UploadedAsset {
  /** URL the backend returned (absolute or `/uploads/...` relative). */
  url: string;
  mime?: string;
  size?: number;
}

/** Resolve a possibly-relative upload URL to an absolute one for `<img src>`. */
export function resolveUploadUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (/^(https?:|data:)/i.test(url)) return url;
  // Relative path from backend (e.g. "/uploads/xxx.png")
  const origin =
    (API_BASE_URL || '').replace(/\/api\/?$/, '') ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  if (!origin) return url;
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * Upload a file to `/api/admin/uploads`.
 * Returns the URL string to store in DB (relative or absolute, as returned by backend).
 */
export async function uploadImage(file: File, purpose?: string): Promise<string> {
  if (isDemoMode()) {
    // Use a stable placeholder URL tied to the file name so the image persists
    // across reloads and feels real.
    const seed = encodeURIComponent(`${purpose || 'demo'}-${file.name}-${file.size}`);
    await new Promise((r) => setTimeout(r, 300));
    return `https://picsum.photos/seed/${seed}/1000/600`;
  }
  const form = new FormData();
  form.append('file', file);
  if (purpose) form.append('purpose', purpose);

  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // DO NOT set Content-Type; the browser will set it with the multipart boundary.

  const response = await fetch(buildUrl('/admin/uploads'), {
    method: 'POST',
    body: form,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  let parsed: unknown = null;
  if (contentType.includes('application/json')) {
    try {
      parsed = await response.json();
    } catch {
      // fall through
    }
  }

  if (!response.ok) {
    const msg =
      (parsed && typeof parsed === 'object' && 'msg' in parsed && typeof (parsed as { msg: unknown }).msg === 'string'
        ? (parsed as { msg: string }).msg
        : null) || `Upload failed (${response.status})`;
    throw new Error(msg);
  }

  // Expected body: { success: true, data: { url, mime?, size? } }
  // Also tolerate legacy shape { success: true, url: "..." }
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    const data = (obj.data && typeof obj.data === 'object' ? obj.data : obj) as Record<string, unknown>;
    const url = typeof data.url === 'string' ? data.url : null;
    if (url) return url;
  }

  throw new Error('Upload response missing url');
}
