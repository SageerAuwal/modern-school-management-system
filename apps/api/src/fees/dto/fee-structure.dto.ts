import { IsString, IsNumber, IsOptional, Min, MinLength } from 'class-validator';

export class CreateFeeStructureDto {
  @IsString()
  @MinLength(1)
  name: string; // "Tuition Fee", "PTA Levy", "Sports Fee"

  @IsString()
  @IsOptional()
  level?: string; // "JSS1", "SS2" — omit for all levels

  @IsString()
  @IsOptional()
  termId?: string; // omit for one-time/annual fees

  @IsString()
  @MinLength(4)
  academicYear: string; // "2025/2026"

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  description?: string;
}
