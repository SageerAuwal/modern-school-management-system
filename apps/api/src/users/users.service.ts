import {
  Injectable,
  ConflictException,
  NotFoundException,
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
