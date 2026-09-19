/**
 * Seed script — creates the school record and first ADMIN user.
 * Run once after migration:
 *   node prisma/seed.js
 *
 * Default login:
 *   Email:    admin@school.local
 *   Password: Admin@1234
 *
 * CHANGE THE PASSWORD after first login.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('[INFO] Seeding database...');

  // ── 1. Create the school (single-tenant) ──────────────────────────────────
  let school = await prisma.school.findFirst();
  if (!school) {
    school = await prisma.school.create({
      data: {
        name: 'Bright Future Academy',
        address: 'Behind L.E.A Primary School Tumburu Kashere, Akko LGA, Gombe State.',
        phone: '08029839848',
        email: 'brightfutureacademykashere@gmail.com',
        state: 'Gombe',
        lga: 'Akko',
      },
    });
    console.log(`[OK] School created: ${school.name} (${school.id})`);
  } else {
    console.log(`[INFO] School already exists: ${school.name}`);
  }

  // ── 2. Create first Admin user ────────────────────────────────────────────
  const email = 'admin@school.local';
  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    const passwordHash = await bcrypt.hash('Admin@1234', 12);
    const admin = await prisma.user.create({
      data: {
        schoolId: school.id,
        email,
        passwordHash,
        firstName: 'System',
        lastName: 'Admin',
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log(`[OK] Admin user created: ${admin.email}`);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Login credentials:');
    console.log(`  Email:    ${email}`);
    console.log('  Password: Admin@1234');
    console.log('  [NOTICE] Change password after first login!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } else {
    console.log(`Admin user already exists: ${email}`);
  }

  // ── 3. Create Bursar user ─────────────────────────────────────────────
  const bursarEmail = 'bursar@school.local';
  const existingBursar = await prisma.user.findUnique({ where: { email: bursarEmail } });
  if (!existingBursar) {
    const bursarPass = await bcrypt.hash('Bursar@2025!', 10);
    await prisma.user.create({
      data: {
        schoolId: school.id,
        email: bursarEmail,
        passwordHash: bursarPass,
        firstName: 'School',
        lastName: 'Bursar',
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log(`Bursar user created: ${bursarEmail}`);
  }

  console.log('\n[SUCCESS] Done. Run the app and log in.');
}

main()
  .catch((e) => {
    console.error('[ERROR] Seed failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
