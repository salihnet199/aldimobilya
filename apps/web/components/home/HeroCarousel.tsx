'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import styles from './HeroCarousel.module.css';

const SLIDE_DURATION_MS = 6500;

export default function HeroCarousel({ images }: { images: string[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;

    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % images.length);
    }, SLIDE_DURATION_MS);

    return () => clearInterval(id);
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <div className={styles.carousel} aria-hidden="true">
      {images.map((src, i) => (
        <div
          key={src + i}
          className={`${styles.slide} ${i === active ? styles.slideActive : ''}`}
        >
          <Image
            src={src}
            alt=""
            fill
            priority={i === 0}
            unoptimized
            sizes="100vw"
            className={i === active ? styles.kenBurns : ''}
            style={{ objectFit: 'cover' }}
          />
        </div>
      ))}

      {images.length > 1 && (
        <div className={styles.indicators}>
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              className={`${styles.indicator} ${i === active ? styles.indicatorActive : ''}`}
              onClick={() => setActive(i)}
              aria-label={`Görsel ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
