import { IsString, IsDateString, IsOptional, IsBoolean, MinLength } from 'class-validator';

export class CreateTermDto {
  @IsString()
  @MinLength(1)
  name: string; // "First Term", "Second Term", "Third Term"

  @IsString()
  @MinLength(4)
  academicYear: string; // "2025/2026"

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean;
}
