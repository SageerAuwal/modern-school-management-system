import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsEmail,
  IsUrl,
  Min,
  Max,
  MinLength,
} from 'class-validator';

export class SetupSchoolDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @IsOptional()
  emisId?: string;

  @IsString()
  @IsOptional()
  examCenterNo?: string;

  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  gpsLat?: number;

  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  gpsLng?: number;

  @IsString()
  @IsOptional()
  lga?: string;

  @IsString()
  @IsOptional()
  ward?: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  ownershipType?: string;

  @IsString()
  @IsOptional()
  operatingStatus?: string;

  @IsArray()
  @IsOptional()
  levelsOffered?: string[];

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsUrl()
  @IsOptional()
  website?: string;
}
