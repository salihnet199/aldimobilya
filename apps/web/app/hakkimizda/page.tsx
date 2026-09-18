import type { Metadata } from 'next';
import Link from 'next/link';
import { getSiteSettings, getWhatsAppHref } from '@/lib/site-settings';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Hakkımızda',
  description: 'ALDi Mobilya — Lüks yatak odası mobilyasında zarafet, el işçiliği ve üstün kalite standardı.',
};

// The page is static copy plus the admin-managed contact link; ISR is enough.
export const revalidate = 300;

export default async function AboutPage() {
  const settings = await getSiteSettings();
  const whatsappHref = getWhatsAppHref(
    settings.whatsapp,
    'Merhaba, hakkınızda daha fazla bilgi almak istiyorum.',
  );

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className="container">
          <span className="section-eyebrow">Kurumsal</span>
          <h1 className="display-lg">Hakkımızda</h1>
          <div className="gold-line" />
          <p className="body-lg text-muted" style={{ maxWidth: 540 }}>
            ALDi Mobilya, modern tasarım vizyonu ile geleneksel el işçiliğini bir araya getirerek lüks yatak odası tasarımları üretir.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container section">
        <div className={styles.storyGrid}>
          <div className={styles.storyText}>
            <span className="section-eyebrow">Hikayemiz & Vizyonumuz</span>
            <h2 className="display-md" style={{ marginBottom: 'var(--space-4)' }}>
              Her Detayda <em className="text-gold">Mükemmellik</em> Arayışı
            </h2>
            <div className="gold-line" />
            <p className="body-lg text-muted" style={{ marginBottom: 'var(--space-6)' }}>
              ALDi Mobilya olarak, bir yatak odasının sadece bir dinlenme alanı değil; huzur, zarafet ve kişisel zevkin en özel yansıması olduğuna inanıyoruz.
            </p>
            <p className="body-md text-muted" style={{ marginBottom: 'var(--space-6)' }}>
              Tasarım aşamasından nihai montaja kadar her aşamada birinci sınıf malzemeler, dayanıklı mekanizmalar ve usta el işçiliği kullanıyoruz. Amacımız, müşterilerimize nesiller boyu güvenle kullanabilecekleri benzersiz yaşam alanları sunmaktır.
            </p>
            <p className="body-md text-muted" style={{ marginBottom: 'var(--space-8)' }}>
              Müşterilerimizin taleplerine göre özel ölçü ve model uyarlamaları yaparak hayallerindeki yatak odasını gerçeğe dönüştürüyoruz.
            </p>

            <div className={styles.actions}>
              <Link href="/katalog" className="btn btn-gold">
                Koleksiyonu İncele
              </Link>
              <a
                href={whatsappHref}
                {...(whatsappHref.startsWith('http')
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
                className="btn btn-outline"
              >
                Bizimle İletişime Geçin
              </a>
            </div>
          </div>

          <div className={styles.statsCards}>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>%100</span>
              <span className={styles.statLabel}>Özgün Tasarım & Kalite</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>Özel</span>
              <span className={styles.statLabel}>Ölçü & İsteğe Bağlı Üretim</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>Uzman</span>
              <span className={styles.statLabel}>Zanaatkar El İşçiliği</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
