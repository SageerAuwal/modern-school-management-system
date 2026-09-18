import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { TermsService } from './terms.service';
import { CreateTermDto } from './dto/term.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('terms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateTermDto, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.termsService.create(dto, actor.schoolId, actor.id, actor.email);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.PARENT, UserRole.STUDENT)
  findAll(@CurrentUser() actor: { schoolId: string }) {
    return this.termsService.findAll(actor.schoolId);
  }

  @Get('current')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.PARENT, UserRole.STUDENT)
  getCurrent(@CurrentUser() actor: { schoolId: string }) {
    return this.termsService.getCurrent(actor.schoolId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.PARENT, UserRole.STUDENT)
  findOne(@Param('id') id: string, @CurrentUser() actor: { schoolId: string }) {
    return this.termsService.findOne(id, actor.schoolId);
  }

  @Patch(':id/set-current')
  @Roles(UserRole.ADMIN)
  setCurrent(@Param('id') id: string, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.termsService.setCurrent(id, actor.schoolId, actor.id, actor.email);
  }
}
