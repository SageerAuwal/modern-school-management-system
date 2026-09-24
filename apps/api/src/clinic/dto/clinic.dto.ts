import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { VisitDisposition } from '@prisma/client';

export class DispenseItemInputDto {
  @IsString()
  @IsNotEmpty()
  inventoryId: string;

  @IsNumber()
  quantity: number;

  @IsString()
  @IsOptional()
  dosage?: string;
}

export class CreateClinicVisitDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  complaint: string;

  @IsString()
  @IsOptional()
  symptoms?: string;

  @IsNumber()
  @IsOptional()
  temperature?: number;

  @IsString()
  @IsOptional()
  bloodPressure?: string;

  @IsNumber()
  @IsOptional()
  pulseRate?: number;

  @IsNumber()
  @IsOptional()
  weight?: number;

  @IsString()
  @IsOptional()
  diagnosis?: string;

  @IsString()
  @IsOptional()
  treatmentGiven?: string;

  @IsEnum(VisitDisposition)
  @IsOptional()
  disposition?: VisitDisposition;

  @IsBoolean()
  @IsOptional()
  parentNotified?: boolean;

  @IsString()
  @IsOptional()
  referralHospital?: string;

  @IsString()
  @IsOptional()
  referralReason?: string;

  @IsString()
  @IsOptional()
  doctorNotes?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DispenseItemInputDto)
  dispensedItems?: DispenseItemInputDto[];
}

export class UpdateClinicVisitDto {
  @IsString()
  @IsOptional()
  complaint?: string;

  @IsString()
  @IsOptional()
  symptoms?: string;

  @IsNumber()
  @IsOptional()
  temperature?: number;

  @IsString()
  @IsOptional()
  bloodPressure?: string;

  @IsNumber()
  @IsOptional()
  pulseRate?: number;

  @IsNumber()
  @IsOptional()
  weight?: number;

  @IsString()
  @IsOptional()
  diagnosis?: string;

  @IsString()
  @IsOptional()
  treatmentGiven?: string;

  @IsEnum(VisitDisposition)
  @IsOptional()
  disposition?: VisitDisposition;

  @IsBoolean()
  @IsOptional()
  parentNotified?: boolean;

  @IsString()
  @IsOptional()
  referralHospital?: string;

  @IsString()
  @IsOptional()
  referralReason?: string;

  @IsString()
  @IsOptional()
  doctorNotes?: string;
}

export class CreateInventoryItemDto {
  @IsString()
  @IsNotEmpty()
  itemCode: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  dosageForm?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  quantityOnHand: number;

  @IsNumber()
  @IsOptional()
  reorderLevel?: number;

  @IsString()
  @IsOptional()
  expiryDate?: string;

  @IsString()
  @IsOptional()
  batchNumber?: string;

  @IsString()
  @IsOptional()
  locationRack?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateInventoryItemDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  dosageForm?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @IsOptional()
  quantityOnHand?: number;

  @IsNumber()
  @IsOptional()
  reorderLevel?: number;

  @IsString()
  @IsOptional()
  expiryDate?: string;

  @IsString()
  @IsOptional()
  batchNumber?: string;

  @IsString()
  @IsOptional()
  locationRack?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateStudentHealthDto {
  @IsString()
  @IsOptional()
  bloodGroup?: string;

  @IsString()
  @IsOptional()
  genotype?: string;

  @IsString()
  @IsOptional()
  allergies?: string;

  @IsString()
  @IsOptional()
  chronicConditions?: string;

  @IsString()
  @IsOptional()
  emergencyContactName?: string;

  @IsString()
  @IsOptional()
  emergencyContactPhone?: string;

  @IsString()
  @IsOptional()
  medicalNotes?: string;
}

export class CreateImmunizationDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  vaccineName: string;

  @IsNumber()
  @IsOptional()
  doseNumber?: number;

  @IsString()
  @IsNotEmpty()
  administeredAt: string;

  @IsString()
  @IsOptional()
  nextDueDate?: string;

  @IsString()
  @IsOptional()
  provider?: string;

  @IsString()
  @IsOptional()
  batchNumber?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
