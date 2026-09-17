import { IsString, IsNumber, IsOptional, Min, Max, MinLength } from 'class-validator';

export class GenerateTimetableDto {
  @IsString()
  @MinLength(4)
  academicYear: string; // e.g. "2025/2026"

  @IsString()
  @IsOptional()
  termId?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsNumber()
  @IsOptional()
  @Min(4)
  @Max(10)
  periodsPerDay?: number = 8;

  @IsNumber()
  @IsOptional()
  @Min(30)
  @Max(60)
  periodDuration?: number = 40; // in minutes

  @IsNumber()
  @IsOptional()
  @Min(30)
  @Max(60)
  lessonDuration?: number;

  @IsString()
  @IsOptional()
  startTime?: string = '08:00';

  @IsNumber()
  @IsOptional()
  @Min(2)
  @Max(6)
  breakAfter?: number = 4; // Break after period 4

  @IsNumber()
  @IsOptional()
  @Min(2)
  @Max(6)
  breakAfterPeriod?: number;

  @IsNumber()
  @IsOptional()
  @Min(15)
  @Max(60)
  breakDuration?: number = 30; // Break duration in minutes

  @IsOptional()
  schoolDays?: string[];
}

export class UpdateLessonDto {
  @IsString()
  @IsOptional()
  subjectId?: string;

  @IsString()
  @IsOptional()
  teacherId?: string;

  @IsString()
  @IsOptional()
  room?: string;

  @IsString()
  @IsOptional()
  day?: string;

  @IsNumber()
  @IsOptional()
  periodNumber?: number;
}
