'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { imageProps } from '@/lib/media';
import styles from './Header.module.css';

const navLinks = [
  { href: '/', label: 'Ana Sayfa' },
  { href: '/katalog', label: 'Koleksiyonlar' },
  { href: '/medya', label: 'Fotoğraf & Video' },
  { href: '/hakkimizda', label: 'Hikâyemiz' },
  { href: '/iletisim', label: 'İletişim' },
];

export default function Header({ contactHref = '/iletisim' }: { contactHref?: string }) {
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const external = contactHref.startsWith('https://');
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  function closeMenu() {
    dialog.current?.close();
    setOpen(false);
    trigger.current?.focus();
  }

  function openMenu() {
    dialog.current?.showModal();
    setOpen(true);
  }

  // Close on navigation (back/forward, or any link that does not close it
  // itself). `dialog.close()` also restores focus natively.
  useEffect(() => {
    if (!dialog.current?.open) return;
    dialog.current.close();
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const media = window.matchMedia('(min-width: 901px)');
    const closeAtDesktop = () => {
      if (media.matches) { dialog.current?.close(); setOpen(false); }
    };
    media.addEventListener('change', closeAtDesktop);
    return () => { document.body.style.overflow = previous; media.removeEventListener('change', closeAtDesktop); };
  }, [open]);

  return (
    <header className={styles.header}>
      <div className={`container ${styles.masthead}`}>
        <div className={styles.left}>
          <button ref={trigger} type="button" className={styles.menuButton} onClick={openMenu} aria-label="Menüyü aç" aria-expanded={open} aria-controls="mobile-menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M3 7h18M3 12h18M3 17h12" /></svg>
          </button>
          <span className={styles.signature}>Özenle tasarlandı.<br /><span>Sizin için üretildi.</span></span>
        </div>
        <Link href="/" className={styles.logo} aria-label="ALDi Mobilya — Ana Sayfa">
          <Image {...imageProps('/logo.jpg')} alt="ALDi Mobilya" width={150} height={150} priority className={styles.logoImg} />
        </Link>
        <div className={styles.right}>
          <a href={contactHref} className={styles.consultation} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>
            <span>Birlikte tasarlayalım</span><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" /></svg>
          </a>
        </div>
      </div>
      <nav className={styles.navigation} aria-label="Ana navigasyon">
        <ul>{navLinks.map(link => <li key={link.href}><Link href={link.href} aria-current={isActive(link.href) ? 'page' : undefined} className={isActive(link.href) ? styles.active : ''}>{link.label}</Link></li>)}</ul>
      </nav>
      <dialog ref={dialog} id="mobile-menu" className={styles.mobileMenu} aria-label="Mobil menü" aria-modal="true" onCancel={() => setOpen(false)} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) closeMenu(); }}>
        <div className={styles.menuInner}>
          <div className={styles.menuTop}><span>ALDi MOBİLYA</span><button type="button" onClick={closeMenu} aria-label="Menüyü kapat"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button></div>
          <nav aria-label="Mobil navigasyon"><ul>{navLinks.map((link, i) => <li key={link.href}><Link href={link.href} onClick={closeMenu} aria-current={isActive(link.href) ? 'page' : undefined}><span>0{i + 1}</span>{link.label}</Link></li>)}</ul></nav>
          <a className="btn btn-gold" href={contactHref} onClick={closeMenu} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>Bize ulaşın</a>
          <p className={styles.menuNote}>Yaşam alanınıza zamansız bir dokunuş.</p>
        </div>
      </dialog>
    </header>
  );
}
