import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  EnrollmentStatus,
  InvoiceStatus,
  LoanStatus,
  AttendanceStatus,
  UserRole,
} from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Comprehensive institutional data analytics and report generation
   */
  async getSummary(schoolId: string) {
    const [
      school,
      students,
      classSections,
      teachersCount,
      supportStaff,
      scores,
      invoices,
      attendanceStats,
      booksSum,
      totalBooksCount,
      loanStats,
      buses,
      transportRiders,
    ] = await Promise.all([
      // 1. School Information
      this.prisma.school.findUnique({
        where: { id: schoolId },
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          email: true,
          state: true,
          lga: true,
        },
      }),

      // 2. All Students (active, status, gender)
      this.prisma.student.findMany({
        where: { schoolId },
        select: {
          id: true,
          gender: true,
          enrollmentStatus: true,
          enrollments: {
            where: { status: EnrollmentStatus.ACTIVE },
            select: {
              classSection: {
                select: { id: true, name: true, level: true },
              },
            },
            take: 1,
          },
        },
      }),

      // 3. Class Sections with Capacity, Teacher & Enrolled count
      this.prisma.classSection.findMany({
        where: { schoolId, isActive: true },
        include: {
          teacher: {
            select: { firstName: true, lastName: true },
          },
          enrollments: {
            where: { status: EnrollmentStatus.ACTIVE },
            select: { id: true },
          },
        },
        orderBy: [{ level: 'asc' }, { name: 'asc' }],
      }),

      // 4. Portal Teachers
      this.prisma.user.count({
        where: { schoolId, role: UserRole.TEACHER, isActive: true },
      }),

      // 5. Support & Operations Staff Records
      this.prisma.staffRecord.findMany({
        where: { schoolId, isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      }),

      // 6. Scores & Grade Distribution
      this.prisma.score.findMany({
        where: { schoolId },
        include: {
          subject: {
            select: { id: true, name: true, code: true },
          },
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              admissionNumber: true,
            },
          },
        },
      }),

      // 7. Invoices & Bursary Financials
      this.prisma.invoice.findMany({
        where: { schoolId },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              admissionNumber: true,
              enrollments: {
                where: { status: EnrollmentStatus.ACTIVE },
                select: {
                  classSection: { select: { name: true } },
                },
                take: 1,
              },
            },
          },
        },
        orderBy: { totalAmount: 'desc' },
      }),

      // 8. Attendance Records Aggregate
      this.prisma.attendanceRecord.groupBy({
        by: ['status'],
        where: { schoolId },
        _count: { id: true },
      }),

      // 9. Library Books Aggregate
      this.prisma.book.aggregate({
        where: { schoolId },
        _sum: { totalCopies: true, availableCopies: true },
      }),

      // 10. Total Books Count
      this.prisma.book.count({ where: { schoolId } }),

      // 11. Library Loans Count
      this.prisma.bookLoan.groupBy({
        by: ['status'],
        where: { schoolId },
        _count: { id: true },
      }),

      // 12. Buses
      this.prisma.bus.findMany({
        where: { schoolId },
        select: {
          id: true,
          name: true,
          plateNumber: true,
          capacity: true,
          isActive: true,
        },
      }),

      // 13. Student Transport Assignments
      this.prisma.studentTransport.count({
        where: { schoolId, isActive: true },
      }),
    ]);

    // ── Compute Demographics ──────────────────────────────────────────────────
    const totalStudents = students.length;
    const activeStudents = students.filter(
      (s) => s.enrollmentStatus === EnrollmentStatus.ACTIVE,
    ).length;

    let maleCount = 0;
    let femaleCount = 0;
    const levelCounts: Record<string, number> = {};

    students.forEach((s) => {
      const g = (s.gender || '').toUpperCase();
      if (g === 'MALE' || g === 'M') maleCount++;
      else if (g === 'FEMALE' || g === 'F') femaleCount++;

      const activeEnrollment = s.enrollments[0];
      if (activeEnrollment?.classSection?.level) {
        const lvl = activeEnrollment.classSection.level;
        levelCounts[lvl] = (levelCounts[lvl] || 0) + 1;
      }
    });

    const classBreakdown = classSections.map((c) => {
      const enrolled = c.enrollments.length;
      const classCap = c.capacity || 40;
      return {
        id: c.id,
        name: c.name,
        level: c.level,
        enrolled,
        capacity: classCap,
        occupancyRate: Math.round((enrolled / classCap) * 100),
        teacherName: c.teacher
          ? `${c.teacher.firstName} ${c.teacher.lastName}`.trim()
          : 'Unassigned',
      };
    });

    const totalStaff = teachersCount + supportStaff.length;

    // ── Compute Academic Performance ──────────────────────────────────────────
    const totalScores = scores.length;
    let sumTotalScores = 0;
    const gradeDistribution: Record<string, number> = {
      A1: 0,
      B2: 0,
      B3: 0,
      C4: 0,
      C5: 0,
      C6: 0,
      D7: 0,
      E8: 0,
      F9: 0,
    };

    const subjectStatsMap: Record<
      string,
      {
        id: string;
        name: string;
        code: string;
        totalScores: number;
        sumTotal: number;
        sumCa: number;
        sumExam: number;
        passCount: number;
      }
    > = {};

    // Track student averages for Honor Roll
    const studentScoresMap: Record<
      string,
      {
        name: string;
        admissionNumber: string;
        totalMarks: number;
        subjectCount: number;
      }
    > = {};

    scores.forEach((sc) => {
      const scoreTotal = Number(sc.total || 0);
      sumTotalScores += scoreTotal;

      const gradeKey = (sc.grade || 'F9').toUpperCase();
      if (gradeDistribution[gradeKey] !== undefined) {
        gradeDistribution[gradeKey]++;
      }

      if (sc.subject) {
        const subId = sc.subject.id;
        if (!subjectStatsMap[subId]) {
          subjectStatsMap[subId] = {
            id: subId,
            name: sc.subject.name,
            code: sc.subject.code || '',
            totalScores: 0,
            sumTotal: 0,
            sumCa: 0,
            sumExam: 0,
            passCount: 0,
          };
        }
        subjectStatsMap[subId].totalScores++;
        subjectStatsMap[subId].sumTotal += scoreTotal;
        subjectStatsMap[subId].sumCa +=
          Number(sc.ca1 || 0) + Number(sc.ca2 || 0);
        subjectStatsMap[subId].sumExam += Number(sc.exam || 0);
        if (scoreTotal >= 40) subjectStatsMap[subId].passCount++;
      }

      if (sc.student) {
        const stId = sc.student.id;
        if (!studentScoresMap[stId]) {
          studentScoresMap[stId] = {
            name: `${sc.student.firstName} ${sc.student.lastName}`.trim(),
            admissionNumber: sc.student.admissionNumber || 'N/A',
            totalMarks: 0,
            subjectCount: 0,
          };
        }
        studentScoresMap[stId].totalMarks += scoreTotal;
        studentScoresMap[stId].subjectCount++;
      }
    });

    const schoolAverageScore =
      totalScores > 0 ? Math.round((sumTotalScores / totalScores) * 10) / 10 : 0;

    const subjectsSummary = Object.values(subjectStatsMap).map((sub) => ({
      id: sub.id,
      name: sub.name,
      code: sub.code,
      records: sub.totalScores,
      averageScore: Math.round((sub.sumTotal / sub.totalScores) * 10) / 10,
      averageCa: Math.round((sub.sumCa / sub.totalScores) * 10) / 10,
      averageExam: Math.round((sub.sumExam / sub.totalScores) * 10) / 10,
      passRate: Math.round((sub.passCount / sub.totalScores) * 100),
    }));

    const honorRoll = Object.values(studentScoresMap)
      .map((st) => ({
        name: st.name,
        admissionNumber: st.admissionNumber,
        average: Math.round((st.totalMarks / st.subjectCount) * 10) / 10,
        subjectsCount: st.subjectCount,
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 5);

    // ── Compute Financials & Collections ──────────────────────────────────────
    let totalInvoiced = 0;
    let totalCollected = 0;
    let paidInvoicesCount = 0;
    let partialInvoicesCount = 0;
    let unpaidInvoicesCount = 0;

    const debtorsList: Array<{
      studentName: string;
      admissionNumber: string;
      className: string;
      totalInvoiced: number;
      paidAmount: number;
      balance: number;
    }> = [];

    invoices.forEach((inv) => {
      const invTotal = Number(inv.totalAmount || 0);
      const invPaid = Number(inv.paidAmount || 0);
      const invBalance = invTotal - invPaid;

      totalInvoiced += invTotal;
      totalCollected += invPaid;

      if (inv.status === InvoiceStatus.PAID) paidInvoicesCount++;
      else if (inv.status === InvoiceStatus.PARTIAL) partialInvoicesCount++;
      else if (inv.status === InvoiceStatus.UNPAID) unpaidInvoicesCount++;

      if (invBalance > 0 && inv.student) {
        debtorsList.push({
          studentName:
            `${inv.student.firstName} ${inv.student.lastName}`.trim(),
          admissionNumber: inv.student.admissionNumber || 'N/A',
          className:
            inv.student.enrollments[0]?.classSection?.name || 'Enrolled',
          totalInvoiced: invTotal,
          paidAmount: invPaid,
          balance: invBalance,
        });
      }
    });

    const totalOutstanding = totalInvoiced - totalCollected;
    const collectionEfficiency =
      totalInvoiced > 0
        ? Math.round((totalCollected / totalInvoiced) * 1000) / 10
        : 0;

    // ── Compute Attendance Compliance ─────────────────────────────────────────
    let totalRollCalls = 0;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;

    attendanceStats.forEach((att) => {
      const cnt = att._count.id;
      totalRollCalls += cnt;
      if (att.status === AttendanceStatus.PRESENT) presentCount += cnt;
      else if (att.status === AttendanceStatus.ABSENT) absentCount += cnt;
      else if (att.status === AttendanceStatus.LATE) lateCount += cnt;
      else if (att.status === AttendanceStatus.EXCUSED) excusedCount += cnt;
    });

    const attendanceRate =
      totalRollCalls > 0
        ? Math.round(((presentCount + lateCount) / totalRollCalls) * 100)
        : 100;

    // ── Compute Facilities & Operations ───────────────────────────────────────
    let activeLoansCount = 0;
    let overdueLoansCount = 0;
    let returnedLoansCount = 0;

    loanStats.forEach((ln) => {
      if (ln.status === LoanStatus.ACTIVE) activeLoansCount += ln._count.id;
      else if (ln.status === LoanStatus.OVERDUE)
        overdueLoansCount += ln._count.id;
      else if (ln.status === LoanStatus.RETURNED)
        returnedLoansCount += ln._count.id;
    });

    let totalBusCapacity = 0;
    buses.forEach((b) => {
      if (b.isActive) totalBusCapacity += b.capacity || 0;
    });

    const fleetOccupancyRate =
      totalBusCapacity > 0
        ? Math.round((transportRiders / totalBusCapacity) * 100)
        : 0;

    return {
      generatedAt: new Date().toISOString(),
      school: {
        name: school?.name || 'Bright Future Academy',
        code: 'BFA-KASHERE',
        address:
          school?.address ||
          'Behind L.E.A Primary School Tumburu Kashere, Akko LGA, Gombe State',
        phone: school?.phone || '08029839848',
        email: school?.email || 'brightfutureacademykashere@gmail.com',
        motto: 'Excellence and Character',
      },
      demographics: {
        totalStudents,
        activeStudents,
        maleCount,
        femaleCount,
        malePercentage:
          totalStudents > 0 ? Math.round((maleCount / totalStudents) * 100) : 0,
        femalePercentage:
          totalStudents > 0
            ? Math.round((femaleCount / totalStudents) * 100)
            : 0,
        levelCounts,
        classBreakdown,
        totalStaff,
        teachingStaff: teachersCount,
        supportStaff: supportStaff.length,
      },
      academics: {
        totalScores,
        schoolAverageScore,
        gradeDistribution,
        subjectsSummary,
        honorRoll,
      },
      financials: {
        totalInvoiced,
        totalCollected,
        totalOutstanding,
        collectionEfficiency,
        invoicesBreakdown: {
          paid: paidInvoicesCount,
          partial: partialInvoicesCount,
          unpaid: unpaidInvoicesCount,
          total: invoices.length,
        },
        topDebtors: debtorsList.slice(0, 10),
      },
      attendance: {
        totalRollCalls,
        presentCount,
        absentCount,
        lateCount,
        excusedCount,
        attendanceRate,
      },
      operations: {
        library: {
          totalTitles: totalBooksCount,
          totalPhysicalCopies: booksSum._sum?.totalCopies || 0,
          copiesAvailable: booksSum._sum?.availableCopies || 0,
          activeLoans: activeLoansCount,
          overdueLoans: overdueLoansCount,
          returnedLoans: returnedLoansCount,
        },
        transport: {
          totalBuses: buses.length,
          activeBuses: buses.filter((b) => b.isActive).length,
          totalCapacity: totalBusCapacity,
          registeredRiders: transportRiders,
          fleetOccupancyRate,
        },
      },
    };
  }
}
