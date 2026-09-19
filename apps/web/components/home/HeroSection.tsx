import Link from 'next/link';
import { getSiteSettings, getWhatsAppHref } from '@/lib/site-settings';
import HeroCarousel from './HeroCarousel';
import styles from './HeroSection.module.css';

const DEFAULT_TITLE = 'Sonsuz Şıklık';
const DEFAULT_SUBTITLE = 'Her tasarım, yaşam alanınıza özgün bir karakter ve rafine bir estetik katar.';

export default async function HeroSection() {
  const settings = await getSiteSettings();
  const { images, autoplay, intervalMs } = settings.heroSlideshow;

  const title = settings.heroTitleTr || DEFAULT_TITLE;
  const subtitle = settings.heroSubtitleTr || DEFAULT_SUBTITLE;

  const words = title.trim().split(/\s+/).filter(Boolean);
  const lastWord = words.length > 0 ? words[words.length - 1] : '';
  const leadWords = words.slice(0, -1).join(' ');

  const hasImages = images.length > 0;
  const whatsappHref = getWhatsAppHref(
    settings.whatsapp,
    'Merhaba, yatak odası tasarımları hakkında bilgi almak istiyorum.',
  );
  const whatsappIsExternal = whatsappHref.startsWith('http');

  return (
    <section className={styles.hero} aria-label="Ana Tanıtım">
      {/* Background Full-Bleed Media Stage across the entire top */}
      <div className={styles.media}>
        {hasImages ? (
          <HeroCarousel images={images} autoplay={autoplay} intervalMs={intervalMs} />
        ) : (
          <div className={styles.gradientFallback} aria-hidden="true" />
        )}
      </div>

      {/* Subtle luxury gradient overlay — gives text contrast without hiding the photography */}
      <div className={styles.overlay} aria-hidden="true" />

      {/* Content */}
      <div className={`container ${styles.content}`}>
        <div className={styles.textBlock}>
          <span className={`caption ${styles.eyebrow}`}>Lüks Yatak Odası & Özel Üretim</span>

          <h1 className={`display-xl ${styles.headline}`}>
            {leadWords && <span className={styles.lineOne}>{leadWords}</span>}
            {lastWord && <span className={styles.lineTwo}>{lastWord}</span>}
          </h1>

          <p className={`body-lg ${styles.sub}`}>{subtitle}</p>

          <div className={styles.ctas}>
            <Link href="/katalog" className="btn btn-gold" data-magnetic>
              Koleksiyonu Keşfet
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </Link>
            <a
              href={whatsappHref}
              {...(whatsappIsExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="btn btn-outline"
              data-magnetic
            >
              WhatsApp ile Bilgi Al
            </a>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className={styles.scrollIndicator} aria-hidden="true">
          <span className={styles.scrollLine} />
          <span className={`caption ${styles.scrollLabel}`}>Kaydır</span>
        </div>
      </div>

      {/* Decorative subtle bottom fade */}
      <div className={styles.bottomFade} aria-hidden="true" />
    </section>
  );
}
