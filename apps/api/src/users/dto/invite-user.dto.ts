import {
  IsEmail,
  IsEnum,
  IsString,
  IsOptional,
  MinLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsString()
  @MinLength(1)
  firstName: string;

  @IsString()
  @MinLength(1)
  lastName: string;

  @IsString()
  @IsOptional()
  phone?: string;
}
