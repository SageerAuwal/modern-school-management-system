import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ParentsService } from './parents.service';
import { CreateParentDto, LinkStudentDto, ResetPasswordDto } from './dto/create-parent.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('parents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  findAll(@CurrentUser() actor: { schoolId: string }) {
    return this.parentsService.findAll(actor.schoolId);
  }

  @Get('my-children')
  @Roles(UserRole.PARENT, UserRole.ADMIN)
  getMyChildren(@CurrentUser() actor: { id: string; schoolId: string }) {
    return this.parentsService.findOne(actor.id, actor.schoolId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  findOne(
    @Param('id') id: string,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.parentsService.findOne(id, actor.schoolId);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(
    @Body() dto: CreateParentDto,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.parentsService.create(dto, actor.schoolId, actor.id, actor.email);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: { firstName?: string; lastName?: string; phone?: string; isActive?: boolean },
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.parentsService.update(id, actor.schoolId, dto, actor.id, actor.email);
  }

  @Post(':id/reset-password')
  @Roles(UserRole.ADMIN)
  resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.parentsService.resetPassword(
      id,
      actor.schoolId,
      dto.newPassword,
      actor.id,
      actor.email,
    );
  }

  @Post(':id/link-student')
  @Roles(UserRole.ADMIN)
  linkStudent(
    @Param('id') id: string,
    @Body() dto: LinkStudentDto,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.parentsService.linkStudent(
      id,
      actor.schoolId,
      dto,
      actor.id,
      actor.email,
    );
  }

  @Delete(':id/unlink-student/:studentId')
  @Roles(UserRole.ADMIN)
  unlinkStudent(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.parentsService.unlinkStudent(
      id,
      studentId,
      actor.schoolId,
      actor.id,
      actor.email,
    );
  }
}
