import { IsString, IsOptional, MinLength } from 'class-validator';

export class EnrollStudentDto {
  @IsString()
  studentId: string;

  @IsString()
  classSectionId: string;

  @IsString()
  @MinLength(4)
  academicYear: string; // e.g. "2025/2026"
}

export class TransferStudentDto {
  @IsString()
  targetClassSectionId: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
