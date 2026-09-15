/// <reference types="node" />
/**
 * Seed: creates the initial admin user.
 * Run: pnpm --filter @aldimobilya/db db:seed
 *
 * Change the email/password below before running!
 */

import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';

const prisma = new PrismaClient();

// ─── Change these before running ───────────────────────────────────────────────
const ADMIN_EMAIL = 'admin@aldimobilya.com';
const ADMIN_NAME  = 'ALDi Admin';
const ADMIN_PASS  = 'AldI2024!';          // ← Change this to a strong password!
// ───────────────────────────────────────────────────────────────────────────────

/** Simple password hash — replace with bcrypt when NextAuth is wired */
function hashPassword(pw: string): string {
  return createHash('sha256').update(pw + 'aldi-salt-2024').digest('hex');
}

async function main() {
  console.log('🌱 Seeding database...');

  // Site settings
  await prisma.siteSettings.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      id: 'main',
      whatsapp: '+905000000000',
      instagram: 'aldimobilya',
      heroTitleTr: 'Sonsuz Şıklık',
      heroSubtitleTr: 'Her tasarım, yaşam alanınıza özgün bir karakter katar.',
      metaDescTr: 'ALDi Mobilya — El işçiliğiyle üretilen lüks yatak odası takımları.',
    },
  });
  console.log('✅ Site settings created');

  // Admin user
  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      password: hashPassword(ADMIN_PASS),
      role: 'ADMIN',
    },
  });
  console.log(`✅ Admin user: ${user.email}`);

  console.log('\n🎉 Seed complete!');
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASS}`);
  console.log('\n⚠️  Change your password after first login!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
