import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceStatus, LoanStatus, EnrollmentStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Main overview ─────────────────────────────────────────────────────────

  async getOverview(schoolId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalStudents,
      totalStaff,
      totalClasses,
      totalTeachers,
      unpaidInvoices,
      booksOnLoan,
      overdueLoans,
      todayAttendance,
      totalStudentsForAttendance,
      totalBuses,
    ] = await Promise.all([
      // Active enrolled students
      this.prisma.student.count({
        where: { schoolId, enrollmentStatus: EnrollmentStatus.ACTIVE },
      }),
      // Staff records
      this.prisma.staffRecord.count({ where: { schoolId, isActive: true } }),
      // Active class sections
      this.prisma.classSection.count({ where: { schoolId, isActive: true } }),
      // Portal users who are teachers
      this.prisma.user.count({ where: { schoolId, role: 'TEACHER', isActive: true } }),
      // Unpaid + partial invoices aggregate
      this.prisma.invoice.aggregate({
        where: { schoolId, status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL] } },
        _sum: { totalAmount: true, paidAmount: true },
        _count: { id: true },
      }),
      // Books currently on loan (ACTIVE + OVERDUE)
      this.prisma.bookLoan.count({
        where: { schoolId, status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] } },
      }),
      // Overdue book loans
      this.prisma.bookLoan.count({ where: { schoolId, status: LoanStatus.OVERDUE } }),
      // Today's attendance records
      this.prisma.attendanceRecord.count({ where: { schoolId, date: today } }),
      // Total active students (for attendance rate denominator)
      this.prisma.enrollment.count({
        where: { classSection: { schoolId }, status: EnrollmentStatus.ACTIVE },
      }),
      // Buses
      this.prisma.bus.count({ where: { schoolId, isActive: true } }),
    ]);

    const outstandingAmount =
      (unpaidInvoices._sum.totalAmount ?? 0) - (unpaidInvoices._sum.paidAmount ?? 0);
    const attendanceRate =
      totalStudentsForAttendance > 0
        ? Math.round((todayAttendance / totalStudentsForAttendance) * 100)
        : null;

    return {
      students: { total: totalStudents, enrolled: totalStudentsForAttendance },
      staff: { records: totalStaff, teachers: totalTeachers },
      classes: totalClasses,
      buses: totalBuses,
      fees: {
        unpaidCount: unpaidInvoices._count.id,
        outstandingAmount: Math.round(outstandingAmount * 100) / 100,
      },
      library: { onLoan: booksOnLoan, overdue: overdueLoans },
      attendance: {
        todayMarked: todayAttendance,
        rate: attendanceRate,
      },
    };
  }

  // ── Alerts ────────────────────────────────────────────────────────────────

  async getAlerts(schoolId: string) {
    const now = new Date();

    const [overdueBooks, highUnpaid, busesFull] = await Promise.all([
      // Overdue books — top 5
      this.prisma.bookLoan.findMany({
        where: { schoolId, status: LoanStatus.OVERDUE },
        include: {
          book: { select: { title: true } },
          student: { select: { firstName: true, lastName: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
      // Invoices with largest outstanding balance
      this.prisma.invoice.findMany({
        where: { schoolId, status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL] } },
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
          term: { select: { name: true } },
        },
        orderBy: { totalAmount: 'desc' },
        take: 5,
      }),
      // Buses at 90%+ capacity
      this.prisma.bus.findMany({
        where: { schoolId, isActive: true },
        include: { _count: { select: { studentAssignments: { where: { isActive: true } } } } },
      }),
    ]);

    const busesNearFull = busesFull
      .filter((b) => b._count.studentAssignments / b.capacity >= 0.9)
      .map((b) => ({
        id: b.id,
        name: b.name,
        plateNumber: b.plateNumber,
        assigned: b._count.studentAssignments,
        capacity: b.capacity,
        occupancy: Math.round((b._count.studentAssignments / b.capacity) * 100),
      }));

    const overdueWithDays = overdueBooks.map((loan) => ({
      id: loan.id,
      bookTitle: loan.book.title,
      borrower: loan.borrowerName,
      student: loan.student,
      dueDate: loan.dueDate,
      daysOverdue: Math.ceil((now.getTime() - loan.dueDate.getTime()) / 86400000),
      estimatedFine: Math.ceil((now.getTime() - loan.dueDate.getTime()) / 86400000) * 50,
    }));

    const unpaidWithBalance = highUnpaid.map((inv) => ({
      id: inv.id,
      student: inv.student,
      term: inv.term?.name,
      totalAmount: inv.totalAmount,
      paidAmount: inv.paidAmount,
      outstanding: inv.totalAmount - inv.paidAmount,
    }));

    return {
      overdueBooks: { count: overdueBooks.length, items: overdueWithDays },
      unpaidFees: { count: unpaidWithBalance.length, items: unpaidWithBalance },
      busesNearFull: { count: busesNearFull.length, items: busesNearFull },
    };
  }

  // ── Enrollment breakdown by class ─────────────────────────────────────────

  async getEnrollmentBreakdown(schoolId: string) {
    const classes = await this.prisma.classSection.findMany({
      where: { schoolId, isActive: true },
      include: {
        _count: { select: { enrollments: { where: { status: EnrollmentStatus.ACTIVE } } } },
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });

    return classes.map((c) => ({
      id: c.id,
      name: c.name,
      level: c.level,
      count: c._count.enrollments,
    }));
  }

  // ── Fee collection by term ────────────────────────────────────────────────

  async getFeeCollectionByTerm(schoolId: string) {
    const terms = await this.prisma.term.findMany({
      where: { schoolId },
      orderBy: [{ academicYear: 'desc' }, { name: 'asc' }],
      take: 6,
    });

    const data = await Promise.all(
      terms.map(async (term) => {
        const agg = await this.prisma.invoice.aggregate({
          where: { schoolId, termId: term.id },
          _sum: { totalAmount: true, paidAmount: true },
        });
        return {
          term: term.name,
          academicYear: term.academicYear,
          invoiced: agg._sum.totalAmount ?? 0,
          collected: agg._sum.paidAmount ?? 0,
        };
      }),
    );
    return data;
  }

  // ── Recent activity ───────────────────────────────────────────────────────

  async getRecentActivity(schoolId: string) {
    // AuditLog is school-agnostic — filter by recent entries, show top 15
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 15,
    });
    return logs;
  }
}
