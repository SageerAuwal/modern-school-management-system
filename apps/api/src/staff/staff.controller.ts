import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { StaffService } from './staff.service';
import { CreateStaffRecordDto } from './dto/create-staff.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateStaffRecordDto, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.staffService.create(dto, actor.schoolId, actor.id, actor.email);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll(@Query('all') all: string, @CurrentUser() actor: { schoolId: string }) {
    return this.staffService.findAll(actor.schoolId, all !== 'true');
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  findOne(@Param('id') id: string, @CurrentUser() actor: { schoolId: string }) {
    return this.staffService.findOne(id, actor.schoolId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: Partial<CreateStaffRecordDto>, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.staffService.update(id, actor.schoolId, dto, actor.id, actor.email);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN)
  deactivate(@Param('id') id: string, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.staffService.deactivate(id, actor.schoolId, actor.id, actor.email);
  }

  @Patch(':id/reactivate')
  @Roles(UserRole.ADMIN)
  reactivate(@Param('id') id: string, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.staffService.reactivate(id, actor.schoolId, actor.id, actor.email);
  }

  @Post(':id/reset-password')
  @Roles(UserRole.ADMIN)
  resetPassword(
    @Param('id') id: string,
    @Body('newPassword') newPassword: string,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.staffService.resetPassword(id, actor.schoolId, newPassword, actor.id, actor.email);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.staffService.delete(id, actor.schoolId, actor.id, actor.email);
  }
}
