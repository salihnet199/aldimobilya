import Link from 'next/link';
import styles from './AboutSnippet.module.css';

const values = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    title: 'Kalite Güvencesi',
    desc: 'Her ürün, titiz kalite kontrol süreçlerinden geçerek size ulaşır.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
      </svg>
    ),
    title: 'Özgün Tasarım',
    desc: 'Estetik ve fonksiyonelliği bir araya getiren özgün tasarım anlayışı.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m14.5 10 5.5-5.5-5.5-5.5"/>
        <path d="M20 4.5H9.5a7 7 0 1 0 0 14H13"/>
      </svg>
    ),
    title: 'Üstün İşçilik',
    desc: 'Deneyimli ustalar tarafından özenle işlenen her detay, mükemmelliği yansıtır.',
  },
];

export default function AboutSnippet() {
  return (
    <section className={`section ${styles.section}`} aria-labelledby="about-heading">
      <div className="container">
        <div className={styles.grid}>
          {/* Text Side */}
          <div className={styles.textSide}>
            <span className="section-eyebrow">Hakkımızda</span>
            <h2 id="about-heading" className="display-md" style={{ marginBottom: 'var(--space-3)' }}>
              Lüksü Yaşam<br />
              <em className="text-gold">Alanınıza</em> Taşıyoruz
            </h2>
            <div className="gold-line" />
            <p className="body-lg text-muted" style={{ marginBottom: 'var(--space-6)' }}>
              ALDi Mobilya olarak, yılların deneyimi ve uzmanlığıyla lüks yatak odası tasarımları üretiyoruz.
              Her koleksiyonumuz, seçkin malzemeler ve usta işçiliğiyle hayata geçirilmektedir.
            </p>
            <p className="body-md text-muted" style={{ marginBottom: 'var(--space-10)' }}>
              Estetik ve konforun mükemmel dengesini yakalayan tasarımlarımız, yatak odanızı bir lüks deneyimine dönüştürür.
            </p>
            <Link href="/hakkimizda" className="btn btn-outline">
              Daha Fazla Bilgi
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </Link>
          </div>

          {/* Values Side */}
          <div className={styles.valuesSide}>
            {values.map((v, i) => (
              <div key={i} className={styles.valueItem}>
                <div className={styles.valueIcon} aria-hidden="true">
                  {v.icon}
                </div>
                <div>
                  <p className="heading-md" style={{ marginBottom: 'var(--space-2)' }}>{v.title}</p>
                  <p className="body-sm text-muted">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
