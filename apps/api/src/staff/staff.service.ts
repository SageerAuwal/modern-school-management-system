import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { CreateStaffRecordDto } from './dto/create-staff.dto';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateStaffRecordDto, schoolId: string, actorId: string, actorEmail: string) {
    let createdUser: any = null;

    // 1-Step Portal Account Creation
    if (dto.createPortalAccount && dto.email && dto.password) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase() },
      });
      if (existingUser) {
        throw new ConflictException('A user account with this email already exists');
      }

      let assignedRole: UserRole = UserRole.TEACHER;
      if (dto.portalRole && Object.values(UserRole).includes(dto.portalRole as UserRole)) {
        assignedRole = dto.portalRole as UserRole;
      } else if (dto.role.toLowerCase().includes('admin') || dto.role.toLowerCase().includes('principal')) {
        assignedRole = UserRole.ADMIN;
      } else if (dto.role.toLowerCase().includes('librarian')) {
        assignedRole = UserRole.LIBRARIAN;
      } else if (dto.role.toLowerCase().includes('nurse')) {
        assignedRole = UserRole.NURSE;
      }

      const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
      createdUser = await this.prisma.user.create({
        data: {
          schoolId,
          email: dto.email.toLowerCase(),
          passwordHash,
          role: assignedRole,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          phone: dto.phone?.trim() || null,
          photoUrl: dto.photoUrl || null,
          isActive: dto.isActive !== false,
        },
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
          phone: true,
          isActive: true,
          createdAt: true,
        },
      });
    }

    const { email, password, createPortalAccount, portalRole, ...staffData } = dto;
    const record = await this.prisma.staffRecord.create({
      data: {
        ...staffData,
        schoolId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'STAFF_RECORD_CREATED',
      targetType: 'STAFF_RECORD',
      targetId: record.id,
      afterValue: {
        firstName: record.firstName,
        lastName: record.lastName,
        role: record.role,
        portalAccountCreated: !!createdUser,
      } as Record<string, unknown>,
    });

    return {
      ...record,
      user: createdUser,
    };
  }

  async findAll(schoolId: string, activeOnly = true) {
    const staffRecords = await this.prisma.staffRecord.findMany({
      where: { schoolId, ...(activeOnly ? { isActive: true } : {}) },
      orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
    });

    // Match with portal User accounts for the school
    const users = await this.prisma.user.findMany({
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
        lastLoginAt: true,
      },
    });

    return staffRecords.map((staff) => {
      // Find matching user by phone or name
      const matchedUser = users.find((u) => {
        if (staff.phone && u.phone && staff.phone.trim() === u.phone.trim()) return true;
        return (
          u.firstName.trim().toLowerCase() === staff.firstName.trim().toLowerCase() &&
          u.lastName.trim().toLowerCase() === staff.lastName.trim().toLowerCase()
        );
      });

      return {
        ...staff,
        email: matchedUser?.email ?? null,
        user: matchedUser ?? null,
      };
    });
  }

  async findOne(id: string, schoolId: string) {
    const record = await this.prisma.staffRecord.findFirst({ where: { id, schoolId } });
    if (!record) throw new NotFoundException('Staff record not found');

    // Find matching user account
    const matchedUser = await this.prisma.user.findFirst({
      where: {
        schoolId,
        OR: [
          record.phone ? { phone: record.phone } : {},
          {
            firstName: { equals: record.firstName, mode: 'insensitive' },
            lastName: { equals: record.lastName, mode: 'insensitive' },
          },
        ],
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
        mfaEnabled: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    let assignedClasses: any[] = [];
    let assignedSubjects: any[] = [];
    let attendanceCount = 0;
    let scoresCount = 0;

    if (matchedUser) {
      // Classes where teacher is class teacher
      assignedClasses = await this.prisma.classSection.findMany({
        where: { teacherId: matchedUser.id, schoolId },
        select: { id: true, name: true, level: true, academicYear: true, capacity: true },
      });

      // Subjects assigned to teacher
      assignedSubjects = await this.prisma.classSubject.findMany({
        where: { teacherId: matchedUser.id },
        include: {
          classSection: { select: { id: true, name: true, level: true } },
          subject: { select: { id: true, name: true, code: true } },
        },
      });

      attendanceCount = await this.prisma.attendanceRecord.count({
        where: { markedById: matchedUser.id },
      });

      scoresCount = await this.prisma.score.count({
        where: { enteredById: matchedUser.id },
      });
    }

    return {
      ...record,
      email: matchedUser?.email ?? null,
      user: matchedUser ?? null,
      teachingAssignments: {
        classes: assignedClasses,
        subjects: assignedSubjects,
      },
      activityMetrics: {
        attendanceRecordsMarked: attendanceCount,
        scoresSubmitted: scoresCount,
      },
    };
  }

  async update(id: string, schoolId: string, dto: Partial<CreateStaffRecordDto>, actorId: string, actorEmail: string) {
    const existing = await this.findOne(id, schoolId);
    const { email, password, createPortalAccount, portalRole, ...staffData } = dto;

    const updated = await this.prisma.staffRecord.update({
      where: { id },
      data: {
        ...staffData,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.isActive === true ? null : (dto.endDate ? new Date(dto.endDate) : undefined),
      },
    });

    // If user account exists, sync phone/name
    if (existing.user?.id) {
      await this.prisma.user.update({
        where: { id: existing.user.id },
        data: {
          firstName: dto.firstName ? dto.firstName.trim() : undefined,
          lastName: dto.lastName ? dto.lastName.trim() : undefined,
          phone: dto.phone ? dto.phone.trim() : undefined,
          photoUrl: dto.photoUrl,
        },
      });
    }

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'STAFF_RECORD_UPDATED',
      targetType: 'STAFF_RECORD',
      targetId: id,
      beforeValue: { firstName: existing.firstName, lastName: existing.lastName } as Record<string, unknown>,
      afterValue: dto as unknown as Record<string, unknown>,
    });
    return updated;
  }

  async deactivate(id: string, schoolId: string, actorId: string, actorEmail: string) {
    const existing = await this.findOne(id, schoolId);
    const updated = await this.prisma.staffRecord.update({
      where: { id },
      data: { isActive: false, endDate: new Date() },
    });

    if (existing.user?.id) {
      await this.prisma.user.update({
        where: { id: existing.user.id },
        data: { isActive: false },
      });
    }

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'STAFF_RECORD_DEACTIVATED',
      targetType: 'STAFF_RECORD',
      targetId: id,
    });
    return updated;
  }

  async reactivate(id: string, schoolId: string, actorId: string, actorEmail: string) {
    const existing = await this.findOne(id, schoolId);
    const updated = await this.prisma.staffRecord.update({
      where: { id },
      data: { isActive: true, endDate: null },
    });

    if (existing.user?.id) {
      await this.prisma.user.update({
        where: { id: existing.user.id },
        data: { isActive: true },
      });
    }

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'STAFF_RECORD_REACTIVATED',
      targetType: 'STAFF_RECORD',
      targetId: id,
    });
    return updated;
  }

  async resetPassword(id: string, schoolId: string, newPassword: string, actorId: string, actorEmail: string) {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }

    const staff = await this.findOne(id, schoolId);
    if (!staff.user?.id) {
      throw new NotFoundException('This staff member does not have a linked portal user account');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: staff.user.id },
      data: { passwordHash },
    });

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'STAFF_PASSWORD_RESET',
      targetType: 'USER',
      targetId: staff.user.id,
    });

    return { message: 'Staff portal password reset successfully' };
  }

  async delete(id: string, schoolId: string, actorId: string, actorEmail: string) {
    const existing = await this.findOne(id, schoolId);
    const deleted = await this.prisma.staffRecord.delete({
      where: { id },
    });
    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'STAFF_RECORD_DELETED',
      targetType: 'STAFF_RECORD',
      targetId: id,
      beforeValue: { firstName: existing.firstName, lastName: existing.lastName, role: existing.role } as Record<string, unknown>,
    });
    return deleted;
  }
}
