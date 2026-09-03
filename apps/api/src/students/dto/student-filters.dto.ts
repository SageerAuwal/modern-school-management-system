import { IsString, IsOptional, IsEnum } from 'class-validator';

export class LinkGuardianDto {
  @IsString()
  guardianId: string; // USER id with role PARENT

  @IsString()
  @IsOptional()
  relationship?: string; // mother, father, uncle, etc.
}

export class FilterStudentsDto {
  @IsString()
  @IsOptional()
  classSectionId?: string;

  @IsString()
  @IsOptional()
  academicYear?: string;

  @IsEnum(['ACTIVE', 'WITHDRAWN', 'TRANSFERRED', 'GRADUATED'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  search?: string; // name or admission number
}
