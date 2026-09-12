import {
  IsString, IsInt, IsOptional, IsBoolean,
  Min, MinLength, IsArray, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Bus ───────────────────────────────────────────────────────────────────────

export class CreateBusDto {
  @IsString()
  @MinLength(1)
  name: string; // "Bus A", "Yellow Bus 1"

  @IsString()
  @MinLength(1)
  plateNumber: string; // "ABC-123-KN"

  @IsInt()
  @Min(1)
  capacity: number;

  @IsString()
  @MinLength(1)
  driverName: string;

  @IsString()
  @IsOptional()
  driverPhone?: string;

  @IsString()
  @IsOptional()
  assistantName?: string;
}

// ── Route & Stops ─────────────────────────────────────────────────────────────

export class RouteStopDto {
  @IsString()
  @MinLength(1)
  stopName: string;

  @IsInt()
  @Min(1)
  stopOrder: number;

  @IsString()
  @IsOptional()
  landmark?: string;

  @IsString()
  @IsOptional()
  pickupTime?: string; // "06:45"
}

export class CreateRouteDto {
  @IsString()
  busId: string;

  @IsString()
  @MinLength(1)
  name: string; // "Tudun Wada Route", "GRA Morning"

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteStopDto)
  stops: RouteStopDto[];
}

// ── Student Assignment ────────────────────────────────────────────────────────

export class AssignStudentDto {
  @IsString()
  studentId: string;

  @IsString()
  busId: string;

  @IsString()
  routeId: string;

  @IsString()
  @MinLength(1)
  pickupStop: string;

  @IsString()
  @MinLength(1)
  dropoffStop: string;

  @IsString()
  @MinLength(4)
  academicYear: string; // "2025/2026"
}
