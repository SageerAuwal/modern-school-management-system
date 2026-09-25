import { IsString, IsNumber, IsOptional, IsEnum, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class FeeAllocationItemDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  amount: number;
}

export class CollectFeeDto {
  @IsString()
  studentId: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsOptional()
  @IsString()
  externalReference?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeeAllocationItemDto)
  allocations?: FeeAllocationItemDto[];
}

export class CloseDrawerDto {
  @IsNumber()
  @Min(0)
  closingCash: number;

  @IsOptional()
  @IsString()
  closureNotes?: string;
}
