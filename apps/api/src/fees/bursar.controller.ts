import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { BursarService } from './bursar.service';
import { CollectFeeDto, CloseDrawerDto } from './dto/bursar.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('bursar')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BursarController {
  constructor(private readonly bursarService: BursarService) {}

  /** GET /api/v1/bursar/drawer/today — fetch today's active cash drawer and live totals */
  @Get('drawer/today')
  @Roles(UserRole.BURSAR, UserRole.ADMIN)
  getDailyDrawer(@CurrentUser() actor: { id: string; schoolId: string }) {
    return this.bursarService.getDailyDrawer(actor.schoolId, actor.id);
  }

  /** POST /api/v1/bursar/drawer/close — close drawer, record variance, generate handover */
  @Post('drawer/close')
  @Roles(UserRole.BURSAR, UserRole.ADMIN)
  closeDailyDrawer(
    @Body() dto: CloseDrawerDto,
    @CurrentUser() actor: { id: string; schoolId: string; firstName: string; lastName: string },
  ) {
    const actorName = `${actor.firstName || 'School'} ${actor.lastName || 'Bursar'}`.trim();
    return this.bursarService.closeDailyDrawer(dto, actor.schoolId, actor.id, actorName);
  }

  /** POST /api/v1/bursar/collect-fee — cashier collection, generates certified sequential receipt */
  @Post('collect-fee')
  @Roles(UserRole.BURSAR, UserRole.ADMIN)
  collectFee(
    @Body() dto: CollectFeeDto,
    @CurrentUser() actor: { id: string; schoolId: string; firstName: string; lastName: string },
  ) {
    const actorName = `${actor.firstName || 'School'} ${actor.lastName || 'Bursar'}`.trim();
    return this.bursarService.collectFee(dto, actor.schoolId, actor.id, actorName);
  }

  /** GET /api/v1/bursar/student/:studentId/statement — full financial ledger */
  @Get('student/:studentId/statement')
  @Roles(UserRole.BURSAR, UserRole.ADMIN, UserRole.PARENT)
  getStudentStatement(
    @Param('studentId') studentId: string,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.bursarService.getStudentStatement(studentId, actor.schoolId);
  }

  /** GET /api/v1/bursar/debtors — debtors aging matrix and balance recovery list */
  @Get('debtors')
  @Roles(UserRole.BURSAR, UserRole.ADMIN)
  getDebtorsList(
    @Query('classSectionId') classSectionId: string,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.bursarService.getDebtorsList(actor.schoolId, classSectionId);
  }

  /** GET /api/v1/bursar/receipt/:paymentId — printable receipt details for reprint */
  @Get('receipt/:paymentId')
  @Roles(UserRole.BURSAR, UserRole.ADMIN, UserRole.PARENT)
  getReceipt(
    @Param('paymentId') paymentId: string,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.bursarService.getReceiptByPaymentId(paymentId, actor.schoolId);
  }
}
