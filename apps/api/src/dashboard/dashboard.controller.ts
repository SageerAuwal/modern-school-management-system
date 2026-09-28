import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /** GET /api/v1/dashboard/overview — headline KPIs */
  @Get('overview')
  @Roles(UserRole.ADMIN)
  getOverview(@CurrentUser() actor: { schoolId: string }) {
    return this.dashboardService.getOverview(actor.schoolId);
  }

  /** GET /api/v1/dashboard/alerts — actionable alerts for all authenticated portal users */
  @Get('alerts')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.BURSAR, UserRole.STUDENT, UserRole.PARENT)
  getAlerts(@CurrentUser() actor: { schoolId: string }) {
    return this.dashboardService.getAlerts(actor.schoolId);
  }

  /** GET /api/v1/dashboard/enrollment — enrollment per class (chart data) */
  @Get('enrollment')
  @Roles(UserRole.ADMIN)
  getEnrollment(@CurrentUser() actor: { schoolId: string }) {
    return this.dashboardService.getEnrollmentBreakdown(actor.schoolId);
  }

  /** GET /api/v1/dashboard/fees — fee collection by term (chart data) */
  @Get('fees')
  @Roles(UserRole.ADMIN, UserRole.BURSAR)
  getFees(@CurrentUser() actor: { schoolId: string }) {
    return this.dashboardService.getFeeCollectionByTerm(actor.schoolId);
  }

  /** GET /api/v1/dashboard/activity — recent audit log */
  @Get('activity')
  @Roles(UserRole.ADMIN)
  getActivity(@CurrentUser() actor: { schoolId: string }) {
    return this.dashboardService.getRecentActivity(actor.schoolId);
  }
}
