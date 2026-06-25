/**
 * Normalize images before CMS upload / inline storage.
 *
 * - Accepts common mobile quirks (empty MIME, octet-stream + image extension).
 * - Raster formats: decode in-browser, resize long edge, re-encode JPEG to stay under a byte budget.
 * - SVG / GIF: pass through (vector + animation).
 * - HEIC / undecodable: return original file so the server can still try multipart upload.
 */

const IMAGE_NAME_EXT = /\.(jpe?g|png|gif|webp|bmp|heic|heif|avif|tiff?|svg)$/i;

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  heic: 'image/heic',
  heif: 'image/heif',
  avif: 'image/avif',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  svg: 'image/svg+xml',
};

function inferImageMimeFromName(name: string): string | null {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TO_MIME[ext] ?? null;
}

/** Ensure FileReader produces `data:image/...;base64,...` (not `data:;base64,...`). */
export function ensureImageFileMime(file: File): File {
  const type = (file.type || '').toLowerCase();
  if (type.startsWith('image/')) return file;
  const inferred = inferImageMimeFromName(file.name) ?? 'image/jpeg';
  return new File([file], file.name, { type: inferred, lastModified: file.lastModified });
}

export function isLikelyImageFile(file: File): boolean {
  const t = (file.type || '').toLowerCase();
  if (t.startsWith('image/')) return true;
  if (!t && IMAGE_NAME_EXT.test(file.name)) return true;
  if ((t === 'application/octet-stream' || t === 'binary/octet-stream') && IMAGE_NAME_EXT.test(file.name)) {
    return true;
  }
  return false;
}

function baseNameNoExt(name: string): string {
  const s = name.replace(/\.[^.]+$/, '').trim();
  return s || 'image';
}

function rasterizeToJpegFile(file: File, maxEdge: number, quality: number): Promise<File | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || !h) {
        resolve(null);
        return;
      }
      const scale = maxEdge / Math.max(w, h);
      const width = scale < 1 ? Math.max(1, Math.round(w * scale)) : w;
      const height = scale < 1 ? Math.max(1, Math.round(h * scale)) : h;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          resolve(new File([blob], `${baseNameNoExt(file.name)}.jpg`, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

export type NormalizeImageOptions = {
  /** Stop when JPEG output is at or below this size (default 5MB). */
  targetMaxBytes?: number;
  /** Starting long-edge cap in pixels (default 2560). Lower = smaller files, less detail. */
  maxInitialEdge?: number;
};

/** Defaults for `POST /api/admin/uploads` (keep JSON base64 body under typical ~1MB limits). */
export const DEFAULT_UPLOAD_COMPRESSION: Required<
  Pick<NormalizeImageOptions, 'targetMaxBytes' | 'maxInitialEdge'>
> = {
  targetMaxBytes: 750 * 1024,
  maxInitialEdge: 1920,
};

/**
 * Client-side “compressor”: decode raster → resize long edge → JPEG with quality / dimension steps
 * until `targetMaxBytes` (or give up and return original if decode fails).
 * SVG / GIF are not re-encoded. HEIC / exotic types fall back to original when the browser cannot decode.
 */
export async function normalizeImageFileForUpload(
  file: File,
  options?: NormalizeImageOptions
): Promise<File> {
  const withMime = ensureImageFileMime(file);
  if (!isLikelyImageFile(withMime)) return withMime;

  const type = (withMime.type || '').toLowerCase();
  if (type === 'image/svg+xml' || /\.svg$/i.test(withMime.name)) return withMime;
  if (type === 'image/gif' || /\.gif$/i.test(withMime.name)) return withMime;

  const targetMaxBytes = options?.targetMaxBytes ?? 5 * 1024 * 1024;
  let maxEdge = Math.min(4096, Math.max(480, options?.maxInitialEdge ?? 2560));
  let quality = 0.88;

  for (let i = 0; i < 14; i++) {
    const out = await rasterizeToJpegFile(withMime, maxEdge, quality);
    if (!out) return withMime;
    if (out.size <= targetMaxBytes) return out;
    if (quality > 0.36) {
      quality -= 0.07;
      continue;
    }
    maxEdge = Math.max(720, Math.floor(maxEdge * 0.78));
    quality = 0.82;
  }

  const last = await rasterizeToJpegFile(withMime, 720, 0.32);
  return last ?? withMime;
}
