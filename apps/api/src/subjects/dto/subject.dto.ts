import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateSubjectDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  code?: string; // e.g. "MTH", "ENG"

  @IsString()
  @IsOptional()
  description?: string;
}
