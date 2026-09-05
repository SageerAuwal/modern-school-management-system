import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/subject.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('subjects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateSubjectDto, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.subjectsService.create(dto, actor.schoolId, actor.id, actor.email);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findAll(@CurrentUser() actor: { schoolId: string }) {
    return this.subjectsService.findAll(actor.schoolId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findOne(@Param('id') id: string, @CurrentUser() actor: { schoolId: string }) {
    return this.subjectsService.findOne(id, actor.schoolId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: Partial<CreateSubjectDto>, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.subjectsService.update(id, actor.schoolId, dto, actor.id, actor.email);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN)
  deactivate(@Param('id') id: string, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.subjectsService.deactivate(id, actor.schoolId, actor.id, actor.email);
  }

  // ── Class-subject assignments ─────────────────────────────────────────────

  @Post('assign')
  @Roles(UserRole.ADMIN)
  assignToClass(
    @Body() body: { classSectionId: string; subjectId: string; teacherId?: string },
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.subjectsService.assignToClass(body.classSectionId, body.subjectId, body.teacherId, actor.schoolId);
  }

  @Get('class/:classSectionId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  getClassSubjects(@Param('classSectionId') id: string, @CurrentUser() actor: { schoolId: string }) {
    return this.subjectsService.getClassSubjects(id, actor.schoolId);
  }

  @Delete('class/:classSectionId/subject/:subjectId')
  @Roles(UserRole.ADMIN)
  removeFromClass(
    @Param('classSectionId') classSectionId: string,
    @Param('subjectId') subjectId: string,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.subjectsService.removeFromClass(classSectionId, subjectId, actor.schoolId);
  }
}
