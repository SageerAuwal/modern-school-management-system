const { PrismaClient, UserRole } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const school = await prisma.school.findFirst();
  if (!school) {
    console.error('No school found!');
    process.exit(1);
  }

  const email = 'nurse@school.local';
  const rawPassword = 'Password123!';
  const passwordHash = await bcrypt.hash(rawPassword, 12);

  // Upsert the Nurse User account
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: UserRole.NURSE,
      firstName: 'Hauwa',
      lastName: 'Ibrahim',
      phone: '08029839848',
      isActive: true,
    },
    create: {
      schoolId: school.id,
      email,
      passwordHash,
      role: UserRole.NURSE,
      firstName: 'Hauwa',
      lastName: 'Ibrahim',
      phone: '08029839848',
      isActive: true,
    },
  });

  // Upsert the Staff record linked to this user
  const existingStaff = await prisma.staffRecord.findFirst({
    where: { schoolId: school.id, firstName: 'Hauwa', lastName: 'Ibrahim' },
  });

  if (existingStaff) {
    await prisma.staffRecord.update({
      where: { id: existingStaff.id },
      data: {
        role: 'School Nurse',
        phone: '08029839848',
        isActive: true,
      },
    });
  } else {
    await prisma.staffRecord.create({
      data: {
        schoolId: school.id,
        firstName: 'Hauwa',
        lastName: 'Ibrahim',
        phone: '08029839848',
        role: 'School Nurse',
        gender: 'FEMALE',
        isActive: true,
      },
    });
  }

  console.log('Successfully created School Nurse account:');
  console.log('Email:', email);
  console.log('Password:', rawPassword);
  console.log('Role:', user.role);
  console.log('Name: Nurse', user.firstName, user.lastName);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
