import {
  IsString, IsNumber, IsArray, IsOptional,
  IsDateString, Min, MinLength, ValidateNested, IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

// ── Invoice DTOs ────────────────────────────────────────────────────────────

export class InvoiceItemDto {
  @IsString()
  @IsOptional()
  feeStructureId?: string;

  @IsString()
  @MinLength(1)
  name: string; // e.g. "Tuition Fee" — copied from fee structure or entered manually

  @IsNumber()
  @Min(0)
  amount: number;
}

export class CreateInvoiceDto {
  @IsString()
  studentId: string;

  @IsString()
  @IsOptional()
  termId?: string;

  @IsString()
  @MinLength(4)
  academicYear: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class BulkCreateInvoicesDto {
  @IsString()
  classSectionId: string; // generate invoices for all active students in this class

  @IsString()
  @IsOptional()
  termId?: string;

  @IsString()
  @MinLength(4)
  academicYear: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[]; // Same items applied to every student

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}

// ── Payment DTOs ─────────────────────────────────────────────────────────────

export class RecordCashPaymentDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsEnum(['CASH', 'BANK_DEPOSIT'])
  method: 'CASH' | 'BANK_DEPOSIT';

  @IsString()
  @IsOptional()
  notes?: string; // teller number, notes, etc.
}

export class InitiatePaystackDto {
  @IsString()
  callbackUrl: string; // frontend page to return to after payment
}
