'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from './MediaPlayer.module.css';
import { imageProps, safeMediaHref } from '@/lib/media';

export interface MediaPlayerProps {
  /** Stored video URL: direct file (Cloudinary/mp4/webm) or YouTube/Vimeo page link. */
  url: string;
  /** Human readable title, used for accessible labels. */
  title: string;
  /** Optional poster image shown before playback. */
  thumbnail?: string | null;
  className?: string;
}

type MediaSource =
  | { kind: 'embed'; provider: 'youtube' | 'vimeo'; embedUrl: string }
  | { kind: 'file'; fileUrl: string };

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{6,12}$/;
const VIDEO_EXT = /\.(mp4|m4v|webm|ogv|ogg|mov)$/i;

/** Parses a URL and rejects anything that is not http(s). */
function safeUrl(value: string): URL | null {
  try {
    const safe = safeMediaHref(value);
    if (!safe || safe.startsWith('/')) return null;
    return new URL(safe);
  } catch {
    return null;
  }
}

function extractYouTubeId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./i, '').toLowerCase();

  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0];
    return id && YOUTUBE_ID.test(id) ? id : null;
  }

  if (
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'music.youtube.com' ||
    host === 'youtube-nocookie.com'
  ) {
    const fromQuery = url.searchParams.get('v');
    if (fromQuery && YOUTUBE_ID.test(fromQuery)) return fromQuery;

    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length >= 2 && ['embed', 'shorts', 'v', 'live'].includes(parts[0])) {
      return YOUTUBE_ID.test(parts[1]) ? parts[1] : null;
    }
  }

  return null;
}

function extractVimeoId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./i, '').toLowerCase();
  if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return null;

  const parts = url.pathname.split('/').filter(Boolean);
  const candidate = parts[0] === 'video' ? parts[1] : parts[0];
  return candidate && VIMEO_ID.test(candidate) ? candidate : null;
}

/**
 * Safely parses a stored video URL into a known playback source.
 * Unknown or invalid URLs return null so the UI can degrade gracefully.
 */
export function parseMediaSource(rawUrl: string): MediaSource | null {
  const url = safeUrl(rawUrl);
  if (!url) return null;

  const youtubeId = extractYouTubeId(url);
  if (youtubeId) {
    return {
      kind: 'embed',
      provider: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1`,
    };
  }

  const vimeoId = extractVimeoId(url);
  if (vimeoId) {
    return {
      kind: 'embed',
      provider: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
    };
  }

  const isCloudinaryVideo =
    url.hostname === 'res.cloudinary.com' && url.pathname.includes('/video/upload/');

  if (VIDEO_EXT.test(url.pathname) || isCloudinaryVideo) {
    return { kind: 'file', fileUrl: url.toString() };
  }

  return null;
}

export default function MediaPlayer({
  url,
  title,
  thumbnail,
  className,
}: MediaPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const source = parseMediaSource(url);
  const wrapperClass = [styles.player, className].filter(Boolean).join(' ');
  const fallbackHref = safeMediaHref(url);

  if (!source) {
    return (
      <div className={`${wrapperClass} ${styles.fallback}`}>
        <p className={styles.fallbackText}>Bu video şu anda oynatılamıyor.</p>
        {fallbackHref && (
          <a
            href={fallbackHref}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.fallbackLink}
          >
            Bağlantıyı yeni sekmede aç
          </a>
        )}
      </div>
    );
  }

  if (source.kind === 'file') {
    return (
      <div className={wrapperClass}>
        <video
          className={styles.video}
          controls
          playsInline
          preload="none"
          poster={safeMediaHref(thumbnail) ?? undefined}
          aria-label={title}
        >
          <source src={source.fileUrl} />
          Tarayıcınız video oynatmayı desteklemiyor.
        </video>
      </div>
    );
  }

  if (playing) {
    const separator = source.embedUrl.includes('?') ? '&' : '?';
    return (
      <div className={wrapperClass}>
        <iframe
          className={styles.frame}
          src={`${source.embedUrl}${separator}autoplay=1`}
          title={`${title} videosu`}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <button
        type="button"
        className={styles.playButton}
        onClick={() => setPlaying(true)}
        aria-label={`${title} videosunu oynat`}
      >
        {thumbnail ? (
          <Image
            className={styles.poster}
            {...imageProps(thumbnail)}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <span className={styles.posterFallback} aria-hidden="true" />
        )}
        <span className={styles.playIcon} aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </button>
    </div>
  );
}
