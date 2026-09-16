/**
 * Shared client-side upload helpers for the admin panel.
 *
 * Upload contract — must stay in sync with the admin API routes:
 *
 *   GET  /api/upload/sign?folder=<folder>&kind=<image|video>
 *        -> { signature, apiKey, cloudName, endpoint, resourceType, params }
 *           `params` is the complete set of signed fields; the browser must send
 *           exactly those fields plus `file`, `api_key` and `signature`.
 *   POST <endpoint>   (direct, signed; endpoint is kind-specific:
 *                      .../<cloudName>/image/upload or .../video/upload)
 *        -> { secure_url, public_id }
 *   POST /api/upload?kind=<image|video>   (server fallback, multipart: `file` + `folder`)
 *        -> { url, publicId, width?, height?, format?, resourceType? }
 *
 * The direct flow is kept for large videos (it bypasses the platform request
 * body limit); the server route is the validated fallback.
 */

export interface UploadedMedia {
  url: string;
  publicId: string;
}

export type UploadKind = 'image' | 'video';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

// Mirrors the allowlists enforced by /api/upload (lib/validation.ts).
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/** Returns a Turkish rejection message, or `null` when the image may be uploaded. */
export function validateImageFile(file: File): string | null {
  if (!IMAGE_MIME_TYPES.includes(file.type.toLowerCase())) {
    return `${file.name}: yalnızca JPG, PNG, WebP, AVIF veya GIF yükleyebilirsiniz.`;
  }
  if (file.size === 0) return `${file.name}: dosya boş görünüyor.`;
  if (file.size > MAX_IMAGE_BYTES) {
    return `${file.name}: görsel boyutu ${formatBytes(MAX_IMAGE_BYTES)} sınırını aşıyor (${formatBytes(file.size)}).`;
  }
  return null;
}

/** Returns a Turkish rejection message, or `null` when the video may be uploaded. */
export function validateVideoFile(file: File): string | null {
  if (!VIDEO_MIME_TYPES.includes(file.type.toLowerCase())) {
    return `${file.name}: yalnızca MP4, MOV veya WebM yükleyebilirsiniz.`;
  }
  if (file.size === 0) return `${file.name}: dosya boş görünüyor.`;
  if (file.size > MAX_VIDEO_BYTES) {
    return `${file.name}: video boyutu ${formatBytes(MAX_VIDEO_BYTES)} sınırını aşıyor (${formatBytes(file.size)}).`;
  }
  return null;
}

/** Kind-aware client pre-check. */
export function validateFileForKind(file: File, kind: UploadKind): string | null {
  return kind === 'image' ? validateImageFile(file) : validateVideoFile(file);
}

const MAX_URL_LENGTH = 2048;
const CONTROL_OR_TAG_CHARS = /[\u0000-\u001f\u007f<>"']/;

/**
 * Secure media link check — mirrors `isSafeMediaUrl` on the server: only
 * absolute `https://` URLs and root-relative `/...` paths are accepted, with no
 * control characters or HTML/tag characters. This is deliberately not
 * restricted to a single host so existing stored media (any https host, or a
 * root-relative path) keeps working.
 */
export function isSafeMediaUrl(value: string): boolean {
  if (typeof value !== 'string') return false;

  const url = value.trim();
  if (!url || url.length > MAX_URL_LENGTH) return false;
  if (CONTROL_OR_TAG_CHARS.test(url)) return false;

  if (url.startsWith('/')) return !url.startsWith('//') && !url.startsWith('/\\');
  if (url.includes('\\')) return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

/**
 * Validates the URL a provider/server upload actually returned before it is
 * handed to the form. A response URL must be an absolute `https://` URL — a
 * root-relative path is fine for stored media but never for a fresh upload.
 */
export function isSafeUploadResponseUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  const url = value.trim();
  if (!url || url.startsWith('/')) return false;
  if (!isSafeMediaUrl(url)) return false;

  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

/** Reads the `error` field of a failed JSON response without throwing on a non-JSON body. */
export async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: unknown };
    if (typeof data.error === 'string' && data.error.trim()) return data.error;
  } catch {
    // body was empty or not JSON — fall through to the generic message
  }
  return `${fallback} (HTTP ${res.status})`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Parsed `/api/upload/sign` payload: the signed fields plus what to send them with. */
