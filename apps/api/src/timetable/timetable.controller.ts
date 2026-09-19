import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { TimetableService } from './timetable.service';
import { GenerateTimetableDto, UpdateLessonDto } from './dto/timetable.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('timetable')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  /** POST /api/v1/timetable/generate — run auto-generation engine */
  @Post('generate')
  @Roles(UserRole.ADMIN)
  generate(
    @Body() dto: GenerateTimetableDto,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.timetableService.generate(dto, actor.schoolId, actor.id, actor.email);
  }

  /** GET /api/v1/timetable/active — fetch current active school timetable */
  @Get('active')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT)
  getActive(@CurrentUser() actor: { schoolId: string }) {
    return this.timetableService.getActive(actor.schoolId);
  }

  /** GET /api/v1/timetable/:id/class/:classSectionId — class weekly routine */
  @Get(':id/class/:classSectionId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT)
  getClassTimetable(
    @Param('id') id: string,
    @Param('classSectionId') classSectionId: string,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.timetableService.getClassTimetable(id, classSectionId, actor.schoolId);
  }

  /** GET /api/v1/timetable/:id/teacher/:teacherId — teacher weekly roster */
  @Get(':id/teacher/:teacherId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT)
  getTeacherTimetable(
    @Param('id') id: string,
    @Param('teacherId') teacherId: string,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.timetableService.getTeacherTimetable(id, teacherId, actor.schoolId);
  }

  /** GET /api/v1/timetable/:id/master?day=MONDAY — master matrix */
  @Get(':id/master')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT)
  getMasterDayGrid(
    @Param('id') id: string,
    @Query('day') day: string,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.timetableService.getMasterDayGrid(id, day || 'MONDAY', actor.schoolId);
  }

  /** PATCH /api/v1/timetable/lessons/:id — swap or update lesson */
  @Patch('lessons/:id')
  @Roles(UserRole.ADMIN)
  updateLesson(
    @Param('id') id: string,
    @Body() dto: UpdateLessonDto,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.timetableService.updateLesson(id, dto, actor.schoolId, actor.id, actor.email);
  }
}
