import { IsString, IsNumber, IsOptional, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ScoreEntryDto {
  @IsString()
  studentId: string;

  @IsNumber()
  @IsOptional()
  @Min(0) @Max(100)
  ca1?: number;

  @IsNumber()
  @IsOptional()
  @Min(0) @Max(100)
  ca2?: number;

  @IsNumber()
  @IsOptional()
  @Min(0) @Max(100)
  ca3?: number;

  @IsNumber()
  @IsOptional()
  @Min(0) @Max(100)
  exam?: number;
}

export class BulkEnterScoresDto {
  @IsString()
  classSectionId: string;

  @IsString()
  subjectId: string;

  @IsString()
  termId: string;

  @IsString()
  academicYear: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScoreEntryDto)
  entries: ScoreEntryDto[];
}

export class ReportCardQueryDto {
  @IsString()
  termId: string;

  @IsString()
  classSectionId: string;
}
