import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Yatak Odası Koleksiyonu',
  description: 'ALDi Mobilya lüks yatak odası tasarımları — tüm koleksiyonumuzu inceleyin.',
};

// TODO: Replace with real API call when catalog is populated
async function getRooms(_category?: string, _search?: string) {
  return { rooms: [], categories: [] as string[] };
}

export default async function KatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string; ara?: string }>;
}) {
  const params = await searchParams;
  const { rooms, categories } = await getRooms(params.kategori, params.ara);

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className="container">
          <span className="section-eyebrow">Koleksiyon</span>
          <h1 className="display-lg">Yatak Odaları</h1>
          <div className="gold-line" />
          <p className="body-lg text-muted" style={{ maxWidth: 520 }}>
            El işçiliğiyle üretilmiş lüks yatak odası tasarımlarımızı keşfedin.
            Her model, mükemmelliğin ve konforun simgesidir.
          </p>
        </div>
      </div>

      <div className="container section">
        {/* Filters + Search */}
        <div className={styles.controls}>
          <div className="search-wrap" style={{ maxWidth: 360 }}>
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="input"
              type="search"
              placeholder="Model adı ara..."
              aria-label="Yatak odası modeli ara"
              defaultValue={params.ara}
            />
          </div>

          {categories.length > 0 && (
            <div className={styles.chips}>
              <button className={`chip ${!params.kategori ? 'active' : ''}`}>Tümü</button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`chip ${params.kategori === cat ? 'active' : ''}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Rooms Grid */}
        {rooms.length > 0 ? (
          <div className={styles.grid}>
            {/* Room cards will be rendered here */}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18M9 21V9"/>
              </svg>
            </div>
            <h2 className="heading-lg" style={{ marginBottom: 'var(--space-3)' }}>
              Koleksiyon Hazırlanıyor
            </h2>
            <p className="body-md text-muted" style={{ maxWidth: 420, margin: '0 auto var(--space-8)' }}>
              Tasarımlarımız yakında bu sayfada görünecek.
              Güncellemeler için Instagram hesabımızı takip edin.
            </p>
            <a
              href="https://www.instagram.com/aldimobilya/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/>
              </svg>
              @aldimobilya&apos;y&#305; Takip Et
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
