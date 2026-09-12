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
  console.log('🌱  Seeding database…');

  // ── 1. Create the school (single-tenant) ──────────────────────────────────
  let school = await prisma.school.findFirst();
  if (!school) {
    school = await prisma.school.create({
      data: {
        name: 'My School',
        address: '1 School Road, Kano',
        phone: '08000000000',
        email: 'info@school.local',
        currentAcademicYear: '2025/2026',
      },
    });
    console.log(`✅  School created: ${school.name} (${school.id})`);
  } else {
    console.log(`ℹ️   School already exists: ${school.name}`);
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
        mustChangePassword: true,   // Forces password change on first login
      },
    });
    console.log(`✅  Admin user created: ${admin.email}`);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Login credentials:');
    console.log(`  Email:    ${email}`);
    console.log('  Password: Admin@1234');
    console.log('  ⚠️  Change password after first login!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } else {
    console.log(`ℹ️   Admin user already exists: ${email}`);
  }

  console.log('\n🎉  Done. Run the app and log in.');
}

main()
  .catch((e) => {
    console.error('❌  Seed failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
