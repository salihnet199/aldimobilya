/// <reference types="node" />
/**
 * Seed: creates the initial admin user.
 * Run: pnpm --filter @aldimobilya/db db:seed
 *
 * Set ADMIN_EMAIL / ADMIN_NAME / ADMIN_PASSWORD env vars before running,
 * or edit the fallback constants below (not recommended for production —
 * this file is committed to the repo).
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@aldimobilya.com';
const ADMIN_NAME = process.env.ADMIN_NAME ?? 'ALDi Admin';
// Generate a random password if none is provided, instead of shipping a
// guessable default in source control.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? randomBytes(9).toString('base64url');

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
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      password: passwordHash,
      role: 'ADMIN',
    },
  });
  console.log(`✅ Admin user: ${user.email}`);

  console.log('\n🎉 Seed complete!');
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log(`   Password: ${ADMIN_PASSWORD}  (auto-generated — save it now, it will not be shown again)`);
  } else {
    console.log('   Password: (set from ADMIN_PASSWORD env var)');
  }
  console.log('\n⚠️  Change your password after first login!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
