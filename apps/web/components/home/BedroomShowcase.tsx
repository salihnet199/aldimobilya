'use client';

import { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { imageProps } from '@/lib/media';
import { getWhatsAppHref } from '@/lib/site-settings';
import type { RoomSpecs } from '@aldimobilya/types';
import styles from './BedroomShowcase.module.css';

export interface BedroomShowcaseRoom {
  id: string;
  slug: string;
  nameTr: string | null;
  nameEn: string | null;
  descTr: string | null;
  descEn: string | null;
  heroImage: string | null;
  category: string | null;
  specs: unknown;
  images: { id: string; url: string; alt?: string | null }[];
}

interface BedroomShowcaseProps {
  rooms: BedroomShowcaseRoom[];
  whatsappNumber?: string | null;
}

export default function BedroomShowcase({ rooms, whatsappNumber }: BedroomShowcaseProps) {
  const [activeRoomIdx, setActiveRoomIdx] = useState(0);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  // Rotate between models
  const currentRoom = rooms[activeRoomIdx] || rooms[0];

  // Collect all photos for current room
  const photos: string[] = [];
  const seen = new Set<string>();
  if (currentRoom?.heroImage) {
    seen.add(currentRoom.heroImage);
    photos.push(currentRoom.heroImage);
  }
  currentRoom?.images?.forEach((img) => {
    if (img.url && !seen.has(img.url)) {
      seen.add(img.url);
      photos.push(img.url);
    }
  });

  const activePhoto = photos[activePhotoIdx] || photos[0] || '';
  const displayName = currentRoom?.nameTr || currentRoom?.nameEn || 'Lüks Yatak Odası';
  const displayDesc =
    currentRoom?.descTr ||
    currentRoom?.descEn ||
    'İnegöl zanaatkarlarımızın el işçiliğiyle hazırlanan seçkin yatak odası takımı. Geniş depolama alanı, sessiz fren mekanizmaları ve asil detaylar.';

  const specs = (currentRoom?.specs as RoomSpecs | null) ?? {};

  // Check reduced motion
  const reducedMotion = useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  );

  // Handle ESC key for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    if (isFullscreen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // Reset photo index when room changes
  const selectRoom = (idx: number) => {
    setActiveRoomIdx(idx);
    setActivePhotoIdx(0);
  };

  // Touch swipe support for mobile
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    if (Math.abs(deltaX) > 35 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
      if (deltaX < 0 && photos.length > 1) {
        setActivePhotoIdx((prev) => (prev + 1) % photos.length);
      } else if (deltaX > 0 && photos.length > 1) {
        setActivePhotoIdx((prev) => (prev - 1 + photos.length) % photos.length);
      }
    }
  };

  // Autoplay slideshow so bedroom models animate and move automatically like the hero
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying || reducedMotion || photos.length <= 1) return;
    const timer = setInterval(() => {
      setActivePhotoIdx((prev) => (prev + 1) % photos.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [isPlaying, reducedMotion, photos.length]);

  const nextPhoto = () => {
    if (photos.length > 1) {
      setActivePhotoIdx((prev) => (prev + 1) % photos.length);
    }
  };

  const prevPhoto = () => {
    if (photos.length > 1) {
      setActivePhotoIdx((prev) => (prev - 1 + photos.length) % photos.length);
    }
  };

  const whatsappHref = getWhatsAppHref(
    whatsappNumber,
    `Merhaba, Lüks Yatak Odası koleksiyonunuzdaki "${displayName}" modeli hakkında detaylı bilgi ve fiyat almak istiyorum.`,
  );
  const whatsappIsExternal = whatsappHref.startsWith('http');

  if (!rooms || rooms.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="bedroom-showcase-heading">
      <div className={styles.ambientGlow} aria-hidden="true" />

      <div className="container">
        {/* Section Header */}
        <div className={styles.header}>
          <div className={styles.eyebrow}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Seçkin Koleksiyon
          </div>
          <h2 id="bedroom-showcase-heading" className={styles.title}>
            Lüks Yatak Odası <span className={styles.titleGold}>Serisi</span>
          </h2>
          <div className="gold-line gold-line-center" style={{ margin: '16px auto 0' }} />
          <p className={styles.subtitle}>
            Tüm açıları ve zarafetiyle tam boyutta keşfedin. Hiçbir detay kırpılmadan,
            özgün el işçiliği ve üstün malzeme kalitesiyle yaşam alanınıza değer katın.
          </p>
        </div>

        {/* Room Switcher Tabs */}
        {rooms.length > 1 && (
          <div className={styles.modelSelector} role="tablist" aria-label="Yatak Odası Modelleri">
            {rooms.map((room, idx) => (
              <button
                key={room.id}
                type="button"
                role="tab"
                aria-selected={idx === activeRoomIdx}
                className={`${styles.modelTab} ${idx === activeRoomIdx ? styles.modelTabActive : ''}`}
                onClick={() => selectRoom(idx)}
              >
                {room.nameTr || room.nameEn || `Model ${idx + 1}`}
              </button>
            ))}
          </div>
        )}

        {/* Master Presentation Stage */}
        <div
          ref={stageRef}
          className={styles.stage}
          onMouseEnter={() => setIsPlaying(false)}
          onMouseLeave={() => setIsPlaying(true)}
        >
          {/* ZERO-CROP Image Viewport */}
          <div
            className={styles.viewport}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Zero Crop Badge */}
            <div className={styles.zeroCropBadge}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
              <span>Tam Boyut • Sıfır Kırpma</span>
            </div>

            {/* Expand Fullscreen Button */}
            <button
              type="button"
              className={styles.expandBtn}
              onClick={() => setIsFullscreen(true)}
              aria-label="Fotoğrafı tam ekranda yüksek çözünürlükle incele"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
              <span>Büyüt & İncele</span>
            </button>

            {/* Atmospheric Ambient Backdrop (Fills space with matching room lighting) */}
            <AnimatePresence mode="sync">
              <motion.div
                key={`bg-${activePhoto}`}
                className={styles.ambientBackdrop}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.35 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.0, ease: [0.25, 1, 0.5, 1] }}
                aria-hidden="true"
              >
                {activePhoto && (
                  <Image
                    {...imageProps(activePhoto)}
                    alt=""
                    fill
                    sizes="60vw"
                    style={{ objectFit: 'cover' }}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Crisp Zero-Crop Foreground Image */}
            <div className={styles.heroImageWrapper}>
              <AnimatePresence mode="sync">
                <motion.div
                  key={`hero-${activePhoto}`}
                  style={{ width: '100%', height: '100%', position: 'relative' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: reducedMotion ? 0.3 : 1.0,
                    ease: [0.25, 1, 0.5, 1],
                  }}
                >
                  {activePhoto && (
                    <Image
                      {...imageProps(activePhoto)}
                      alt={`${displayName} — Tam Boyut Görünüm`}
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 65vw"
                      className={styles.containedImage}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Viewport Prev / Next Navigation Arrows */}
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  className={`${styles.navBtn} ${styles.navBtnPrev}`}
                  onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                  aria-label="Önceki açı"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`${styles.navBtn} ${styles.navBtnNext}`}
                  onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                  aria-label="Sonraki açı"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </>
            )}

            {/* Angle Navigation Thumbnails Strip */}
            {photos.length > 1 && (
              <div className={styles.anglesStrip} role="tablist" aria-label="Fotoğraf Açıları">
                {photos.map((url, pIdx) => (
                  <button
                    key={url + pIdx}
                    type="button"
                    role="tab"
                    aria-selected={pIdx === activePhotoIdx}
                    className={`${styles.angleThumb} ${pIdx === activePhotoIdx ? styles.angleThumbActive : ''}`}
                    onClick={() => setActivePhotoIdx(pIdx)}
                    aria-label={`${pIdx + 1}. açıyı göster`}
                  >
                    <Image
                      {...imageProps(url)}
                      alt=""
                      fill
                      sizes="44px"
                      style={{ objectFit: 'cover' }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info & Commercial Sidebar */}
          <div className={styles.sidebar}>
            <div>
              <div className={styles.modelCategory}>Lüks Yatak Odası Koleksiyonu</div>
              <h3 className={styles.modelName}>{displayName}</h3>
              <p className={styles.modelDesc}>{displayDesc}</p>

              {/* Technical Specifications */}
              <div className={styles.specsGrid}>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Üretim Yeri</span>
                  <span className={styles.specValue}>İnegöl / Bursa</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>İskelet & Malzeme</span>
                  <span className={styles.specValue}>{specs.material || '1. Sınıf Masif & MDF'}</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Garanti / Standart</span>
                  <span className={styles.specValue}>{specs.warranty || '2 Yıl ALDi Mobilya Garantisi'}</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Özel Üretim</span>
                  <span className={styles.specValue}>{specs.dimensions ? `Ölçü: ${specs.dimensions}` : 'Özel Ölçü & Kumaş Seçeneği'}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className={styles.actionsRow}>
              <Link href={`/katalog/${currentRoom.slug}`} className={styles.detailsBtn}>
                <span>Model Detayları & Tüm Resimler</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <a
                href={whatsappHref}
                {...(whatsappIsExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className={styles.whatsappBtn}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.52 3.48A11.93 11.93 0 0 0 12.06 0C5.46 0 .09 5.37.09 11.97c0 2.11.55 4.17 1.6 6L0 24l6.2-1.63a11.96 11.96 0 0 0 5.86 1.51h.01c6.6 0 11.97-5.37 11.97-11.97 0-3.2-1.25-6.21-3.52-8.43zm-8.46 18.36h-.01a9.93 9.93 0 0 1-5.06-1.39l-.36-.22-3.76.99 1-3.66-.24-.38a9.92 9.92 0 0 1-1.52-5.21c0-5.48 4.46-9.94 9.95-9.94 2.65 0 5.15 1.03 7.03 2.91a9.88 9.88 0 0 1 2.91 7.03c0 5.48-4.46 9.94-9.94 9.94zm5.45-7.44c-.3-.15-1.77-.87-2.04-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.95 1.17-.18.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.07-.15-.68-1.63-.93-2.23-.24-.59-.49-.51-.68-.52h-.58c-.2 0-.53.07-.8.38-.28.3-1.05 1.03-1.05 2.51 0 1.48 1.08 2.91 1.23 3.11.15.2 2.13 3.25 5.16 4.56.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.18-1.42-.08-.13-.28-.2-.58-.35z" />
                </svg>
                <span>WhatsApp Bilgi</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen High-Resolution Inspection Modal */}
      {isFullscreen && (
        <div className={styles.modalBackdrop} onClick={() => setIsFullscreen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.modalCloseBtn}
              onClick={() => setIsFullscreen(false)}
              aria-label="Kapat"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <Image
                {...imageProps(activePhoto)}
                alt={`${displayName} — Yüksek Çözünürlük Tam Görünüm`}
                fill
                sizes="100vw"
                style={{ objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
