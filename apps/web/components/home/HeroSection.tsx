import Link from 'next/link';
import { prisma } from '@aldimobilya/db';
import HeroCarousel from './HeroCarousel';
import styles from './HeroSection.module.css';

const DEFAULT_TITLE = 'Sonsuz Şıklık';
const DEFAULT_SUBTITLE = 'Her tasarım, yaşam alanınıza özgün bir karakter ve rafine bir estetik katar.';

async function getHeroContent() {
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'main' } });
    const heroImages = Array.isArray(settings?.heroImages) ? (settings.heroImages as string[]) : [];
    return {
      title: settings?.heroTitleTr || DEFAULT_TITLE,
      subtitle: settings?.heroSubtitleTr || DEFAULT_SUBTITLE,
      images: heroImages,
    };
  } catch (err) {
    console.error('getHeroContent error:', err);
    return { title: DEFAULT_TITLE, subtitle: DEFAULT_SUBTITLE, images: [] as string[] };
  }
}

export default async function HeroSection() {
  const { title, subtitle, images } = await getHeroContent();

  // Split into two lines for the signature two-tone headline treatment:
  // everything but the last word in white, the last word in gold italic.
  const words = title.trim().split(/\s+/);
  const lineTwo = words.length > 1 ? words.pop()! : words[0];
  const lineOne = words.length > 0 ? words.join(' ') : '';

  return (
    <section className={styles.hero} aria-label="Ana Tanıtım">
      {/* Background Media */}
      <div className={styles.media}>
        {images.length > 0 ? (
          <HeroCarousel images={images} />
        ) : (
          <div className={styles.gradientFallback} aria-hidden="true" />
        )}
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
            {lineOne && <span className={styles.lineOne}>{lineOne}</span>}
            <span className={`text-gold ${styles.lineTwo}`}>{lineTwo}</span>
          </h1>

          {/* Sub */}
          <p className={`body-lg ${styles.sub}`}>{subtitle}</p>

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
