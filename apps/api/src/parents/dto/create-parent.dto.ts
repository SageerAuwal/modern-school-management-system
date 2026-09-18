import { IsString, IsEmail, IsOptional, IsArray, MinLength } from 'class-validator';

export class CreateParentDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  relationship?: string;

  @IsArray()
  @IsOptional()
  studentIds?: string[];
}

export class LinkStudentDto {
  @IsString()
  studentId: string;

  @IsString()
  @IsOptional()
  relationship?: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(6)
  newPassword: string;
}
