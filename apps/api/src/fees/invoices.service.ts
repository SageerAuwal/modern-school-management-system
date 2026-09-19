import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import {
  CreateInvoiceDto,
  BulkCreateInvoicesDto,
  RecordCashPaymentDto,
  InitiatePaystackDto,
  PayOnlineDto,
} from './dto/invoice.dto';
import { InvoiceStatus, PaymentStatus, PaymentMethod, EnrollmentStatus } from '@prisma/client';
import * as crypto from 'crypto';

// ── Paystack API helper ──────────────────────────────────────────────────────
async function paystackRequest(
  path: string,
  method: 'GET' | 'POST',
  secretKey: string,
  body?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch(`https://api.paystack.co${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json() as Promise<Record<string, unknown>>;
}

// ── Invoice status helper ────────────────────────────────────────────────────
function resolveStatus(totalAmount: number, paidAmount: number): InvoiceStatus {
  if (paidAmount <= 0) return InvoiceStatus.UNPAID;
  if (paidAmount >= totalAmount) return InvoiceStatus.PAID;
  return InvoiceStatus.PARTIAL;
}

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly config: ConfigService,
  ) {}

  // ── Create single invoice ─────────────────────────────────────────────────

  async create(dto: CreateInvoiceDto, schoolId: string, actorId: string, actorEmail: string) {
    const student = await this.prisma.student.findFirst({ where: { id: dto.studentId, schoolId } });
    if (!student) throw new NotFoundException('Student not found');

    if (dto.termId) {
      const existing = await this.prisma.invoice.findFirst({
        where: {
          schoolId,
          studentId: dto.studentId,
          termId: dto.termId,
          academicYear: dto.academicYear,
          status: { notIn: [InvoiceStatus.CANCELLED] },
        },
      });
      if (existing) {
        throw new BadRequestException('An active invoice already exists for this student for the selected term');
      }
    }

    const totalAmount = dto.items.reduce((sum, i) => sum + i.amount, 0);

    const invoice = await this.prisma.invoice.create({
      data: {
        schoolId,
        studentId: dto.studentId,
        termId: dto.termId,
        academicYear: dto.academicYear,
        totalAmount,
        paidAmount: 0,
        status: InvoiceStatus.UNPAID,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        notes: dto.notes,
        createdById: actorId,
        items: {
          create: dto.items.map((item) => ({
            feeStructureId: item.feeStructureId,
            name: item.name,
            amount: item.amount,
          })),
        },
      },
      include: {
        items: true,
        student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
        term: { select: { id: true, name: true } },
      },
    });

    await this.auditService.log({ actorId, actorEmail, action: 'INVOICE_CREATED', targetType: 'INVOICE', targetId: invoice.id, afterValue: { studentId: dto.studentId, totalAmount, academicYear: dto.academicYear } as Record<string, unknown> });
    return invoice;
  }

  // ── Bulk create invoices for an entire class ──────────────────────────────

  async bulkCreate(dto: BulkCreateInvoicesDto, schoolId: string, actorId: string, actorEmail: string) {
    const section = await this.prisma.classSection.findFirst({ where: { id: dto.classSectionId, schoolId } });
    if (!section) throw new NotFoundException('Class section not found');

    const enrollments = await this.prisma.enrollment.findMany({
      where: { classSectionId: dto.classSectionId, status: EnrollmentStatus.ACTIVE },
      select: { studentId: true },
    });
    if (enrollments.length === 0) throw new BadRequestException('No active students in this class');

    let targetEnrollments = enrollments;
    if (dto.termId) {
      const existingInvoices = await this.prisma.invoice.findMany({
        where: {
          schoolId,
          studentId: { in: enrollments.map((e) => e.studentId) },
          termId: dto.termId,
          academicYear: dto.academicYear,
          status: { notIn: [InvoiceStatus.CANCELLED] },
        },
        select: { studentId: true },
      });
      const existingSet = new Set(existingInvoices.map((i) => i.studentId));
      targetEnrollments = enrollments.filter((e) => !existingSet.has(e.studentId));
      if (targetEnrollments.length === 0) {
        throw new BadRequestException('All students in this class already have invoices for the selected term');
      }
    }

    const totalAmount = dto.items.reduce((sum, i) => sum + i.amount, 0);

    const created = await Promise.all(
      targetEnrollments.map((e) =>
        this.prisma.invoice.create({
          data: {
            schoolId,
            studentId: e.studentId,
            termId: dto.termId,
            academicYear: dto.academicYear,
            totalAmount,
            paidAmount: 0,
            status: InvoiceStatus.UNPAID,
            dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
            createdById: actorId,
            items: { create: dto.items.map((item) => ({ feeStructureId: item.feeStructureId, name: item.name, amount: item.amount })) },
          },
        }),
      ),
    );

    await this.auditService.log({ actorId, actorEmail, action: 'INVOICES_BULK_CREATED', targetType: 'INVOICE', targetId: dto.classSectionId, afterValue: { count: created.length, totalAmount, academicYear: dto.academicYear } as Record<string, unknown> });
    return { created: created.length, totalAmount, academicYear: dto.academicYear };
  }

  // ── Get invoices ──────────────────────────────────────────────────────────

  async findAll(
    schoolId: string,
    filters: { studentId?: string; status?: string; academicYear?: string; termId?: string },
    actor?: { id: string; role?: string; email?: string; firstName?: string; lastName?: string },
  ) {
    let studentIdCondition: any = filters.studentId ? filters.studentId : undefined;

    if (actor?.role === "PARENT") {
      const guardianLinks = await this.prisma.guardianLink.findMany({
        where: { guardianId: actor.id },
        select: { studentId: true },
      });
      const myStudentIds = guardianLinks.map((l) => l.studentId);
      if (filters.studentId) {
        studentIdCondition = myStudentIds.includes(filters.studentId) ? filters.studentId : { in: [] };
      } else {
        studentIdCondition = { in: myStudentIds };
      }
    } else if (actor?.role === "STUDENT") {
      let student = await this.prisma.student.findFirst({
        where: {
          schoolId,
          firstName: { equals: actor.firstName, mode: 'insensitive' },
          lastName: { equals: actor.lastName, mode: 'insensitive' },
        },
      });
      if (!student && actor.email) {
        const emailLocal = actor.email.split('@')[0];
        const namePart = emailLocal.replace(/^student\./i, '');
        student = await this.prisma.student.findFirst({
          where: {
            schoolId,
            firstName: { equals: namePart, mode: 'insensitive' },
          },
        });
      }
      if (student) {
        studentIdCondition = student.id;
      } else {
        studentIdCondition = '__none__';
      }
    }

    return this.prisma.invoice.findMany({
      where: {
        schoolId,
        ...(studentIdCondition ? { studentId: studentIdCondition } : {}),
        ...(filters.status ? { status: filters.status as InvoiceStatus } : {}),
        ...(filters.academicYear ? { academicYear: filters.academicYear } : {}),
        ...(filters.termId ? { termId: filters.termId } : {}),
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
        term: { select: { id: true, name: true } },
        items: true,
        _count: { select: { payments: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, schoolId: string, actor?: { id: string; role?: string; email?: string; firstName?: string; lastName?: string }) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id, schoolId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
        term: { select: { id: true, name: true } },
        items: true,
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!inv) throw new NotFoundException('Invoice not found');

    if (actor?.role === 'PARENT') {
      const link = await this.prisma.guardianLink.findFirst({
        where: { guardianId: actor.id, studentId: inv.studentId },
      });
      if (!link) {
        throw new ForbiddenException('You do not have permission to view this invoice');
      }
    } else if (actor?.role === 'STUDENT') {
      let student = await this.prisma.student.findFirst({
        where: {
          schoolId,
          firstName: { equals: actor.firstName, mode: 'insensitive' },
          lastName: { equals: actor.lastName, mode: 'insensitive' },
        },
      });
      if (!student && actor.email) {
        const emailLocal = actor.email.split('@')[0];
        const namePart = emailLocal.replace(/^student\./i, '');
        student = await this.prisma.student.findFirst({
          where: {
            schoolId,
            firstName: { equals: namePart, mode: 'insensitive' },
          },
        });
      }
      if (!student || student.id !== inv.studentId) {
        throw new ForbiddenException('You do not have permission to view this invoice');
      }
    }

    return inv;
  }

  async cancel(id: string, schoolId: string, actorId: string, actorEmail: string) {
    const inv = await this.findOne(id, schoolId);
    if (inv.status === InvoiceStatus.PAID) throw new BadRequestException('Cannot cancel a paid invoice');
    const updated = await this.prisma.invoice.update({ where: { id }, data: { status: InvoiceStatus.CANCELLED } });
    await this.auditService.log({ actorId, actorEmail, action: 'INVOICE_CANCELLED', targetType: 'INVOICE', targetId: id });
    return updated;
  }

  async waive(id: string, schoolId: string, reason: string, actorId: string, actorEmail: string) {
    const inv = await this.findOne(id, schoolId);
    if (inv.status === InvoiceStatus.PAID) throw new BadRequestException('Invoice already paid');
    const updated = await this.prisma.invoice.update({ where: { id }, data: { status: InvoiceStatus.WAIVED, notes: reason } });
    await this.auditService.log({ actorId, actorEmail, action: 'INVOICE_WAIVED', targetType: 'INVOICE', targetId: id, afterValue: { reason } as Record<string, unknown> });
    return updated;
  }

  // ── Cash / Bank Deposit Payment ───────────────────────────────────────────

  async recordCashPayment(invoiceId: string, dto: RecordCashPaymentDto, schoolId: string, actorId: string, actorEmail: string) {
    const inv = await this.findOne(invoiceId, schoolId);
    if ((['PAID', 'CANCELLED', 'WAIVED'] as string[]).includes(inv.status as string)) {
      throw new BadRequestException(`Invoice is ${inv.status} — cannot record payment`);
    }

    const remaining = inv.totalAmount - inv.paidAmount;
    if (dto.amount > remaining) {
      throw new BadRequestException(`Amount ₦${dto.amount} exceeds outstanding balance ₦${remaining}`);
    }

    const reference = `CASH-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const newPaid = inv.paidAmount + dto.amount;
    const newStatus = resolveStatus(inv.totalAmount, newPaid);

    const [payment] = await this.prisma.$transaction([
      this.prisma.payment.create({
        data: {
          schoolId,
          invoiceId,
          amount: dto.amount,
          method: dto.method === 'CASH' ? 'CASH' : 'BANK_DEPOSIT',
          status: PaymentStatus.SUCCESS,
          reference,
          paidAt: new Date(),
          recordedById: actorId,
          notes: dto.notes,
        },
      }),
      this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { paidAmount: newPaid, status: newStatus },
      }),
    ]);

    await this.auditService.log({ actorId, actorEmail, action: 'PAYMENT_RECORDED_CASH', targetType: 'PAYMENT', targetId: payment.id, afterValue: { invoiceId, amount: dto.amount, method: dto.method, reference } as Record<string, unknown> });
    return { payment, invoice: { id: invoiceId, paidAmount: newPaid, status: newStatus } };
  }

  // ── Online Payment (Instant Card / Bank Transfer Settlement) ──────────────

  async payOnline(
    invoiceId: string,
    dto: PayOnlineDto,
    schoolId: string,
    actorId: string,
    actorEmail: string,
    actor: any,
  ) {
    const inv = await this.findOne(invoiceId, schoolId, actor);
    if ((['PAID', 'CANCELLED', 'WAIVED'] as string[]).includes(inv.status as string)) {
      throw new BadRequestException(`Invoice is ${inv.status} — cannot process payment`);
    }

    const remaining = inv.totalAmount - inv.paidAmount;
    const paymentAmount = dto.amount ? Number(dto.amount) : remaining;
    if (paymentAmount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }
    if (paymentAmount > remaining) {
      throw new BadRequestException(`Amount ₦${paymentAmount} exceeds outstanding balance ₦${remaining}`);
    }

    const reference = `TXN-ONL-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const newPaid = inv.paidAmount + paymentAmount;
    const newStatus = resolveStatus(inv.totalAmount, newPaid);
    const paymentMethod = dto.method === 'BANK_DEPOSIT' ? PaymentMethod.BANK_DEPOSIT : PaymentMethod.PAYSTACK;

    const [payment, updatedInvoice] = await this.prisma.$transaction([
      this.prisma.payment.create({
        data: {
          schoolId,
          invoiceId,
          amount: paymentAmount,
          method: paymentMethod,
          status: PaymentStatus.SUCCESS,
          reference,
          paidAt: new Date(),
          recordedById: actorId,
          notes: dto.notes || `Online payment via ${dto.method || 'ONLINE_CARD'}${dto.cardLast4 ? ` (ending in ${dto.cardLast4})` : ''}`,
        },
      }),
      this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { paidAmount: newPaid, status: newStatus },
        include: {
          student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
          term: { select: { id: true, name: true, academicYear: true } },
          items: true,
          payments: { orderBy: { createdAt: 'desc' } },
        },
      }),
    ]);

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'PAYMENT_RECORDED_ONLINE',
      targetType: 'PAYMENT',
      targetId: payment.id,
      afterValue: {
        invoiceId,
        amount: paymentAmount,
        method: paymentMethod,
        reference,
        newStatus,
      } as Record<string, unknown>,
    });

    return {
      success: true,
      message: 'Payment completed successfully',
      payment,
      invoice: updatedInvoice,
    };
  }

  // ── Initiate Paystack Payment ─────────────────────────────────────────────

  async initiatePaystack(invoiceId: string, dto: InitiatePaystackDto, schoolId: string, actorId: string, actorEmail: string) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, schoolId },
      include: { student: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!inv) throw new NotFoundException('Invoice not found');
    if ((['PAID', 'CANCELLED', 'WAIVED'] as string[]).includes(inv.status as string)) {
      throw new BadRequestException(`Invoice is ${inv.status}`);
    }

    const outstanding = inv.totalAmount - inv.paidAmount;
    if (outstanding <= 0) throw new BadRequestException('No outstanding balance');

    const secretKey = this.config.getOrThrow<string>('PAYSTACK_SECRET_KEY');
    const reference = `PS-${invoiceId.slice(0, 8)}-${Date.now()}`;
    const email = actorEmail; // parent's email (logged in user)

    const paystackRes = await paystackRequest('/transaction/initialize', 'POST', secretKey, {
      email,
      amount: Math.round(outstanding * 100), // Paystack uses kobo (100ths of naira)
      reference,
      callback_url: dto.callbackUrl,
      metadata: {
        invoiceId,
        studentId: inv.studentId,
        studentName: `${inv.student.firstName} ${inv.student.lastName}`,
        schoolId,
      },
    });

    if (!paystackRes.status) {
      throw new BadRequestException('Paystack initialization failed');
    }

    const data = paystackRes.data as Record<string, unknown>;

    // Create a PENDING payment record
    await this.prisma.payment.create({
      data: {
        schoolId,
        invoiceId,
        amount: outstanding,
        method: 'PAYSTACK',
        status: PaymentStatus.PENDING,
        reference,
        paystackRef: reference,
        recordedById: actorId,
        metadata: JSON.parse(JSON.stringify(paystackRes)),
      },
    });

    return {
      authorizationUrl: data.authorization_url,
      reference,
      amount: outstanding,
    };
  }

  // ── Paystack Webhook Handler ──────────────────────────────────────────────
  // Called by Paystack server — HMAC signature must be verified first.

  async handlePaystackWebhook(payload: Record<string, unknown>, signature: string, rawBody: Buffer) {
    const secretKey = this.config.getOrThrow<string>('PAYSTACK_SECRET_KEY');

    // Verify HMAC-SHA512 signature — reject if invalid
    const hash = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');
    if (hash !== signature) {
      throw new BadRequestException('Invalid Paystack webhook signature');
    }

    const event = payload.event as string;
    if (event !== 'charge.success') return { received: true }; // Ignore non-payment events

    const data = payload.data as Record<string, unknown>;
    const reference = data.reference as string;
    const metadata = data.metadata as Record<string, unknown>;
    const invoiceId = metadata?.invoiceId as string;

    if (!invoiceId || !reference) return { received: true };

    // Find the pending payment
    const payment = await this.prisma.payment.findUnique({ where: { reference } });
    if (!payment || payment.status === PaymentStatus.SUCCESS) return { received: true };

    const amountPaid = (data.amount as number) / 100; // Convert kobo → naira

    const inv = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!inv) return { received: true };

    const newPaid = inv.paidAmount + amountPaid;
    const newStatus = resolveStatus(inv.totalAmount, newPaid);

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { reference },
        data: { status: PaymentStatus.SUCCESS, paidAt: new Date(), amount: amountPaid, metadata: JSON.parse(JSON.stringify(payload)) },
      }),
      this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { paidAmount: newPaid, status: newStatus },
      }),
    ]);

    await this.auditService.log({
      action: 'PAYMENT_CONFIRMED_PAYSTACK',
      targetType: 'PAYMENT',
      targetId: payment.id,
      afterValue: { reference, amount: amountPaid, invoiceId, newStatus } as Record<string, unknown>,
    });

    return { received: true };
  }

  // ── Outstanding balances report ───────────────────────────────────────────

  async getOutstandingReport(schoolId: string, academicYear?: string) {
    const where = {
      schoolId,
      status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL] },
      ...(academicYear ? { academicYear } : {}),
    };

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
        term: { select: { id: true, name: true } },
      },
      orderBy: [{ student: { lastName: 'asc' } }],
    });

    const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.totalAmount - inv.paidAmount), 0);

    return {
      count: invoices.length,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      invoices: invoices.map((inv) => ({
        ...inv,
        outstanding: Math.round((inv.totalAmount - inv.paidAmount) * 100) / 100,
      })),
    };
  }
}
