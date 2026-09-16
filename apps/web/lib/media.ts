const CONTROL_CHARS = /[\u0000-\u001f\u007f\\<>"']/;

/** Only safe browser media locations. Never proxy arbitrary hosts server-side. */
export function safeMediaHref(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw || raw.length > 2048 || CONTROL_CHARS.test(raw)) return null;
  if (raw.startsWith('/')) return raw.startsWith('//') ? null : raw;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

/** Cloudinary/local files get responsive optimization; legacy HTTPS hosts stay usable. */
export function imageProps(value: string): { src: string; unoptimized: boolean } {
  const src = safeMediaHref(value) ?? '/logo.jpg';
  const cloudinary = src.startsWith('https://res.cloudinary.com/');
  return { src, unoptimized: !(src.startsWith('/') || cloudinary) };
}
