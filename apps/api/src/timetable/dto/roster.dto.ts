import { IsString, IsOptional, IsInt, Min, Max, IsEnum, IsDateString } from 'class-validator';
import { DutyCategory } from '@prisma/client';

export class GenerateDutyRosterDto {
  @IsString()
  academicYear: string;

  @IsOptional()
  @IsString()
  termId?: string;

  @IsOptional()
  @IsInt()
  @Min(4)
  @Max(16)
  weeksCount?: number = 14;

  @IsOptional()
  @IsString()
  timetableId?: string;
}

export class AssignDutyDto {
  @IsString()
  teacherId: string;

  @IsEnum(DutyCategory)
  category: DutyCategory;

  @IsOptional()
  @IsString()
  day?: string;

  @IsOptional()
  @IsInt()
  periodNumber?: number;

  @IsInt()
  @Min(1)
  @Max(16)
  weekNumber: number;

  @IsString()
  academicYear: string;

  @IsOptional()
  @IsString()
  termId?: string;

  @IsOptional()
  @IsString()
  venue?: string;

  @IsOptional()
  @IsString()
  instructions?: string;
}

export class CreateSubstitutionDto {
  @IsString()
  lessonId: string;

  @IsString()
  absentTeacherId: string;

  @IsString()
  substituteTeacherId: string;

  @IsDateString()
  date: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  reason?: string;
}
