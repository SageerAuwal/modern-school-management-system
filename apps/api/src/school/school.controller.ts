import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { SchoolService } from './school.service';
import { SetupSchoolDto } from './dto/setup-school.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('school')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchoolController {
  constructor(private readonly schoolService: SchoolService) {}

  /** GET /api/v1/school — any authenticated user can view school profile */
  @Get()
  getProfile(@CurrentUser() user: { schoolId: string }) {
    return this.schoolService.getProfile(user.schoolId);
  }

  /** PUT /api/v1/school — admin only: set up or update school profile */
  @Put()
  @Roles(UserRole.ADMIN)
  setup(
    @Body() dto: SetupSchoolDto,
    @CurrentUser() actor: { id: string; email: string },
  ) {
    return this.schoolService.setup(dto, actor.id, actor.email);
  }
}
