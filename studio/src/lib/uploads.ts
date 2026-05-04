/**
 * Image upload helper for admin CMS.
 *
 * Calls `POST /api/admin/uploads`. Backends differ:
 * - **Multipart binary** (`file` or `image`) avoids huge JSON bodies and Express `json()` size limits.
 * - Some expect JSON `{ image: "<data URL>" }` or `{ base64, mime }`.
 *
 * Order: **JSON first** (`base64`+`mime`, then `image` data URL), then multipart — many backends
 * validate JSON only and return 400 for multipart-only requests.
 */

import { isDemoMode } from './mock';
import { DEFAULT_UPLOAD_COMPRESSION, normalizeImageFileForUpload } from './imagePrepare';

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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

async function readResponseJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractMsg(parsed: unknown): string | null {
  if (parsed && typeof parsed === 'object' && 'msg' in parsed && typeof (parsed as { msg: unknown }).msg === 'string') {
    return (parsed as { msg: string }).msg;
  }
  return null;
}

function extractUrlFromUploadBody(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.url === 'string') return obj.url;
  const data = obj.data;
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (typeof d.url === 'string') return d.url;
    if (typeof d.image_url === 'string') return d.image_url;
    if (typeof d.path === 'string') return d.path;
  }
  return null;
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
 * Returns a URL safe to store and use in `<img src>`: `data:` and `http(s):` unchanged;
 * relative paths like `/uploads/...` are resolved to the API origin (Vite proxy in dev).
 */
export async function uploadImage(file: File, purpose?: string): Promise<string> {
  if (isDemoMode()) {
    // Use a stable placeholder URL tied to the file name so the image persists
    // across reloads and feels real.
    const seed = encodeURIComponent(`${purpose || 'demo'}-${file.name}-${file.size}`);
    await new Promise((r) => setTimeout(r, 300));
    return `https://picsum.photos/seed/${seed}/1000/600`;
  }
  const prepared = await normalizeImageFileForUpload(file, DEFAULT_UPLOAD_COMPRESSION);
  const token = localStorage.getItem('token');
  const authHeaders: Record<string, string> = {};
  if (token) authHeaders.Authorization = `Bearer ${token}`;

  const url = buildUrl('/admin/uploads');

  const postJson = async (body: Record<string, unknown>) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const parsed = await readResponseJson(response);
    return { response, parsed };
  };

  const safeFilename =
    typeof prepared.name === 'string' && prepared.name.length > 0
      ? prepared.name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'upload.jpg'
      : 'upload.jpg';

  const postMultipartBinary = async (fieldName: 'file' | 'image') => {
    const form = new FormData();
    // Omit explicit filename where possible — odd names can break some multer setups.
    form.append(fieldName, prepared, safeFilename);
    if (purpose) form.append('purpose', purpose);
    const response = await fetch(url, {
      method: 'POST',
      body: form,
      headers: { ...authHeaders },
    });
    const parsed = await readResponseJson(response);
    return { response, parsed };
  };

  /** Multipart text fields only (some stacks use multer.none + string `image`). */
  const postMultipartTextImage = async (imageValue: string) => {
    const form = new FormData();
    form.append('image', imageValue);
    if (purpose) form.append('purpose', purpose);
    const response = await fetch(url, {
      method: 'POST',
      body: form,
      headers: { ...authHeaders },
    });
    const parsed = await readResponseJson(response);
    return { response, parsed };
  };

  const dataUrl = await fileToDataUrl(prepared);
  const parts = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  const mime = parts?.[1];
  const base64 = parts?.[2];
  const purposeOpt = purpose ? { purpose } : {};

  /**
   * Many local backends validate JSON (`base64` + `mime` or `image` data URL) and never
   * read multipart `file` — sending multipart first always produced 400. JSON first fixes
   * sub‑~1MB photos; larger files still fall through to multipart.
   */
  const attempts: Array<() => Promise<{ response: Response; parsed: unknown }>> = [];
  if (mime && base64) {
    attempts.push(
      () => postJson({ base64, mime, ...purposeOpt }),
      () => postJson({ image_base64: base64, mime_type: mime, ...purposeOpt }),
      () => postJson({ base64, mimeType: mime, ...purposeOpt }),
      () => postJson({ file: base64, mime, ...purposeOpt })
    );
  }
  attempts.push(
    () => postJson({ image: dataUrl, ...purposeOpt }),
    () => postMultipartBinary('file'),
    () => postMultipartBinary('image'),
    () => postMultipartTextImage(dataUrl)
  );

  let lastMsg = `Upload failed`;
  let lastStatus = 0;

  for (const run of attempts) {
    let response: Response;
    let parsed: unknown;
    try {
      ({ response, parsed } = await run());
    } catch (e) {
      lastMsg = e instanceof Error ? e.message : String(e);
      continue;
    }
    lastStatus = response.status;
    lastMsg = extractMsg(parsed) || lastMsg;

    if (!response.ok) continue;

    const out = extractUrlFromUploadBody(parsed);
    if (out) return resolveUploadUrl(out);

    lastMsg = 'Upload response missing url';
  }

  throw new Error(lastMsg || `Upload failed (${lastStatus})`);
}
