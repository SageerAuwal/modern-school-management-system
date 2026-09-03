import { Controller, Post, Patch, Get, Body, Param, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { EnrollmentsService } from './enrollments.service';
import { EnrollStudentDto, TransferStudentDto } from './dto/enrollment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('enrollments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  /** POST /api/v1/enrollments — enroll a student in a class */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  enroll(
    @Body() dto: EnrollStudentDto,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.enrollmentsService.enroll(dto, actor.schoolId, actor.id, actor.email);
  }

  /** PATCH /api/v1/enrollments/:id/transfer — transfer to another class */
  @Patch(':id/transfer')
  @Roles(UserRole.ADMIN)
  transfer(
    @Param('id') id: string,
    @Body() dto: TransferStudentDto,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.enrollmentsService.transfer(id, dto, actor.schoolId, actor.id, actor.email);
  }

  /** GET /api/v1/enrollments/student/:studentId/history */
  @Get('student/:studentId/history')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  getHistory(
    @Param('studentId') studentId: string,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.enrollmentsService.getStudentHistory(studentId, actor.schoolId);
  }
}
