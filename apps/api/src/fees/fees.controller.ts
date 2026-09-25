import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, Headers, RawBodyRequest, Req,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { FeeStructuresService } from './fee-structures.service';
import { InvoicesService } from './invoices.service';
import { CreateFeeStructureDto } from './dto/fee-structure.dto';
import {
  CreateInvoiceDto, BulkCreateInvoicesDto,
  RecordCashPaymentDto, InitiatePaystackDto, PayOnlineDto,
} from './dto/invoice.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// ── Fee Structures ──────────────────────────────────────────────────────────

@Controller('fees/structures')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeeStructuresController {
  constructor(private readonly feeStructuresService: FeeStructuresService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateFeeStructureDto, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.feeStructuresService.create(dto, actor.schoolId, actor.id, actor.email);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll(@Query('academicYear') year: string, @CurrentUser() actor: { schoolId: string }) {
    return this.feeStructuresService.findAll(actor.schoolId, year);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: Partial<CreateFeeStructureDto>, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.feeStructuresService.update(id, actor.schoolId, dto, actor.id, actor.email);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN)
  deactivate(@Param('id') id: string, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.feeStructuresService.deactivate(id, actor.schoolId, actor.id, actor.email);
  }
}

// ── Invoices ────────────────────────────────────────────────────────────────

@Controller('fees/invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  /** POST /api/v1/fees/invoices — create invoice for one student */
  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.invoicesService.create(dto, actor.schoolId, actor.id, actor.email);
  }

  /** POST /api/v1/fees/invoices/bulk — create invoices for entire class */
  @Post('bulk')
  @Roles(UserRole.ADMIN)
  bulkCreate(@Body() dto: BulkCreateInvoicesDto, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.invoicesService.bulkCreate(dto, actor.schoolId, actor.id, actor.email);
  }

  /** GET /api/v1/fees/invoices?studentId=&status=&academicYear= */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.PARENT, UserRole.STUDENT)
  findAll(
    @Query('studentId') studentId: string,
    @Query('status') status: string,
    @Query('academicYear') academicYear: string,
    @Query('termId') termId: string,
    @CurrentUser() actor: { id: string; schoolId: string; role?: string; email?: string; firstName?: string; lastName?: string },
  ) {
    return this.invoicesService.findAll(actor.schoolId, { studentId, status, academicYear, termId }, actor);
  }

  /** GET /api/v1/fees/invoices/outstanding — unpaid + partial balances */
  @Get('outstanding')
  @Roles(UserRole.ADMIN, UserRole.BURSAR)
  outstanding(@Query('academicYear') year: string, @CurrentUser() actor: { schoolId: string }) {
    return this.invoicesService.getOutstandingReport(actor.schoolId, year);
  }

  /** GET /api/v1/fees/invoices/payments/pending — list pending payments awaiting bursary confirmation */
  @Get('payments/pending')
  @Roles(UserRole.ADMIN, UserRole.BURSAR)
  getPendingPayments(@CurrentUser() actor: { schoolId: string }) {
    return this.invoicesService.getPendingPayments(actor.schoolId);
  }

  /** POST /api/v1/fees/invoices/payments/:paymentId/confirm — bursar confirms payment */
  @Post('payments/:paymentId/confirm')
  @Roles(UserRole.ADMIN, UserRole.BURSAR)
  confirmPayment(
    @Param('paymentId') paymentId: string,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.invoicesService.confirmPayment(paymentId, actor.schoolId, actor.id, actor.email);
  }

  /** POST /api/v1/fees/invoices/payments/:paymentId/reject — bursar rejects payment */
  @Post('payments/:paymentId/reject')
  @Roles(UserRole.ADMIN, UserRole.BURSAR)
  rejectPayment(
    @Param('paymentId') paymentId: string,
    @Body('reason') reason: string,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.invoicesService.rejectPayment(paymentId, reason, actor.schoolId, actor.id, actor.email);
  }

  /** GET /api/v1/fees/invoices/:id — invoice detail with payments */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.BURSAR, UserRole.PARENT, UserRole.STUDENT)
  findOne(@Param('id') id: string, @CurrentUser() actor: { id: string; schoolId: string; role?: string; email?: string; firstName?: string; lastName?: string }) {
    return this.invoicesService.findOne(id, actor.schoolId, actor);
  }

  /** PATCH /api/v1/fees/invoices/:id/cancel */
  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.BURSAR)
  cancel(@Param('id') id: string, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.invoicesService.cancel(id, actor.schoolId, actor.id, actor.email);
  }

  /** PATCH /api/v1/fees/invoices/:id/waive */
  @Patch(':id/waive')
  @Roles(UserRole.ADMIN)
  waive(@Param('id') id: string, @Body('reason') reason: string, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.invoicesService.waive(id, actor.schoolId, reason ?? '', actor.id, actor.email);
  }

  /** POST /api/v1/fees/invoices/:id/pay/cash — bursar records cash/bank payment */
  @Post(':id/pay/cash')
  @Roles(UserRole.ADMIN, UserRole.BURSAR)
  recordCash(@Param('id') id: string, @Body() dto: RecordCashPaymentDto, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.invoicesService.recordCashPayment(id, dto, actor.schoolId, actor.id, actor.email);
  }

  /** POST /api/v1/fees/invoices/:id/pay/paystack — initiate Paystack checkout */
  @Post(':id/pay/paystack')
  @Roles(UserRole.ADMIN, UserRole.PARENT, UserRole.STUDENT)
  initiatePaystack(@Param('id') id: string, @Body() dto: InitiatePaystackDto, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.invoicesService.initiatePaystack(id, dto, actor.schoolId, actor.id, actor.email);
  }

  /** POST /api/v1/fees/invoices/:id/pay/online — online card/transfer settlement */
  @Post(':id/pay/online')
  @Roles(UserRole.ADMIN, UserRole.PARENT, UserRole.STUDENT)
  payOnline(
    @Param('id') id: string,
    @Body() dto: PayOnlineDto,
    @CurrentUser() actor: { id: string; email: string; schoolId: string; role?: string; firstName?: string; lastName?: string },
  ) {
    return this.invoicesService.payOnline(id, dto, actor.schoolId, actor.id, actor.email, actor);
  }
}

// ── Paystack Webhook (public — no JWT) ──────────────────────────────────────

@Controller('fees/webhook')
export class PaystackWebhookController {
  constructor(private readonly invoicesService: InvoicesService) {}

  /** POST /api/v1/fees/webhook/paystack — called by Paystack servers */
  @Post('paystack')
  handleWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
    @Body() payload: Record<string, unknown>,
  ) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(payload));
    return this.invoicesService.handlePaystackWebhook(payload, signature, rawBody);
  }
}
