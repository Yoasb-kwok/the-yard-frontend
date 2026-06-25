/**
 * Image upload helper for admin CMS.
 *
 * Calls `POST /api/admin/uploads`. Backend accepts:
 * - multipart/form-data: `file` or `image` (binary) — preferred
 * - JSON: `{ image | dataUrl: "<data URL>" }` or `{ base64, mime }`
 */

import { api, ApiError } from './api';
import { DEFAULT_UPLOAD_COMPRESSION, ensureImageFileMime, normalizeImageFileForUpload } from './imagePrepare';

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

/** Parse data URLs including `data:;base64,...` (empty MIME from FileReader). */
function parseDataUrlParts(
  dataUrl: string,
  fallbackMime: string
): { mime: string; base64: string; normalizedDataUrl: string } | null {
  const match = /^data:([^,]*),(.*)$/s.exec(dataUrl);
  if (!match) return null;
  const meta = match[1] ?? '';
  const payload = match[2] ?? '';
  if (!payload || !meta.includes('base64')) return null;

  const mimePart = meta.split(';')[0]?.trim() ?? '';
  let mime = mimePart.length > 0 ? mimePart : fallbackMime;
  if (!mime.startsWith('image/')) {
    mime = fallbackMime.startsWith('image/') ? fallbackMime : 'image/jpeg';
  }
  return {
    mime,
    base64: payload,
    normalizedDataUrl: `data:${mime};base64,${payload}`,
  };
}

function extractMsg(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.msg === 'string' && obj.msg.trim()) return obj.msg;
  if (typeof obj.message === 'string' && obj.message.trim()) return obj.message;
  return null;
}

function extractUrlFromUploadBody(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  if (obj.success === false) return null;
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

async function readResponseJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/** Resolve a possibly-relative upload URL to an absolute one for `<img src>`. */
export function resolveUploadUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (/^(https?:|data:)/i.test(url)) return url;
  const origin =
    (API_BASE_URL || '').replace(/\/api\/?$/, '') ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  if (!origin) return url;
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

type UploadPayload = { url: string; absolute_url?: string; filename?: string; mime?: string };

/**
 * Upload a file to `/api/admin/uploads`.
 * Returns a URL safe to store and use in `<img src>`.
 */
export async function uploadImage(file: File, purpose?: string): Promise<string> {
  const prepared = ensureImageFileMime(
    await normalizeImageFileForUpload(file, DEFAULT_UPLOAD_COMPRESSION)
  );
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Please log in again before uploading images.');
  }

  const safeFilename =
    typeof prepared.name === 'string' && prepared.name.length > 0
      ? prepared.name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'upload.jpg'
      : 'upload.jpg';

  const dataUrl = await fileToDataUrl(prepared);
  const parsedParts = parseDataUrlParts(dataUrl, prepared.type || 'image/jpeg');
  if (!parsedParts) {
    throw new Error('Failed to read image data for upload.');
  }
  const { mime, base64, normalizedDataUrl } = parsedParts;

  const authHeaders: Record<string, string> = { Authorization: `Bearer ${token}` };
  const uploadUrl = buildUrl('/admin/uploads');
  let lastMsg = 'Upload failed';

  const postMultipart = async (fieldName: 'file' | 'image') => {
    const form = new FormData();
    form.append(fieldName, prepared, safeFilename);
    if (purpose) form.append('purpose', purpose);
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: form,
      headers: authHeaders,
    });
    const parsed = await readResponseJson(response);
    lastMsg = extractMsg(parsed) || lastMsg;
    if (!response.ok) return null;
    const out = extractUrlFromUploadBody(parsed);
    return out ? resolveUploadUrl(out) : null;
  };

  const postJson = async (body: Record<string, unknown>) => {
    const response = await api.post<UploadPayload>('/admin/uploads', body);
    if (!response.success) {
      lastMsg = response.msg || response.message || lastMsg;
      return null;
    }
    const out = extractUrlFromUploadBody(response);
    return out ? resolveUploadUrl(out) : null;
  };

  const attempts: Array<() => Promise<string | null>> = [
    () => postMultipart('file'),
    () => postMultipart('image'),
    () => postJson({ image: normalizedDataUrl }),
    () => postJson({ dataUrl: normalizedDataUrl }),
    () => postJson({ base64, mime }),
  ];

  for (const run of attempts) {
    try {
      const url = await run();
      if (url) return url;
    } catch (err) {
      lastMsg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : String(err);
    }
  }

  throw new Error(lastMsg);
}
