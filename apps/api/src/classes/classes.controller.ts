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
import { ClassesService } from './classes.service';
import { CreateClassSectionDto } from './dto/create-class.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  /** POST /api/v1/classes — admin creates a class section */
  @Post()
  @Roles(UserRole.ADMIN)
  create(
    @Body() dto: CreateClassSectionDto,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.classesService.create(dto, actor.schoolId, actor.id, actor.email);
  }

  /** GET /api/v1/classes?academicYear=2025/2026 — list all classes */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT)
  findAll(
    @Query('academicYear') academicYear: string,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.classesService.findAll(actor.schoolId, academicYear);
  }

  /** GET /api/v1/classes/:id — class detail with enrolled students */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT)
  findOne(
    @Param('id') id: string,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.classesService.findOne(id, actor.schoolId);
  }

  /** PATCH /api/v1/classes/:id — update class section */
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateClassSectionDto>,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.classesService.update(id, actor.schoolId, dto as CreateClassSectionDto, actor.id, actor.email);
  }

  /** PATCH /api/v1/classes/:id/deactivate — deactivate a class */
  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN)
  deactivate(
    @Param('id') id: string,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.classesService.deactivate(id, actor.schoolId, actor.id, actor.email);
  }
}
