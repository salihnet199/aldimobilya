'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from './HeroSection.module.css';

export default function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // autoplay blocked — video stays on first frame
      });
    }
  }, []);

  return (
    <section className={styles.hero} aria-label="Ana Tanıtım">
      {/* Background Video / Image */}
      <div className={styles.media}>
        {/* When a real video is available, replace the src below */}
        {/* <video
          ref={videoRef}
          className={styles.video}
          src="/hero-video.mp4"
          muted
          loop
          playsInline
          preload="metadata"
          poster="/hero-poster.jpg"
        /> */}
        {/* Fallback gradient until real media is added */}
        <div className={styles.gradientFallback} aria-hidden="true" />
      </div>

      {/* Gradient Overlay */}
      <div className={styles.overlay} aria-hidden="true" />

      {/* Content */}
      <div className={`container ${styles.content}`}>
        <div className={styles.textBlock}>
          {/* Eyebrow */}
          <span className={`caption text-gold ${styles.eyebrow}`}>
            Lüks Yatak Odası Tasarımları
          </span>

          {/* Headline */}
          <h1 className={`display-xl ${styles.headline}`}>
            <span className={styles.lineOne}>Sonsuz</span>
            <span className={`text-gold ${styles.lineTwo}`}>Şıklık</span>
          </h1>

          {/* Sub */}
          <p className={`body-lg ${styles.sub}`}>
            Her tasarım, yaşam alanınıza özgün bir karakter ve rafine bir estetik katar.
          </p>

          {/* CTAs */}
          <div className={styles.ctas}>
            <Link href="/katalog" className="btn btn-gold">
              Koleksiyonu Keşfet
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </Link>
            <a
              href="https://wa.me/905000000000"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              WhatsApp ile Bilgi Al
            </a>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className={styles.scrollIndicator} aria-hidden="true">
          <span className={styles.scrollLine} />
          <span className={`caption text-muted ${styles.scrollLabel}`}>Kaydır</span>
        </div>
      </div>

      {/* Decorative bottom gradient */}
      <div className={styles.bottomFade} aria-hidden="true" />
    </section>
  );
}
