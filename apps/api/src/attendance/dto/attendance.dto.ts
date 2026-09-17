import { AttendanceStatus } from '@prisma/client';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AttendanceEntryDto {
  @IsString()
  studentId: string;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsString()
  @IsOptional()
  note?: string;
}

export class BulkMarkAttendanceDto {
  @IsString()
  classSectionId: string;

  @IsDateString()
  date: string; // ISO date string: "2025-09-03"

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  @IsOptional()
  entries?: AttendanceEntryDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  @IsOptional()
  records?: AttendanceEntryDto[];
}

export class EditAttendanceDto {
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsString()
  @IsOptional()
  note?: string;
}

export class AttendanceQueryDto {
  @IsString()
  @IsOptional()
  date?: string; // YYYY-MM-DD

  @IsString()
  @IsOptional()
  from?: string; // YYYY-MM-DD

  @IsString()
  @IsOptional()
  to?: string; // YYYY-MM-DD

  @IsString()
  @IsOptional()
  academicYear?: string;
}
