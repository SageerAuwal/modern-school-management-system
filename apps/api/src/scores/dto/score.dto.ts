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
  @IsOptional()
  termId?: string;

  @IsString()
  @IsOptional()
  academicYear?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScoreEntryDto)
  entries?: ScoreEntryDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScoreEntryDto)
  scores?: ScoreEntryDto[];
}

export class ReportCardQueryDto {
  @IsString()
  @IsOptional()
  termId?: string;

  @IsString()
  @IsOptional()
  classSectionId?: string;
}
