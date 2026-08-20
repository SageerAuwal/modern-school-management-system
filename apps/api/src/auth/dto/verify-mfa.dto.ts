import { IsString, MinLength } from 'class-validator';

export class VerifyMfaDto {
  @IsString()
  @MinLength(6)
  token: string;
}
