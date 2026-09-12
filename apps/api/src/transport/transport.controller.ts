import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { TransportService } from './transport.service';
import { CreateBusDto, CreateRouteDto, AssignStudentDto } from './dto/transport.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('transport')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransportController {
  constructor(private readonly transportService: TransportService) {}

  // ── Buses ─────────────────────────────────────────────────────────────────

  @Post('buses')
  @Roles(UserRole.ADMIN)
  createBus(@Body() dto: CreateBusDto, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.transportService.createBus(dto, actor.schoolId, actor.id, actor.email);
  }

  @Get('buses')
  @Roles(UserRole.ADMIN)
  listBuses(@CurrentUser() actor: { schoolId: string }) {
    return this.transportService.listBuses(actor.schoolId);
  }

  @Get('buses/:id')
  @Roles(UserRole.ADMIN)
  getBus(@Param('id') id: string, @CurrentUser() actor: { schoolId: string }) {
    return this.transportService.getBus(id, actor.schoolId);
  }

  @Patch('buses/:id')
  @Roles(UserRole.ADMIN)
  updateBus(@Param('id') id: string, @Body() dto: Partial<CreateBusDto>, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.transportService.updateBus(id, actor.schoolId, dto, actor.id, actor.email);
  }

  @Patch('buses/:id/deactivate')
  @Roles(UserRole.ADMIN)
  deactivateBus(@Param('id') id: string, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.transportService.deactivateBus(id, actor.schoolId, actor.id, actor.email);
  }

  /** GET /api/v1/transport/buses/:id/roster?academicYear= */
  @Get('buses/:id/roster')
  @Roles(UserRole.ADMIN)
  getBusRoster(
    @Param('id') id: string,
    @Query('academicYear') academicYear: string,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.transportService.getBusRoster(id, actor.schoolId, academicYear);
  }

  // ── Routes ────────────────────────────────────────────────────────────────

  @Post('routes')
  @Roles(UserRole.ADMIN)
  createRoute(@Body() dto: CreateRouteDto, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.transportService.createRoute(dto, actor.schoolId, actor.id, actor.email);
  }

  @Get('routes')
  @Roles(UserRole.ADMIN)
  listRoutes(@CurrentUser() actor: { schoolId: string }) {
    return this.transportService.listRoutes(actor.schoolId);
  }

  @Get('routes/:id')
  @Roles(UserRole.ADMIN)
  getRoute(@Param('id') id: string, @CurrentUser() actor: { schoolId: string }) {
    return this.transportService.getRoute(id, actor.schoolId);
  }

  @Patch('routes/:id')
  @Roles(UserRole.ADMIN)
  updateRoute(
    @Param('id') id: string,
    @Body() dto: Partial<Pick<CreateRouteDto, 'name' | 'description' | 'busId'>>,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.transportService.updateRoute(id, actor.schoolId, dto, actor.id, actor.email);
  }

  @Patch('routes/:id/deactivate')
  @Roles(UserRole.ADMIN)
  deactivateRoute(@Param('id') id: string, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.transportService.deactivateRoute(id, actor.schoolId, actor.id, actor.email);
  }

  // ── Student Assignments ───────────────────────────────────────────────────

  /** POST /api/v1/transport/assign — assign or re-assign student to bus+route */
  @Post('assign')
  @Roles(UserRole.ADMIN)
  assignStudent(@Body() dto: AssignStudentDto, @CurrentUser() actor: { id: string; email: string; schoolId: string }) {
    return this.transportService.assignStudent(dto, actor.schoolId, actor.id, actor.email);
  }

  /** PATCH /api/v1/transport/unassign/:studentId?academicYear= */
  @Patch('unassign/:studentId')
  @Roles(UserRole.ADMIN)
  unassignStudent(
    @Param('studentId') studentId: string,
    @Query('academicYear') academicYear: string,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.transportService.unassignStudent(studentId, academicYear, actor.schoolId, actor.id, actor.email);
  }
}
