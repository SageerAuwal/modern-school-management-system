import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Invite a new user — admin-only action.
   * Creates the user record and returns an invite token.
   * In production this token would be emailed; for now it's returned in the response.
   */
  async inviteUser(dto: InviteUserDto, schoolId: string, actorId: string, actorEmail: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const inviteToken = randomBytes(32).toString('hex');
    const inviteExpiry = new Date();
    inviteExpiry.setHours(inviteExpiry.getHours() + 48); // 48-hour invite window

    // Placeholder password hash — user sets real password via invite flow
    const placeholderHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);

    const user = await this.prisma.user.create({
      data: {
        schoolId,
        email: dto.email.toLowerCase(),
        passwordHash: placeholderHash,
        role: dto.role,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        inviteToken,
        inviteExpiry,
        isActive: false, // Activated when they set their password
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        inviteToken: true,
        inviteExpiry: true,
        createdAt: true,
      },
    });

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'USER_INVITED',
      targetType: 'USER',
      targetId: user.id,
      afterValue: { email: user.email, role: user.role },
    });

    return {
      ...user,
      inviteUrl: `/set-password?token=${inviteToken}`, // Frontend consumes this
    };
  }

  /**
   * List all users in the school (admin only)
   */
  async findAll(schoolId: string) {
    return this.prisma.user.findMany({
      where: { schoolId },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        phone: true,
        photoUrl: true,
        isActive: true,
        mfaEnabled: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single user by ID (admin only)
   */
  async findOne(id: string, schoolId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, schoolId },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        phone: true,
        photoUrl: true,
        isActive: true,
        mfaEnabled: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /**
   * Update profile (for self / parent / staff / student / admin)
   */
  async updateProfile(
    userId: string,
    schoolId: string,
    dto: { firstName?: string; lastName?: string; phone?: string; photoUrl?: string; email?: string },
    actorId: string,
    actorEmail: string,
  ) {
    const existing = await this.findOne(userId, schoolId);

    if (dto.email && dto.email.trim().toLowerCase() !== existing.email.toLowerCase()) {
      const collision = await this.prisma.user.findFirst({
        where: { email: dto.email.trim().toLowerCase(), NOT: { id: userId } },
      });
      if (collision) {
        throw new ConflictException('A user with this email address already exists');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName !== undefined ? dto.firstName.trim() : existing.firstName,
        lastName: dto.lastName !== undefined ? dto.lastName.trim() : existing.lastName,
        phone: dto.phone !== undefined ? dto.phone.trim() : existing.phone,
        email: dto.email !== undefined ? dto.email.trim().toLowerCase() : existing.email,
        photoUrl: dto.photoUrl !== undefined ? dto.photoUrl : existing.photoUrl,
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        phone: true,
        photoUrl: true,
        isActive: true,
      },
    });

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'USER_PROFILE_UPDATED',
      targetType: 'USER',
      targetId: userId,
      afterValue: { firstName: updated.firstName, lastName: updated.lastName, email: updated.email, phone: updated.phone },
    });

    return updated;
  }

  /**
   * Change login password for authenticated user
   */
  async changePassword(
    userId: string,
    schoolId: string,
    dto: { currentPassword: string; newPassword: string },
    actorId: string,
    actorEmail: string,
  ) {
    if (!dto.currentPassword) {
      throw new BadRequestException('Current password is required');
    }
    if (!dto.newPassword || dto.newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, schoolId },
    });
    if (!user) throw new NotFoundException('User not found');

    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'USER_PASSWORD_CHANGED',
      targetType: 'USER',
      targetId: userId,
    });

    return { message: 'Password changed successfully' };
  }

  /**
   * Deactivate a user — soft disable, never delete
   */
  async deactivate(id: string, schoolId: string, actorId: string, actorEmail: string) {
    const user = await this.findOne(id, schoolId);

    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Revoke all their refresh tokens immediately
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'USER_DEACTIVATED',
      targetType: 'USER',
      targetId: id,
      beforeValue: { isActive: true },
      afterValue: { isActive: false },
    });

    return { message: `User ${user.email} has been deactivated` };
  }

  /**
   * Reactivate a user
   */
  async reactivate(id: string, schoolId: string, actorId: string, actorEmail: string) {
    await this.findOne(id, schoolId);

    await this.prisma.user.update({
      where: { id },
      data: { isActive: true },
    });

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'USER_REACTIVATED',
      targetType: 'USER',
      targetId: id,
      afterValue: { isActive: true },
    });

    return { message: 'User reactivated successfully' };
  }
}