export interface DirectUploadTicket {
  signature: string;
  apiKey: string;
  endpoint: string;
  params: Record<string, string>;
}

/**
 * Parses the signature response. Returns `null` for anything that would produce
 * an unusable or unsafe direct upload (missing signature, non-https endpoint,
 * empty signed params, or a payload that does not pin the folder/timestamp).
 */
export function parseSignResponse(data: unknown): DirectUploadTicket | null {
  const record = asRecord(data);
  if (!record) return null;

  const { signature, apiKey, endpoint } = record;
  if (typeof signature !== 'string' || !signature) return null;
  if (typeof apiKey !== 'string' || !apiKey) return null;
  if (typeof endpoint !== 'string' || !endpoint.startsWith('https://')) return null;

  const rawParams = asRecord(record.params);
  if (!rawParams) return null;

  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawParams)) {
    if (typeof value === 'string' && value !== '') params[key] = value;
  }

  // A ticket without the signed folder/timestamp is incomplete: refuse it
  // rather than posting a partial (and therefore invalid) signature.
  if (!params.folder || !params.timestamp) return null;

  return { signature, apiKey, endpoint, params };
}

/**
 * Builds the direct-upload multipart body: the file, the credentials and the
 * complete set of signed params — echoed verbatim and with nothing added, so
 * the signature Cloudinary recomputes matches the one we were given.
 */
export function buildSignedUploadForm(
  file: File,
  apiKey: string,
  signature: string,
  params: Record<string, unknown>,
): FormData {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('api_key', apiKey);
  fd.append('signature', signature);

  for (const [key, value] of Object.entries(params)) {
    if (typeof value !== 'string') continue;
    fd.append(key, value);
  }

  return fd;
}

export async function uploadMedia(
  file: File,
  folder: string,
  kind: UploadKind,
): Promise<UploadedMedia> {
  const rejection = validateFileForKind(file, kind);
  if (rejection) throw new Error(rejection);

  let directError: unknown = null;

  // 1. Direct signed upload to Cloudinary — bypasses the platform request body
  //    limit and is required for videos.
  try {
    const signRes = await fetch(
      `/api/upload/sign?folder=${encodeURIComponent(folder)}&kind=${encodeURIComponent(kind)}`,
    );

    if (signRes.ok) {
      const ticket = parseSignResponse(await signRes.json().catch(() => null));
      if (!ticket) throw new Error('Yükleme imzası geçersiz.');

      const cloudRes = await fetch(ticket.endpoint, {
        method: 'POST',
        body: buildSignedUploadForm(file, ticket.apiKey, ticket.signature, ticket.params),
      });

      const cloudData: unknown = await cloudRes.json().catch(() => null);
      const secureUrl = asRecord(cloudData)?.secure_url;

      if (cloudRes.ok && isSafeUploadResponseUrl(secureUrl)) {
        const publicId = asRecord(cloudData)?.public_id;
        return { url: secureUrl, publicId: typeof publicId === 'string' ? publicId : '' };
      }

      const providerMessage = asRecord(asRecord(cloudData)?.error)?.message;
      directError = new Error(
        typeof providerMessage === 'string' && providerMessage
          ? providerMessage
          : `Cloudinary yüklemesi başarısız (HTTP ${cloudRes.status}).`,
      );
    } else {
      directError = new Error(await readErrorMessage(signRes, 'Yükleme imzası alınamadı'));
    }
  } catch (err) {
    directError = err;
  }

  // 2. Fallback: internal Next.js API route (server-side Cloudinary upload).
  try {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', folder);

    const res = await fetch(`/api/upload?kind=${encodeURIComponent(kind)}`, {
      method: 'POST',
      body: fd,
    });
    if (!res.ok) throw new Error(await readErrorMessage(res, `${file.name} yüklenemedi`));

    const data: unknown = await res.json();
    const url = asRecord(data)?.url;
    if (!isSafeUploadResponseUrl(url)) {
      throw new Error(`${file.name} yüklenemedi: sunucu geçerli bir adres döndürmedi.`);
    }

    const publicId = asRecord(data)?.publicId;
    return { url, publicId: typeof publicId === 'string' ? publicId : '' };
  } catch (fallbackError) {
    const directMessage = directError instanceof Error ? directError.message : String(directError);
    const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
    throw new Error(`${file.name} yüklenemedi. ${directMessage} — ${fallbackMessage}`);
  }
}
