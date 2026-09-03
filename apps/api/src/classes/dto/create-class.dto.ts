import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  MinLength,
} from 'class-validator';

export class CreateClassSectionDto {
  @IsString()
  @MinLength(1)
  name: string; // e.g. "JSS 1A"

  @IsString()
  @MinLength(1)
  level: string; // e.g. "JSS1", "SS2"

  @IsString()
  @IsOptional()
  stream?: string; // e.g. "Science", "Art"

  @IsString()
  @MinLength(4)
  academicYear: string; // e.g. "2025/2026"

  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  capacity?: number;

  @IsString()
  @IsOptional()
  teacherId?: string; // User ID of the class teacher
}
