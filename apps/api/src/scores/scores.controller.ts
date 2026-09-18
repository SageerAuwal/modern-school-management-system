import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ScoresService } from './scores.service';
import { BulkEnterScoresDto, ReportCardQueryDto } from './dto/score.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('scores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScoresController {
  constructor(private readonly scoresService: ScoresService) {}

  /**
   * POST /api/v1/scores/bulk
   * Enter/update scores for an entire class for one subject in one term.
   * Idempotent — re-submitting updates existing records.
   */
  @Post('bulk')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  bulkEnter(
    @Body() dto: BulkEnterScoresDto,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.scoresService.bulkEnter(dto, actor.schoolId, actor.id, actor.email);
  }

  /**
   * GET /api/v1/scores/sheet/:classSectionId/:subjectId?termId=
   * Class score sheet — all students' scores for one subject/term.
   */
  @Get('sheet/:classSectionId/:subjectId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  getClassScoreSheet(
    @Param('classSectionId') classSectionId: string,
    @Param('subjectId') subjectId: string,
    @Query('termId') termId: string,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.scoresService.getClassScoreSheet(classSectionId, subjectId, termId, actor.schoolId);
  }

  /**
   * GET /api/v1/scores/report-card/:studentId?termId=&classSectionId=
   * Full student report card with position in class.
   */
  @Get('report-card/:studentId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.PARENT)
  getReportCard(
    @Param('studentId') studentId: string,
    @Query() query: ReportCardQueryDto,
    @CurrentUser() actor: { id: string; email: string; role: UserRole; schoolId: string },
  ) {
    return this.scoresService.getReportCard(studentId, query, actor.schoolId, actor);
  }

  /**
   * GET /api/v1/scores/results/:classSectionId?termId=
   * Full class results table ranked by average — class positions.
   */
  @Get('results/:classSectionId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  getClassResults(
    @Param('classSectionId') classSectionId: string,
    @Query('termId') termId: string,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.scoresService.getClassResults(classSectionId, termId, actor.schoolId);
  }
}
