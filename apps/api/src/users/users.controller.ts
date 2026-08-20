import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * POST /api/v1/users/invite
   * Admin-only: invite a new user by email + role
   */
  @Post('invite')
  @Roles(UserRole.ADMIN)
  inviteUser(
    @Body() dto: InviteUserDto,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.usersService.inviteUser(
      dto,
      actor.schoolId,
      actor.id,
      actor.email,
    );
  }

  /**
   * GET /api/v1/users
   * Admin-only: list all users in the school
   */
  @Get()
  @Roles(UserRole.ADMIN)
  findAll(@CurrentUser() actor: { schoolId: string }) {
    return this.usersService.findAll(actor.schoolId);
  }

  /**
   * GET /api/v1/users/:id
   * Admin-only: get a specific user
   */
  @Get(':id')
  @Roles(UserRole.ADMIN)
  findOne(
    @Param('id') id: string,
    @CurrentUser() actor: { schoolId: string },
  ) {
    return this.usersService.findOne(id, actor.schoolId);
  }

  /**
   * PATCH /api/v1/users/:id/deactivate
   * Admin-only: deactivate a user and revoke all their sessions
   */
  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN)
  deactivate(
    @Param('id') id: string,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.usersService.deactivate(
      id,
      actor.schoolId,
      actor.id,
      actor.email,
    );
  }

  /**
   * PATCH /api/v1/users/:id/reactivate
   * Admin-only: reactivate a previously deactivated user
   */
  @Patch(':id/reactivate')
  @Roles(UserRole.ADMIN)
  reactivate(
    @Param('id') id: string,
    @CurrentUser() actor: { id: string; email: string; schoolId: string },
  ) {
    return this.usersService.reactivate(
      id,
      actor.schoolId,
      actor.id,
      actor.email,
    );
  }
}
