import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ClinicService } from './clinic.service';
import {
  CreateClinicVisitDto,
  UpdateClinicVisitDto,
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  UpdateStudentHealthDto,
  CreateImmunizationDto,
} from './dto/clinic.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('clinic')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClinicController {
  constructor(private readonly clinicService: ClinicService) {}

  // ── Executive Statistics ────────────────────────────────────────────────

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.NURSE, UserRole.TEACHER)
  getStats(@CurrentUser() actor: { schoolId: string }) {
    return this.clinicService.getStats(actor.schoolId);
  }

  // ── Clinic Visits & Triage ──────────────────────────────────────────────

  @Post('visits')
  @Roles(UserRole.ADMIN, UserRole.NURSE)
  recordVisit(
    @Body() dto: CreateClinicVisitDto,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.clinicService.recordVisit(dto, actor.schoolId, actor.id, actor.email);
  }

  @Get('visits')
  @Roles(UserRole.ADMIN, UserRole.NURSE, UserRole.TEACHER)
  getVisits(
    @Query('studentId') studentId?: string,
    @Query('disposition') disposition?: string,
    @Query('date') date?: string,
    @CurrentUser() actor: { schoolId: string } = { schoolId: '' },
  ) {
    return this.clinicService.getVisits(actor.schoolId, { studentId, disposition, date });
  }

  @Get('visits/:id')
  @Roles(UserRole.ADMIN, UserRole.NURSE, UserRole.TEACHER, UserRole.PARENT)
  getVisitById(
    @Param('id') id: string,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.clinicService.getVisitById(id, actor.schoolId);
  }

  @Patch('visits/:id')
  @Roles(UserRole.ADMIN, UserRole.NURSE)
  updateVisit(
    @Param('id') id: string,
    @Body() dto: UpdateClinicVisitDto,
    @CurrentUser() actor: { email: string; schoolId: string },
  ) {
    return this.clinicService.updateVisit(id, dto, actor.schoolId, actor.email);
  }

  // ── Dispensary Inventory ────────────────────────────────────────────────

  @Get('inventory')
  @Roles(UserRole.ADMIN, UserRole.NURSE)
  getInventory(
    @Query('search') search: string,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.clinicService.getInventory(actor.schoolId, search);
  }

  @Post('inventory')
  @Roles(UserRole.ADMIN, UserRole.NURSE)
  addInventoryItem(
    @Body() dto: CreateInventoryItemDto,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.clinicService.addInventoryItem(dto, actor.schoolId, actor.id, actor.email);
  }

  @Patch('inventory/:id')
  @Roles(UserRole.ADMIN, UserRole.NURSE)
  updateInventoryItem(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryItemDto,
    @CurrentUser() actor: { email: string; schoolId: string },
  ) {
    return this.clinicService.updateInventoryItem(id, dto, actor.schoolId, actor.email);
  }

  // ── Student Health Registry ─────────────────────────────────────────────

  @Get('students')
  @Roles(UserRole.ADMIN, UserRole.NURSE, UserRole.TEACHER)
  getStudentHealthRegistry(
    @Query('search') search: string,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.clinicService.getStudentHealthRegistry(actor.schoolId, search);
  }

  @Patch('students/:id')
  @Roles(UserRole.ADMIN, UserRole.NURSE)
  updateStudentHealth(
    @Param('id') id: string,
    @Body() dto: UpdateStudentHealthDto,
    @CurrentUser() actor: { email: string; schoolId: string },
  ) {
    return this.clinicService.updateStudentHealth(id, dto, actor.schoolId, actor.email);
  }

  // ── Routine Immunizations ───────────────────────────────────────────────

  @Get('immunizations')
  @Roles(UserRole.ADMIN, UserRole.NURSE, UserRole.TEACHER, UserRole.PARENT)
  getImmunizations(
    @Query('studentId') studentId: string,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.clinicService.getImmunizations(actor.schoolId, studentId);
  }

  @Post('immunizations')
  @Roles(UserRole.ADMIN, UserRole.NURSE)
  recordImmunization(
    @Body() dto: CreateImmunizationDto,
    @CurrentUser() actor: { email: string; schoolId: string },
  ) {
    return this.clinicService.recordImmunization(dto, actor.schoolId, actor.email);
  }
}
