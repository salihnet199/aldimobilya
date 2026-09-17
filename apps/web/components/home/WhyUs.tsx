import Reveal from '@/components/ui/Reveal';
import styles from './WhyUs.module.css';

const features = [
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
    title: 'Usta İşçiliği',
    desc: 'Her parça, alanında deneyimli ustalar tarafından el emeğiyle şekillendirilir.',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    ),
    title: 'Premium Malzeme',
    desc: 'Seçkin ahşap, kumaş ve donanım kullanılarak uzun ömürlü kalite garanti edilir.',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"/>
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>
      </svg>
    ),
    title: 'Özel Ölçü Tasarım',
    desc: 'Mekanınıza özel ölçü ve tercihlerinize göre kişiselleştirilmiş çözümler sunuyoruz.',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="1"/>
        <path d="M16 8h4l3 3v5h-7V8Z"/>
        <circle cx="5.5" cy="18.5" r="2.5"/>
        <circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ),
    title: 'Türkiye Geneli Teslimat',
    desc: 'Siparişleriniz özenle paketlenir ve adresinize güvenle ulaştırılır.',
  },
];

export default function WhyUs() {
  return (
    <section className={`section ${styles.section}`} aria-labelledby="whyus-heading">
      <div className="container">
        <Reveal className="section-header">
          <span className="section-eyebrow">Neden ALDi Mobilya</span>
          <h2 id="whyus-heading" className="display-md" style={{ marginTop: 'var(--space-2)' }}>
            Fark, <em className="text-gold">Detayda</em> Gizlidir
          </h2>
          <div className="gold-line gold-line-center" />
        </Reveal>

        <div className={styles.grid}>
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 100}>
              <div className={`card ${styles.item}`}>
                <div className={styles.icon} aria-hidden="true">{f.icon}</div>
                <h3 className="heading-md" style={{ marginBottom: 'var(--space-2)' }}>{f.title}</h3>
                <p className="body-sm text-muted">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
