import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentMethod, PaymentStatus, InvoiceStatus, Prisma } from '@prisma/client';
import { CollectFeeDto, CloseDrawerDto } from './dto/bursar.dto';

@Injectable()
export class BursarService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch today's active cash drawer for the logged-in Bursar,
   * with real-time aggregated payment totals.
   */
  async getDailyDrawer(schoolId: string, bursarId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let drawer = await this.prisma.dailyCashDrawer.findFirst({
      where: {
        schoolId,
        bursarId,
        date: today,
      },
    });

    if (!drawer) {
      drawer = await this.prisma.dailyCashDrawer.create({
        data: {
          schoolId,
          bursarId,
          date: today,
          openingCash: 0,
          cashCollected: 0,
          posCollected: 0,
          transferTotal: 0,
          status: 'OPEN',
        },
      });
    }

    // Calculate real-time payment totals recorded by this bursar today
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayPayments = await this.prisma.payment.findMany({
      where: {
        schoolId,
        recordedById: bursarId,
        status: PaymentStatus.SUCCESS,
        paidAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        invoice: {
          include: {
            student: {
              select: { firstName: true, lastName: true, admissionNumber: true },
            },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    let cashTotal = 0;
    let posTotal = 0;
    let transferTotal = 0;

    for (const p of todayPayments) {
      if (p.method === PaymentMethod.CASH) {
        cashTotal += p.amount;
      } else if (p.method === PaymentMethod.POS_TERMINAL) {
        posTotal += p.amount;
      } else {
        transferTotal += p.amount;
      }
    }

    // Sync drawer totals if still OPEN
    if (drawer.status === 'OPEN') {
      drawer = await this.prisma.dailyCashDrawer.update({
        where: { id: drawer.id },
        data: {
          cashCollected: cashTotal,
          posCollected: posTotal,
          transferTotal: transferTotal,
        },
      });
    }

    return {
      drawer,
      summary: {
        cashTotal,
        posTotal,
        transferTotal,
        grandTotal: cashTotal + posTotal + transferTotal,
        transactionsCount: todayPayments.length,
      },
      recentPayments: todayPayments.slice(0, 15).map((p) => ({
        id: p.id,
        reference: p.reference,
        amount: p.amount,
        method: p.method,
        paidAt: p.paidAt,
        studentName: `${p.invoice.student.firstName} ${p.invoice.student.lastName}`,
        admissionNumber: p.invoice.student.admissionNumber,
      })),
    };
  }

  /**
   * Close today's cash drawer and record physical cash count & handover reconciliation.
   */
  async closeDailyDrawer(dto: CloseDrawerDto, schoolId: string, bursarId: string, bursarName: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const drawer = await this.prisma.dailyCashDrawer.findFirst({
      where: { schoolId, bursarId, date: today },
    });

    if (!drawer) {
      throw new NotFoundException('No active cash drawer found for today');
    }

    const difference = dto.closingCash - drawer.cashCollected;

    const closed = await this.prisma.dailyCashDrawer.update({
      where: { id: drawer.id },
      data: {
        closingCash: dto.closingCash,
        difference,
        status: 'CLOSED',
        closureNotes: dto.closureNotes,
        closedAt: new Date(),
      },
    });

    // Write financial audit log
    await this.prisma.financialAuditLog.create({
      data: {
        schoolId,
        actorId: bursarId,
        actorName: bursarName,
        action: 'DRAWER_CLOSED',
        amount: dto.closingCash,
        details: {
          expectedCash: drawer.cashCollected,
          countedCash: dto.closingCash,
          difference,
          posCollected: drawer.posCollected,
          transferTotal: drawer.transferTotal,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      message: 'Cash drawer closed and reconciled successfully.',
      drawer: closed,
      reconciliation: {
        expectedCash: drawer.cashCollected,
        countedCash: dto.closingCash,
        difference,
        isBalanced: difference === 0,
      },
    };
  }

  /**
   * Counter Cashier Collection Desk:
   * Collects fee, generates unbroken atomic sequential receipt number, updates invoice & student balances.
   */
  async collectFee(dto: CollectFeeDto, schoolId: string, bursarId: string, bursarName: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, schoolId },
      include: {
        enrollments: {
          where: { status: 'ACTIVE' },
          include: { classSection: true },
          take: 1,
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student record not found in school database');
    }

    // 1. Resolve or create invoice
    let invoice = dto.invoiceId
      ? await this.prisma.invoice.findFirst({ where: { id: dto.invoiceId, schoolId } })
      : await this.prisma.invoice.findFirst({
          where: {
            studentId: student.id,
            schoolId,
            status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL] },
          },
          orderBy: { createdAt: 'desc' },
        });

    if (!invoice) {
      // Create a default general term invoice if none exists
      invoice = await this.prisma.invoice.create({
        data: {
          schoolId,
          studentId: student.id,
          academicYear: '2025/2026',
          totalAmount: dto.amount,
          paidAmount: 0,
          status: InvoiceStatus.UNPAID,
          createdById: bursarId,
        },
      });
    }

    // 2. Atomically increment ReceiptSequence
    const currentYear = new Date().getFullYear();
    const seq = await this.prisma.receiptSequence.upsert({
      where: { schoolId },
      update: { lastNumber: { increment: 1 } },
      create: {
        schoolId,
        prefix: 'BFA-REC',
        currentYear,
        lastNumber: 1,
      },
    });

    const receiptNumber = `${seq.prefix}-${seq.currentYear}-${String(seq.lastNumber).padStart(4, '0')}`;

    // 3. Create Payment record
    const payment = await this.prisma.payment.create({
      data: {
        schoolId,
        invoiceId: invoice.id,
        amount: dto.amount,
        method: dto.method,
        status: PaymentStatus.SUCCESS,
        reference: receiptNumber,
        paystackRef: dto.externalReference || undefined,
        paidAt: new Date(),
        recordedById: bursarId,
        notes: dto.notes,
        metadata: dto.allocations
          ? ({ allocations: dto.allocations } as unknown as Prisma.InputJsonValue)
          : undefined,
      },
    });

    // 4. Update Invoice balance and status
    const newPaidAmount = invoice.paidAmount + dto.amount;
    const newStatus =
      newPaidAmount >= invoice.totalAmount ? InvoiceStatus.PAID : InvoiceStatus.PARTIAL;

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
      },
    });

    // 5. Update Today's Cash Drawer
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const drawerField =
      dto.method === PaymentMethod.CASH
        ? 'cashCollected'
        : dto.method === PaymentMethod.POS_TERMINAL
        ? 'posCollected'
        : 'transferTotal';

    await this.prisma.dailyCashDrawer.upsert({
      where: {
        schoolId_bursarId_date: {
          schoolId,
          bursarId,
          date: today,
        },
      },
      update: {
        [drawerField]: { increment: dto.amount },
      },
      create: {
        schoolId,
        bursarId,
        date: today,
        [drawerField]: dto.amount,
      },
    });

    // 6. Write Financial Audit Log
    await this.prisma.financialAuditLog.create({
      data: {
        schoolId,
        actorId: bursarId,
        actorName: bursarName,
        action: 'RECEIPT_ISSUED',
        studentId: student.id,
        invoiceId: invoice.id,
        amount: dto.amount,
        details: {
          receiptNumber,
          paymentMethod: dto.method,
          previousPaid: invoice.paidAmount,
          newPaid: newPaidAmount,
          invoiceTotal: invoice.totalAmount,
          balanceRemaining: Math.max(0, invoice.totalAmount - newPaidAmount),
          allocations: dto.allocations,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    // 7. Fetch school info for certified receipt
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        name: true,
        address: true,
        phone: true,
        email: true,
        state: true,
        lga: true,
      },
    });

    const activeClass = student.enrollments[0]?.classSection?.name || 'Class Unassigned';
    const balanceRemaining = Math.max(0, invoice.totalAmount - newPaidAmount);

    return {
      paymentId: payment.id,
      receiptNumber,
      paidAt: payment.paidAt,
      amount: dto.amount,
      method: dto.method,
      balanceRemaining,
      invoiceTotal: invoice.totalAmount,
      invoiceStatus: newStatus,
      school,
      student: {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        gender: student.gender,
        classSection: activeClass,
      },
      cashier: {
        id: bursarId,
        name: bursarName,
        role: 'School Bursar / Finance Cashier',
      },
      allocations: dto.allocations || [
        { name: 'School Term Fees & Levies', amount: dto.amount },
      ],
      notes: dto.notes,
    };
  }

  /**
   * Student Statement of Account (Full Financial Ledger).
   */
  async getStudentStatement(studentId: string, schoolId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: {
        enrollments: {
          where: { status: 'ACTIVE' },
          include: { classSection: true },
          take: 1,
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student record not found');
    }

    const invoices = await this.prisma.invoice.findMany({
      where: { studentId, schoolId },
      include: {
        items: {
          include: { feeStructure: true },
        },
        payments: {
          where: { status: PaymentStatus.SUCCESS },
          orderBy: { paidAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalBilled = 0;
    let totalPaid = 0;
    const ledgerEntries: any[] = [];

    for (const inv of invoices) {
      totalBilled += inv.totalAmount;
      ledgerEntries.push({
        date: inv.createdAt,
        type: 'DEBIT',
        description: `Term Invoice (${inv.academicYear})`,
        reference: `INV-${inv.id.slice(0, 8)}`,
        amount: inv.totalAmount,
      });

      for (const p of inv.payments) {
        totalPaid += p.amount;
        ledgerEntries.push({
          date: p.paidAt || p.createdAt,
          type: 'CREDIT',
          description: `Fee Payment (${p.method})`,
          reference: p.reference,
          amount: p.amount,
        });
      }
    }

    // Sort entries chronologically
    ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate rolling balance
    let runningBalance = 0;
    for (const e of ledgerEntries) {
      if (e.type === 'DEBIT') {
        runningBalance += e.amount;
      } else {
        runningBalance -= e.amount;
      }
      e.runningBalance = runningBalance;
    }

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, address: true, phone: true, email: true },
    });

    return {
      school,
      student: {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        gender: student.gender,
        classSection: student.enrollments[0]?.classSection?.name || 'Unassigned',
      },
      summary: {
        totalBilled,
        totalPaid,
        netBalance: Math.max(0, totalBilled - totalPaid),
      },
      ledgerEntries,
      invoices,
    };
  }

  /**
   * Debtors Aging and Balance Defaulters Report.
   */
  async getDebtorsList(schoolId: string, classSectionId?: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        schoolId,
        status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL] },
        ...(classSectionId
          ? {
              student: {
                enrollments: {
                  some: { classSectionId, status: 'ACTIVE' },
                },
              },
            }
          : {}),
      },
      include: {
        student: {
          include: {
            enrollments: {
              where: { status: 'ACTIVE' },
              include: { classSection: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const debtors = invoices.map((inv) => {
      const balance = inv.totalAmount - inv.paidAmount;
      const daysOverdue = Math.floor(
        (Date.now() - new Date(inv.createdAt).getTime()) / (1000 * 60 * 60 * 24),
      );

      let agingCategory = 'Current Term (0-30 Days)';
      if (daysOverdue > 60) {
        agingCategory = 'Severely Overdue (60+ Days)';
      } else if (daysOverdue > 30) {
        agingCategory = 'Overdue (31-60 Days)';
      }

      return {
        invoiceId: inv.id,
        studentId: inv.student.id,
        studentName: `${inv.student.firstName} ${inv.student.lastName}`,
        admissionNumber: inv.student.admissionNumber,
        className: inv.student.enrollments[0]?.classSection?.name || 'Unassigned',
        totalBilled: inv.totalAmount,
        paidAmount: inv.paidAmount,
        outstandingBalance: balance,
        daysOverdue,
        agingCategory,
        createdAt: inv.createdAt,
        parentName: inv.student.guardianName || 'Guardian on File',
        parentPhone: inv.student.guardianPhone || inv.student.emergencyContactPhone || 'No Phone',
      };
    });

    const totalOutstanding = debtors.reduce((sum, d) => sum + d.outstandingBalance, 0);

    return {
      debtorsCount: debtors.length,
      totalOutstanding,
      debtors,
    };
  }

  /**
   * Retrieve official receipt data by Payment ID for reprint.
   */
  async getReceiptByPaymentId(paymentId: string, schoolId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, schoolId },
      include: {
        recordedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
        invoice: {
          include: {
            student: {
              include: {
                enrollments: {
                  where: { status: 'ACTIVE' },
                  include: { classSection: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Receipt payment record not found');
    }

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, address: true, phone: true, email: true, state: true, lga: true },
    });

    const meta = payment.metadata as any;
    const balanceRemaining = Math.max(0, payment.invoice.totalAmount - payment.invoice.paidAmount);

    return {
      paymentId: payment.id,
      receiptNumber: payment.reference,
      paidAt: payment.paidAt || payment.createdAt,
      amount: payment.amount,
      method: payment.method,
      balanceRemaining,
      invoiceTotal: payment.invoice.totalAmount,
      invoiceStatus: payment.invoice.status,
      school,
      student: {
        id: payment.invoice.student.id,
        name: `${payment.invoice.student.firstName} ${payment.invoice.student.lastName}`,
        admissionNumber: payment.invoice.student.admissionNumber,
        gender: payment.invoice.student.gender,
        classSection: payment.invoice.student.enrollments[0]?.classSection?.name || 'Unassigned',
      },
      cashier: {
        id: payment.recordedById,
        name: `${payment.recordedBy.firstName} ${payment.recordedBy.lastName}`,
        role: 'School Bursar / Finance Cashier',
      },
      allocations: meta?.allocations || [
        { name: 'School Term Fees & Levies', amount: payment.amount },
      ],
      notes: payment.notes,
    };
  }
}
