import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { FilterStudentsDto, LinkGuardianDto } from './dto/student-filters.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  /** POST /api/v1/students — admin or teacher can register a student */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  create(
    @Body() dto: CreateStudentDto,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.studentsService.create(dto, actor.schoolId, actor.id, actor.email);
  }

  /** GET /api/v1/students — list with optional filters */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findAll(
    @Query() filters: FilterStudentsDto,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.studentsService.findAll(actor.schoolId, filters);
  }

  /** GET /api/v1/students/:id — full student profile */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findOne(
    @Param('id') id: string,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.studentsService.findOne(id, actor.schoolId);
  }

  /** PATCH /api/v1/students/:id — update student details */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.studentsService.update(id, actor.schoolId, dto, actor.id, actor.email);
  }

  /** PATCH /api/v1/students/:id/withdraw — soft-withdraw a student */
  @Patch(':id/withdraw')
  @Roles(UserRole.ADMIN)
  withdraw(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.studentsService.withdraw(id, actor.schoolId, reason ?? 'No reason given', actor.id, actor.email);
  }

  /** PATCH /api/v1/students/:id/reenroll — re-activate a withdrawn student */
  @Patch(':id/reenroll')
  @Roles(UserRole.ADMIN)
  reenroll(
    @Param('id') id: string,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.studentsService.reenroll(id, actor.schoolId, actor.id, actor.email);
  }

  /** POST /api/v1/students/:id/guardians — link a guardian */
  @Post(':id/guardians')
  @Roles(UserRole.ADMIN)
  linkGuardian(
    @Param('id') studentId: string,
    @Body() dto: LinkGuardianDto,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.studentsService.linkGuardian(studentId, actor.schoolId, dto, actor.id, actor.email);
  }

  /** DELETE /api/v1/students/:id/guardians/:guardianId — unlink a guardian */
  @Delete(':id/guardians/:guardianId')
  @Roles(UserRole.ADMIN)
  unlinkGuardian(
    @Param('id') studentId: string,
    @Param('guardianId') guardianId: string,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.studentsService.unlinkGuardian(studentId, actor.schoolId, guardianId, actor.id, actor.email);
  }
}
