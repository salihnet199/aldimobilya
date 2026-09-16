import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@aldimobilya/db';
import styles from './page.module.css';

export const metadata: Metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

const quickActions = [
  { href: '/dashboard/odalar/yeni', label: 'Yeni Oda Ekle', desc: 'Kataloğa yeni bir model ekleyin' },
  { href: '/dashboard/videolar', label: 'Video Yükle', desc: 'Tanıtım videosu ekleyin' },
  { href: '/dashboard/ayarlar', label: 'Site Ayarları', desc: 'WhatsApp, adres ve sosyal medyayı güncelleyin' },
];

export default async function DashboardPage() {
  // Read-only aggregate queries — no writes happen on the dashboard.
  const [roomCount, visibleRoomCount, videoCount, settings] = await Promise.all([
    prisma.room.count(),
    prisma.room.count({ where: { isVisible: true } }),
    prisma.video.count(),
    prisma.siteSettings.findUnique({ where: { id: 'main' }, select: { whatsapp: true } }),
  ]);

  const whatsappConfigured = Boolean(settings?.whatsapp?.trim());

  const stats = [
    {
      label: 'Toplam Oda Modeli',
      value: roomCount.toLocaleString('tr-TR'),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
        </svg>
      ),
      color: 'gold',
      href: '/dashboard/odalar',
    },
    {
      label: 'Yayında Modeller',
      value: visibleRoomCount.toLocaleString('tr-TR'),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      ),
      color: 'green',
      href: '/dashboard/odalar',
    },
    {
      label: 'Video Sayısı',
      value: videoCount.toLocaleString('tr-TR'),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
        </svg>
      ),
      color: 'blue',
      href: '/dashboard/videolar',
    },
    {
      label: 'WhatsApp Durumu',
      value: whatsappConfigured ? 'Aktif' : 'Ayarla',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      ),
      color: 'whatsapp',
      href: '/dashboard/ayarlar',
    },
  ];

  return (
    <div className={styles.page}>
      {/* Page Title */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>ALDi Mobilya Yönetim Paneline Hoş Geldiniz</p>
        </div>
        <Link href="/dashboard/odalar/yeni" className="admin-btn admin-btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Yeni Oda Ekle
        </Link>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className={`${styles.statCard} ${styles[`stat_${s.color}`]}`}>
            <div className={styles.statIcon}>{s.icon}</div>
            <div className={styles.statBody}>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Empty state */}
      {roomCount === 0 && (
        <div className={styles.emptyBox}>
          <p className={styles.emptyTitle}>Henüz oda modeli eklenmedi</p>
          <p className={styles.emptyDesc}>
            Kataloğunuzda görünecek ilk modeli ekleyerek başlayın.
          </p>
          <Link href="/dashboard/odalar/yeni" className="admin-btn admin-btn-primary">
            İlk Modeli Ekle
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Hızlı İşlemler</h2>
        <div className={styles.actionsGrid}>
          {quickActions.map((a) => (
            <Link key={a.href} href={a.href} className={styles.actionCard}>
              <p className={styles.actionLabel}>{a.label}</p>
              <p className={styles.actionDesc}>{a.desc}</p>
              <span className={styles.actionArrow}>→</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Info box */}
      <div className={styles.infoBox}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>
          Veritabanı bağlantısı kurmak için <strong>.env.local</strong> dosyasına
          Supabase, Cloudinary ve NextAuth bilgilerini ekleyin. Ardından <code>pnpm --filter @aldimobilya/db db:push</code> komutunu çalıştırın.
        </p>
      </div>
    </div>
  );
}
