'use client';

import ImageUploader, { type UploadedImage } from './ImageUploader';
import {
  HERO_INTERVAL_MAX_SECONDS,
  HERO_INTERVAL_MIN_SECONDS,
  HERO_MAX_IMAGES,
  type HeroSlideshowSettings,
} from './heroSettings';
import styles from './HeroSlideshowEditor.module.css';

interface Props {
  value: HeroSlideshowSettings;
  onChange: (next: HeroSlideshowSettings) => void;
}

export default function HeroSlideshowEditor({ value, onChange }: Props) {
  // The image URL doubles as a stable key so reordering does not remount thumbnails.
  const images: UploadedImage[] = value.images.map((url) => ({ url, publicId: url }));
  const intervalSeconds = value.intervalMs / 1000;
  const intervalLabel = Number.isInteger(intervalSeconds)
    ? String(intervalSeconds)
    : intervalSeconds.toFixed(1);

  return (
    <div className={styles.root}>
      <ImageUploader
        value={images}
        onChange={(next) => onChange({ ...value, images: next.map((img) => img.url) })}
        folder="aldimobilya/hero"
        maxFiles={HERO_MAX_IMAGES}
        reorderable
      />

      <div className={styles.controls}>
        <label className="toggle" htmlFor="hero-autoplay">
          <input
            id="hero-autoplay"
            type="checkbox"
            checked={value.autoplay}
            onChange={(e) => onChange({ ...value, autoplay: e.target.checked })}
          />
          <span className="toggle-track" aria-hidden="true" />
          <span className="toggle-label">Otomatik geçiş (autoplay)</span>
        </label>

        <div className={styles.intervalRow}>
          <label className="admin-label" htmlFor="hero-interval">
            Geçiş süresi
          </label>
          <input
            id="hero-interval"
            className={styles.range}
            type="range"
            min={HERO_INTERVAL_MIN_SECONDS}
            max={HERO_INTERVAL_MAX_SECONDS}
            step={0.5}
            value={intervalSeconds}
            disabled={!value.autoplay}
            onChange={(e) => onChange({ ...value, intervalMs: Number(e.target.value) * 1000 })}
          />
          <span className={styles.intervalValue}>{intervalLabel} sn</span>
        </div>

        <p className={styles.hint}>
          {value.autoplay
            ? `Görseller ${intervalLabel} saniyede bir otomatik geçer.`
            : 'Otomatik geçiş kapalı; ziyaretçiler slaytları kendisi geçer.'}
          {' '}
          En fazla {HERO_MAX_IMAGES} görsel ({value.images.length}/{HERO_MAX_IMAGES}). Sıralama görüntülenme sırasıdır.
        </p>
      </div>
    </div>
  );
}
