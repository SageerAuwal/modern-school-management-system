import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * GET /api/v1/reports/summary
   * Comprehensive institutional report and analytics
   */
  @Get('summary')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  getSummary(@CurrentUser() actor: { schoolId: string }) {
    return this.reportsService.getSummary(actor.schoolId);
  }
}
