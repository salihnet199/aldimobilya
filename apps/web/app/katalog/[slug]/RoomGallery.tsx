'use client';

import { useId, useState } from 'react';
import Image from 'next/image';
import styles from './RoomGallery.module.css';

export interface GalleryImage {
  id: string;
  url: string;
  alt?: string | null;
}

interface RoomGalleryProps {
  images: GalleryImage[];
  name: string;
}

export default function RoomGallery({ images, name }: RoomGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const baseId = useId();

  if (images.length === 0) return null;

  const safeIndex = Math.min(activeIndex, images.length - 1);
  const active = images[safeIndex];

  return (
    <div className={styles.gallery}>
      <div id={`${baseId}-main`} className={styles.mainImage}>
        <Image
          src={active.url}
          alt={active.alt || name}
          width={900}
          height={650}
          priority
          unoptimized
          style={{ objectFit: 'cover' }}
        />
      </div>

      {images.length > 1 && (
        <div className={styles.thumbs} role="group" aria-label={`${name} görsel galerisi`}>
          {images.map((img, index) => {
            const isActive = index === safeIndex;
            return (
              <button
                key={img.id}
                type="button"
                className={`${styles.thumb} ${isActive ? styles.thumbActive : ''}`}
                onClick={() => setActiveIndex(index)}
                aria-label={`${img.alt || name} — görsel ${index + 1}`}
                aria-pressed={isActive}
                aria-controls={`${baseId}-main`}
              >
                <Image
                  src={img.url}
                  alt=""
                  width={180}
                  height={130}
                  unoptimized
                  style={{ objectFit: 'cover' }}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
