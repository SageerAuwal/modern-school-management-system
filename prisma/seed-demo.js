/**
 * Comprehensive Test Data Seed Script
 * Populates:
 * - 5 Teachers (User + StaffRecord)
 * - 5 Academic Classes & 2 Terms
 * - 7 Academic Subjects
 * - 5 Students & 5 Linked Parents (User + GuardianLink)
 * - Class Enrollments
 * - Continuous Assessment & Exam Scores (Terminal Report Cards)
 * - 5 Days of Attendance History
 * - Fee Structures, Invoices & Payment Receipts (Paid, Partial, Unpaid)
 * - Library Catalog (5 Books) & Loans (Active & Overdue)
 * - Transport Fleet (2 Buses), Route, Stops & Student Bus Passes
 *
 * Run with:
 *   node prisma/seed-demo.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting full test data seeding...');

  // ── 1. School & Admin Check ──────────────────────────────────────────────
  let school = await prisma.school.findFirst();
  if (!school) {
    school = await prisma.school.create({
      data: {
        name: 'My School',
        address: '1 School Road, Kano',
        phone: '08000000000',
        email: 'info@school.local',
        state: 'Kano',
        lga: 'Kano Municipal',
      },
    });
  }
  console.log(`✅ School identified: ${school.name}`);

  let admin = await prisma.user.findFirst({ where: { role: 'ADMIN', schoolId: school.id } });
  if (!admin) {
    const passwordHash = await bcrypt.hash('Admin@1234', 10);
    admin = await prisma.user.create({
      data: {
        schoolId: school.id,
        email: 'admin@school.local',
        passwordHash,
        firstName: 'System',
        lastName: 'Admin',
        role: 'ADMIN',
        isActive: true,
      },
    });
  }
  console.log(`✅ System admin ready: ${admin.email}`);

  // ── 2. Terms ─────────────────────────────────────────────────────────────
  const term1 = await prisma.term.upsert({
    where: { schoolId_name_academicYear: { schoolId: school.id, name: 'First Term', academicYear: '2025/2026' } },
    update: { isCurrent: true },
    create: {
      schoolId: school.id,
      name: 'First Term',
      academicYear: '2025/2026',
      startDate: new Date('2025-09-08'),
      endDate: new Date('2025-12-18'),
      isCurrent: true,
    },
  });

  const term2 = await prisma.term.upsert({
    where: { schoolId_name_academicYear: { schoolId: school.id, name: 'Second Term', academicYear: '2025/2026' } },
    update: { isCurrent: false },
    create: {
      schoolId: school.id,
      name: 'Second Term',
      academicYear: '2025/2026',
      startDate: new Date('2026-01-12'),
      endDate: new Date('2026-04-10'),
      isCurrent: false,
    },
  });
  console.log('✅ Academic terms initialized (First Term 2025/2026 set to Current)');

  // ── 3. 5 Teachers ────────────────────────────────────────────────────────
  const teacherPasswordHash = await bcrypt.hash('Teacher@1234', 10);
  const teachersData = [
    { email: 'ibrahim.sani@school.local', firstName: 'Ibrahim', lastName: 'Sani', phone: '08031110001' },
    { email: 'fatima.bello@school.local', firstName: 'Fatima', lastName: 'Bello', phone: '08031110002' },
    { email: 'emmanuel.okon@school.local', firstName: 'Emmanuel', lastName: 'Okon', phone: '08031110003' },
    { email: 'maryam.usman@school.local', firstName: 'Maryam', lastName: 'Usman', phone: '08031110004' },
    { email: 'chukwudi.eze@school.local', firstName: 'Chukwudi', lastName: 'Eze', phone: '08031110005' },
  ];

  const teacherUsers = [];
  for (const t of teachersData) {
    let user = await prisma.user.findUnique({ where: { email: t.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          schoolId: school.id,
          email: t.email,
          passwordHash: teacherPasswordHash,
          firstName: t.firstName,
          lastName: t.lastName,
          phone: t.phone,
          role: 'TEACHER',
          isActive: true,
        },
      });
    }
    teacherUsers.push(user);

    // Also register in StaffRecord
    const existingStaff = await prisma.staffRecord.findFirst({
      where: { schoolId: school.id, firstName: t.firstName, lastName: t.lastName },
    });
    if (!existingStaff) {
      await prisma.staffRecord.create({
        data: {
          schoolId: school.id,
          firstName: t.firstName,
          lastName: t.lastName,
          role: 'Teacher',
          phone: t.phone,
          isActive: true,
        },
      });
    }
  }
  console.log('✅ 5 Teacher accounts and staff records created');

  // ── 4. 5 Classes ─────────────────────────────────────────────────────────
  const classesData = [
    { name: 'JSS 1A', level: 'JSS1', stream: 'A', teacherId: teacherUsers[0].id, capacity: 35 },
    { name: 'JSS 1B', level: 'JSS1', stream: 'B', teacherId: teacherUsers[1].id, capacity: 35 },
    { name: 'SS 1 Science', level: 'SS1', stream: 'Science', teacherId: teacherUsers[2].id, capacity: 30 },
    { name: 'SS 2 Commercial', level: 'SS2', stream: 'Commercial', teacherId: teacherUsers[3].id, capacity: 30 },
    { name: 'SS 3 Art', level: 'SS3', stream: 'Art', teacherId: teacherUsers[4].id, capacity: 30 },
  ];

  const classSections = [];
  for (const c of classesData) {
    const cls = await prisma.classSection.upsert({
      where: { schoolId_name_academicYear: { schoolId: school.id, name: c.name, academicYear: '2025/2026' } },
      update: { teacherId: c.teacherId, capacity: c.capacity },
      create: {
        schoolId: school.id,
        name: c.name,
        level: c.level,
        stream: c.stream,
        academicYear: '2025/2026',
        capacity: c.capacity,
        teacherId: c.teacherId,
        isActive: true,
      },
    });
    classSections.push(cls);
  }
  console.log('✅ 5 Classes created with assigned form teachers');

  // ── 5. Academic Subjects ─────────────────────────────────────────────────
  const subjectsData = [
    { name: 'Mathematics', code: 'MTH' },
    { name: 'English Language', code: 'ENG' },
    { name: 'Basic Science', code: 'BSC' },
    { name: 'Civic Education', code: 'CVE' },
    { name: 'Physics', code: 'PHY' },
    { name: 'Chemistry', code: 'CHM' },
    { name: 'Economics', code: 'ECN' },
  ];

  const subjects = [];
  for (const s of subjectsData) {
    const sub = await prisma.subject.upsert({
      where: { schoolId_name: { schoolId: school.id, name: s.name } },
      update: { code: s.code },
      create: { schoolId: school.id, name: s.name, code: s.code, isActive: true },
    });
    subjects.push(sub);
  }

  // Link subjects to classes
  for (const cls of classSections) {
    for (const sub of subjects) {
      await prisma.classSubject.upsert({
        where: { classSectionId_subjectId: { classSectionId: cls.id, subjectId: sub.id } },
        update: {},
        create: { classSectionId: cls.id, subjectId: sub.id, teacherId: cls.teacherId },
      });
    }
  }
  console.log('✅ 7 Academic subjects assigned to all class sections');

  // ── 6. 5 Students & 5 Linked Parents ─────────────────────────────────────
  const parentPasswordHash = await bcrypt.hash('Parent@1234', 10);
  const studentsAndParents = [
    {
      student: { firstName: 'Amina', lastName: 'Sageer', gender: 'FEMALE', admissionNumber: 'SMS/2025/001', classIndex: 0 },
      parent: { email: 'parent.sageer@school.local', firstName: 'Sageer', lastName: 'Auwal', phone: '08020000001', relation: 'Father' },
    },
    {
      student: { firstName: 'Zainab', lastName: 'Ibrahim', gender: 'FEMALE', admissionNumber: 'SMS/2025/002', classIndex: 0 },
      parent: { email: 'parent.ibrahim@school.local', firstName: 'Ibrahim', lastName: 'Garba', phone: '08020000002', relation: 'Father' },
    },
    {
      student: { firstName: 'David', lastName: 'Okoro', gender: 'MALE', admissionNumber: 'SMS/2025/003', classIndex: 1 },
      parent: { email: 'parent.blessing@school.local', firstName: 'Blessing', lastName: 'Okoro', phone: '08020000003', relation: 'Mother' },
    },
    {
      student: { firstName: 'Yusuf', lastName: 'Mohammed', gender: 'MALE', admissionNumber: 'SMS/2025/004', classIndex: 2 },
      parent: { email: 'parent.kabir@school.local', firstName: 'Mohammed', lastName: 'Kabir', phone: '08020000004', relation: 'Father' },
    },
    {
      student: { firstName: 'Khadija', lastName: 'Aliyu', gender: 'FEMALE', admissionNumber: 'SMS/2025/005', classIndex: 3 },
      parent: { email: 'parent.aisha@school.local', firstName: 'Aisha', lastName: 'Aliyu', phone: '08020000005', relation: 'Mother' },
    },
  ];

  const students = [];
  const parentUsers = [];

  for (const item of studentsAndParents) {
    // Create Student
    let student = await prisma.student.findUnique({ where: { admissionNumber: item.student.admissionNumber } });
    if (!student) {
      student = await prisma.student.create({
        data: {
          schoolId: school.id,
          firstName: item.student.firstName,
          lastName: item.student.lastName,
          gender: item.student.gender,
          admissionNumber: item.student.admissionNumber,
          enrollmentStatus: 'ACTIVE',
        },
      });
    }
    students.push(student);

    // Enroll in Class
    const targetClass = classSections[item.student.classIndex];
    await prisma.enrollment.upsert({
      where: { studentId_classSectionId_academicYear: { studentId: student.id, classSectionId: targetClass.id, academicYear: '2025/2026' } },
      update: {},
      create: {
        studentId: student.id,
        classSectionId: targetClass.id,
        academicYear: '2025/2026',
        status: 'ACTIVE',
      },
    });

    // Create Parent User
    let pUser = await prisma.user.findUnique({ where: { email: item.parent.email } });
    if (!pUser) {
      pUser = await prisma.user.create({
        data: {
          schoolId: school.id,
          email: item.parent.email,
          passwordHash: parentPasswordHash,
          firstName: item.parent.firstName,
          lastName: item.parent.lastName,
          phone: item.parent.phone,
          role: 'PARENT',
          isActive: true,
        },
      });
    }
    parentUsers.push(pUser);

    // Link Student to Parent
    await prisma.guardianLink.upsert({
      where: { studentId_guardianId: { studentId: student.id, guardianId: pUser.id } },
      update: {},
      create: {
        studentId: student.id,
        guardianId: pUser.id,
        relationship: item.parent.relation,
        isPrimary: true,
      },
    });
  }

  // Create Student User Accounts for Portal Login
  const studentPasswordHash = await bcrypt.hash('Student@1234', 10);
  for (const s of students) {
    const studentEmail = `student.${s.firstName.toLowerCase()}@school.local`;
    let sUser = await prisma.user.findUnique({ where: { email: studentEmail } });
    if (!sUser) {
      await prisma.user.create({
        data: {
          schoolId: school.id,
          email: studentEmail,
          passwordHash: studentPasswordHash,
          firstName: s.firstName,
          lastName: s.lastName,
          role: 'STUDENT',
          isActive: true,
        },
      });
    }
  }
  console.log('✅ 5 Students & 5 Linked Parents created with portal accounts and guardian relations');

  // ── 7. Scores & Terminal Report Cards ────────────────────────────────────
  function computeGrade(total) {
    if (total >= 75) return { grade: 'A', remark: 'Distinction' };
    if (total >= 65) return { grade: 'B', remark: 'Very Good' };
    if (total >= 50) return { grade: 'C', remark: 'Credit' };
    if (total >= 45) return { grade: 'D', remark: 'Pass' };
    if (total >= 40) return { grade: 'E', remark: 'Fair' };
    return { grade: 'F', remark: 'Fail' };
  }

  // Pre-seed realistic marks for students in JSS 1A so rankings work
  const studentScoresConfig = [
    // Amina Sageer (High performer - 1st/2nd position)
    { studentIndex: 0, classIndex: 0, ca1: 18, ca2: 19, exam: 55 },
    // Zainab Ibrahim (Good performer)
    { studentIndex: 1, classIndex: 0, ca1: 16, ca2: 15, exam: 48 },
    // David Okoro
    { studentIndex: 2, classIndex: 1, ca1: 14, ca2: 14, exam: 42 },
    // Yusuf Mohammed
    { studentIndex: 3, classIndex: 2, ca1: 17, ca2: 16, exam: 50 },
    // Khadija Aliyu
    { studentIndex: 4, classIndex: 3, ca1: 15, ca2: 17, exam: 46 },
  ];

  for (const sc of studentScoresConfig) {
    const student = students[sc.studentIndex];
    const cls = classSections[sc.classIndex];

    for (let i = 0; i < subjects.length; i++) {
      const sub = subjects[i];
      // small variation across subjects
      const ca1 = Math.min(20, Math.max(10, sc.ca1 + ((i % 3) - 1)));
      const ca2 = Math.min(20, Math.max(10, sc.ca2 + ((i % 2) - 1)));
      const exam = Math.min(60, Math.max(25, sc.exam + ((i % 4) - 2)));
      const total = ca1 + ca2 + exam;
      const { grade, remark } = computeGrade(total);

      await prisma.score.upsert({
        where: {
          studentId_subjectId_classSectionId_termId: {
            studentId: student.id,
            subjectId: sub.id,
            classSectionId: cls.id,
            termId: term1.id,
          },
        },
        update: { ca1, ca2, exam, total, grade, remark },
        create: {
          schoolId: school.id,
          studentId: student.id,
          subjectId: sub.id,
          classSectionId: cls.id,
          termId: term1.id,
          academicYear: '2025/2026',
          ca1,
          ca2,
          exam,
          total,
          grade,
          remark,
          enteredById: cls.teacherId || admin.id,
        },
      });
    }
  }
  console.log('✅ Academic score sheets populated for First Term terminal reports');

  // ── 8. 5 Days of Attendance Records ──────────────────────────────────────
  const dates = [
    new Date('2025-10-06'),
    new Date('2025-10-07'),
    new Date('2025-10-08'),
    new Date('2025-10-09'),
    new Date('2025-10-10'),
  ];

  for (const date of dates) {
    for (let sIdx = 0; sIdx < students.length; sIdx++) {
      const student = students[sIdx];
      const cls = classSections[studentsAndParents[sIdx].student.classIndex];
      // mostly PRESENT, occasional LATE or EXCUSED
      let status = 'PRESENT';
      if (sIdx === 1 && date.getDay() === 2) status = 'LATE';
      if (sIdx === 2 && date.getDay() === 4) status = 'EXCUSED';

      await prisma.attendanceRecord.upsert({
        where: {
          studentId_classSectionId_date: {
            studentId: student.id,
            classSectionId: cls.id,
            date,
          },
        },
        update: { status },
        create: {
          schoolId: school.id,
          classSectionId: cls.id,
          studentId: student.id,
          date,
          status,
          markedById: cls.teacherId || admin.id,
        },
      });
    }
  }
  console.log('✅ 5 days of attendance history recorded');

  // ── 9. Fee Structures, Invoices & Payments ────────────────────────────────
  const fee1 = await prisma.feeStructure.create({
    data: {
      schoolId: school.id,
      name: 'First Term Tuition Fee',
      academicYear: '2025/2026',
      termId: term1.id,
      amount: 65000,
    },
  });

  const fee2 = await prisma.feeStructure.create({
    data: {
      schoolId: school.id,
      name: 'Development Levy',
      academicYear: '2025/2026',
      termId: term1.id,
      amount: 15000,
    },
  });

  // Invoice 1: Amina Sageer (PAID in full)
  let invAmina = await prisma.invoice.findFirst({
    where: { schoolId: school.id, studentId: students[0].id, termId: term1.id },
  });
  if (!invAmina) {
    invAmina = await prisma.invoice.create({
      data: {
        schoolId: school.id,
        studentId: students[0].id,
        termId: term1.id,
        academicYear: '2025/2026',
        totalAmount: 80000,
        paidAmount: 80000,
        status: 'PAID',
        dueDate: new Date('2025-10-31'),
        createdById: admin.id,
        items: {
          create: [
            { feeStructureId: fee1.id, name: 'Tuition', amount: 65000 },
            { feeStructureId: fee2.id, name: 'Development Levy', amount: 15000 },
          ],
        },
      },
    });

    await prisma.payment.create({
      data: {
        schoolId: school.id,
        invoiceId: invAmina.id,
        amount: 80000,
        method: 'CASH',
        status: 'SUCCESS',
        reference: `PAY-REC-001-${Date.now()}`,
        paidAt: new Date('2025-09-15'),
        recordedById: admin.id,
        notes: 'Paid in full at bursar desk',
      },
    });
  }

  // Invoice 2: Zainab Ibrahim (PARTIAL: 50,000 of 80,000 paid)
  let invZainab = await prisma.invoice.findFirst({
    where: { schoolId: school.id, studentId: students[1].id, termId: term1.id },
  });
  if (!invZainab) {
    invZainab = await prisma.invoice.create({
      data: {
        schoolId: school.id,
        studentId: students[1].id,
        termId: term1.id,
        academicYear: '2025/2026',
        totalAmount: 80000,
        paidAmount: 50000,
        status: 'PARTIAL',
        dueDate: new Date('2025-10-31'),
        createdById: admin.id,
        items: {
          create: [
            { feeStructureId: fee1.id, name: 'Tuition', amount: 65000 },
            { feeStructureId: fee2.id, name: 'Development Levy', amount: 15000 },
          ],
        },
      },
    });

    await prisma.payment.create({
      data: {
        schoolId: school.id,
        invoiceId: invZainab.id,
        amount: 50000,
        method: 'BANK_DEPOSIT',
        status: 'SUCCESS',
        reference: `PAY-REC-002-${Date.now()}`,
        paidAt: new Date('2025-09-20'),
        recordedById: admin.id,
        notes: 'First installment paid via bank teller',
      },
    });
  }

  // Invoice 3: David Okoro (UNPAID: 80,000 outstanding)
  const existingDavidInv = await prisma.invoice.findFirst({
    where: { schoolId: school.id, studentId: students[2].id, termId: term1.id },
  });
  if (!existingDavidInv) {
    await prisma.invoice.create({
      data: {
        schoolId: school.id,
        studentId: students[2].id,
        termId: term1.id,
        academicYear: '2025/2026',
        totalAmount: 80000,
        paidAmount: 0,
        status: 'UNPAID',
        dueDate: new Date('2025-10-31'),
        createdById: admin.id,
        items: {
          create: [
            { feeStructureId: fee1.id, name: 'Tuition', amount: 65000 },
            { feeStructureId: fee2.id, name: 'Development Levy', amount: 15000 },
          ],
        },
      },
    });
  }
  console.log('✅ Fee structures and sample Paid, Partial, and Unpaid invoices recorded');

  // ── 10. Library Catalog & Book Loans ─────────────────────────────────────
  const booksData = [
    { title: 'New General Mathematics for JSS 1', author: 'M.F. Macrae', isbn: '978-01-001', category: 'Mathematics', totalCopies: 20 },
    { title: 'Senior English Project Book 1', author: 'N. Grant', isbn: '978-01-002', category: 'English', totalCopies: 25 },
    { title: 'Essential Physics for Senior Secondary', author: 'O. Farinde', isbn: '978-01-003', category: 'Science', totalCopies: 15 },
    { title: 'Understanding Economics for West Africa', author: 'C.E. Ande', isbn: '978-01-004', category: 'Commercial', totalCopies: 12 },
    { title: 'Things Fall Apart', author: 'Chinua Achebe', isbn: '978-01-005', category: 'Literature', totalCopies: 30 },
  ];

  const books = [];
  for (const b of booksData) {
    const book = await prisma.book.upsert({
      where: { isbn: b.isbn },
      update: { totalCopies: b.totalCopies },
      create: {
        schoolId: school.id,
        title: b.title,
        author: b.author,
        isbn: b.isbn,
        category: b.category,
        totalCopies: b.totalCopies,
        availableCopies: b.totalCopies - 1,
      },
    });
    books.push(book);
  }

  // Active Loan: Amina Sageer
  await prisma.bookLoan.create({
    data: {
      schoolId: school.id,
      bookId: books[0].id,
      studentId: students[0].id,
      borrowerName: `${students[0].firstName} ${students[0].lastName}`,
      dueDate: new Date('2026-10-30'),
      status: 'ACTIVE',
      issuedById: admin.id,
    },
  });

  // Overdue Loan: David Okoro (fine accrued)
  await prisma.bookLoan.create({
    data: {
      schoolId: school.id,
      bookId: books[1].id,
      studentId: students[2].id,
      borrowerName: `${students[2].firstName} ${students[2].lastName}`,
      dueDate: new Date('2025-09-01'),
      status: 'OVERDUE',
      fine: 250,
      finePaid: false,
      issuedById: admin.id,
      notes: '5 days overdue',
    },
  });
  console.log('✅ Library catalog and active/overdue book loans created');

  // ── 11. Transport Fleet & Routes ─────────────────────────────────────────
  const bus1 = await prisma.bus.upsert({
    where: { schoolId_plateNumber: { schoolId: school.id, plateNumber: 'KMC-101-AA' } },
    update: {},
    create: {
      schoolId: school.id,
      name: 'Blue Star Bus #101',
      plateNumber: 'KMC-101-AA',
      capacity: 32,
      driverName: 'Malam Lawan',
      driverPhone: '08039991122',
      isActive: true,
    },
  });

  const bus2 = await prisma.bus.upsert({
    where: { schoolId_plateNumber: { schoolId: school.id, plateNumber: 'KMC-102-BB' } },
    update: {},
    create: {
      schoolId: school.id,
      name: 'Green Star Shuttle #102',
      plateNumber: 'KMC-102-BB',
      capacity: 24,
      driverName: 'Malam Haruna',
      driverPhone: '08039993344',
      isActive: true,
    },
  });

  const route1 = await prisma.transportRoute.create({
    data: {
      schoolId: school.id,
      busId: bus1.id,
      name: 'Kano Central Morning Route',
      description: 'Serving Gidan Murtala, Silver Gate, and Airport Road',
      stops: {
        create: [
          { stopName: 'Gidan Murtala Flyover', stopOrder: 1, landmark: 'Opposite State Library', pickupTime: '07:05 AM' },
          { stopName: 'Silver Gate Junction', stopOrder: 2, landmark: 'Beside Commercial Bank', pickupTime: '07:20 AM' },
          { stopName: 'Airport Road Roundabout', stopOrder: 3, landmark: 'Green Petrol Station', pickupTime: '07:35 AM' },
        ],
      },
    },
  });

  // Assign Student to Bus
  await prisma.studentTransport.upsert({
    where: { studentId_academicYear: { studentId: students[0].id, academicYear: '2025/2026' } },
    update: {},
    create: {
      schoolId: school.id,
      studentId: students[0].id,
      busId: bus1.id,
      routeId: route1.id,
      pickupStop: 'Gidan Murtala Flyover',
      dropoffStop: 'Gidan Murtala Flyover',
      academicYear: '2025/2026',
      isActive: true,
    },
  });

  await prisma.studentTransport.upsert({
    where: { studentId_academicYear: { studentId: students[3].id, academicYear: '2025/2026' } },
    update: {},
    create: {
      schoolId: school.id,
      studentId: students[3].id,
      busId: bus1.id,
      routeId: route1.id,
      pickupStop: 'Airport Road Roundabout',
      dropoffStop: 'Airport Road Roundabout',
      academicYear: '2025/2026',
      isActive: true,
    },
  });
  console.log('✅ Transport buses, routes, stops, and student bus passes assigned');

  console.log('\n============================================================');
  console.log('🎉 FULL DEMO SEED COMPLETED SUCCESSFULLY!');
  console.log('============================================================');
  console.log('Logins ready:');
  console.log('  Admin:   admin@school.local          | Admin@1234');
  console.log('  Teacher: ibrahim.sani@school.local   | Teacher@1234');
  console.log('  Teacher: fatima.bello@school.local   | Teacher@1234');
  console.log('  Parent:  parent.sageer@school.local  | Parent@1234');
  console.log('  Parent:  parent.ibrahim@school.local | Parent@1234');
  console.log('============================================================');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
