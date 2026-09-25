import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RosterService } from './roster.service';
import { GenerateDutyRosterDto, AssignDutyDto, CreateSubstitutionDto } from './dto/roster.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('roster')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RosterController {
  constructor(private readonly rosterService: RosterService) {}

  /** POST /api/v1/roster/generate-term-duties — generate term supervisory duties */
  @Post('generate-term-duties')
  @Roles(UserRole.ADMIN)
  generateTermDuties(
    @Body() dto: GenerateDutyRosterDto,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.rosterService.generateTermDutyRoster(dto, actor.schoolId);
  }

  /** GET /api/v1/roster/term-matrix — master staff-room notice board duty matrix */
  @Get('term-matrix')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.BURSAR)
  getTermMatrix(
    @Query('academicYear') academicYear: string,
    @Query('termId') termId: string,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.rosterService.getTermDutyMatrix(actor.schoolId, academicYear, termId);
  }

  /** GET /api/v1/roster/teacher/:teacherId — duties for specific teacher */
  @Get('teacher/:teacherId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  getTeacherDuties(
    @Param('teacherId') teacherId: string,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.rosterService.getTeacherDuties(teacherId, actor.schoolId);
  }

  /** POST /api/v1/roster/assign-duty — manually assign or override a duty */
  @Post('assign-duty')
  @Roles(UserRole.ADMIN)
  assignDuty(
    @Body() dto: AssignDutyDto,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.rosterService.assignDuty(dto, actor.schoolId);
  }

  /** PATCH /api/v1/roster/duty/:dutyId/toggle-complete — mark duty as performed */
  @Patch('duty/:dutyId/toggle-complete')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  toggleDutyCompletion(
    @Param('dutyId') dutyId: string,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.rosterService.toggleDutyCompletion(dutyId, actor.schoolId);
  }

  /** GET /api/v1/roster/find-substitutes — match free teachers for absent class period */
  @Get('find-substitutes')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findSubstitutes(
    @Query('lessonId') lessonId: string,
    @Query('date') date: string,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.rosterService.findAvailableSubstitutes(lessonId, date, actor.schoolId);
  }

  /** POST /api/v1/roster/substitutions — confirm relief coverage */
  @Post('substitutions')
  @Roles(UserRole.ADMIN)
  createSubstitution(
    @Body() dto: CreateSubstitutionDto,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.rosterService.createSubstitution(dto, actor.schoolId);
  }

  /** GET /api/v1/roster/substitutions — list coverage history */
  @Get('substitutions')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  getSubstitutions(
    @Query('date') date: string,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.rosterService.getSubstitutions(actor.schoolId, date);
  }
}
