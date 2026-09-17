import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AttendanceService } from './attendance.service';
import {
  BulkMarkAttendanceDto,
  EditAttendanceDto,
  AttendanceQueryDto,
} from './dto/attendance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /**
   * POST /api/v1/attendance/mark
   * Bulk mark attendance for an entire class on a given date.
   * Idempotent: re-submitting the same day updates existing records.
   */
  @Post(['mark', 'bulk'])
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  bulkMark(
    @Body() dto: BulkMarkAttendanceDto,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.attendanceService.bulkMark(dto, actor.schoolId, actor.id, actor.email);
  }

  /**
   * GET /api/v1/attendance/class/:classSectionId?date=YYYY-MM-DD
   * Full class roster with attendance status for a specific date.
   * Un-marked students show status: null.
   */
  @Get('class/:classSectionId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  getClassAttendance(
    @Param('classSectionId') classSectionId: string,
    @Query('date') date: string,
    @CurrentUser() actor: { schoolId: string },
  ) {
    const today = date ?? new Date().toISOString().split('T')[0];
    return this.attendanceService.getClassAttendance(classSectionId, today, actor.schoolId);
  }

  /**
   * GET /api/v1/attendance/class/:classSectionId/stats?from=&to=
   * Per-student attendance rate and breakdown for a date range.
   */
  @Get('class/:classSectionId/stats')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  getClassStats(
    @Param('classSectionId') classSectionId: string,
    @Query() query: AttendanceQueryDto,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.attendanceService.getClassStats(classSectionId, actor.schoolId, query);
  }

  /**
   * GET /api/v1/attendance/student/:studentId?from=&to=
   * Attendance history and stats for a specific student.
   */
  @Get('student/:studentId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.PARENT)
  getStudentAttendance(
    @Param('studentId') studentId: string,
    @Query() query: AttendanceQueryDto,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.attendanceService.getStudentAttendance(studentId, actor.schoolId, query);
  }

  /**
   * PATCH /api/v1/attendance/:id
   * Edit a single attendance record — always written to AUDIT_LOG.
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  editRecord(
    @Param('id') id: string,
    @Body() dto: EditAttendanceDto,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.attendanceService.editRecord(id, dto, actor.schoolId, actor.id, actor.email);
  }
}
