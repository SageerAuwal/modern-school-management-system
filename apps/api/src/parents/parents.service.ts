import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { CreateParentDto, LinkStudentDto } from './dto/create-parent.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class ParentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * List all parents for the school
   */
  async findAll(schoolId: string) {
    const parents = await this.prisma.user.findMany({
      where: { schoolId, role: UserRole.PARENT },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        photoUrl: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    // Fetch linked students for all these parents
    const parentIds = parents.map((p) => p.id);
    const links = await this.prisma.guardianLink.findMany({
      where: { guardianId: { in: parentIds } },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
            enrollments: {
              where: { status: 'ACTIVE' },
              take: 1,
              orderBy: { enrolledAt: 'desc' },
              include: {
                classSection: {
                  select: { id: true, name: true, level: true },
                },
              },
            },
          },
        },
      },
    });

    const linkMap = new Map<string, any[]>();
    for (const link of links) {
      const list = linkMap.get(link.guardianId) ?? [];
      list.push({
        id: link.id,
        relationship: link.relationship,
        isPrimary: link.isPrimary,
        student: {
          id: link.student.id,
          firstName: link.student.firstName,
          lastName: link.student.lastName,
          admissionNumber: link.student.admissionNumber,
          currentClass: link.student.enrollments[0]?.classSection?.name ?? null,
        },
      });
      linkMap.set(link.guardianId, list);
    }

    return parents.map((p) => ({
      ...p,
      children: linkMap.get(p.id) ?? [],
      childrenCount: (linkMap.get(p.id) ?? []).length,
    }));
  }

  /**
   * Get 360-degree monitoring view for a specific parent
   */
  async findOne(id: string, schoolId: string) {
    const parent = await this.prisma.user.findFirst({
      where: { id, schoolId, role: UserRole.PARENT },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        photoUrl: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!parent) throw new NotFoundException('Parent not found');

    // Fetch linked students with full performance, attendance, and fee summary
    const links = await this.prisma.guardianLink.findMany({
      where: { guardianId: id },
      include: {
        student: {
          include: {
            enrollments: {
              where: { status: 'ACTIVE' },
              take: 1,
              orderBy: { enrolledAt: 'desc' },
              include: {
                classSection: {
                  select: { id: true, name: true, level: true },
                },
              },
            },
            attendanceRecords: {
              take: 30,
              orderBy: { date: 'desc' },
              select: { date: true, status: true },
            },
            invoices: {
              orderBy: { createdAt: 'desc' },
              include: {
                term: { select: { id: true, name: true, academicYear: true } },
                items: true,
                payments: { select: { id: true, amount: true, method: true, paidAt: true, reference: true } },
              },
            },
            scores: {
              take: 10,
              orderBy: { createdAt: 'desc' },
              include: {
                subject: { select: { id: true, name: true, code: true } },
              },
            },
            clinicVisits: {
              take: 5,
              orderBy: { visitDate: 'desc' },
              include: {
                dispenses: {
                  include: {
                    inventory: { select: { name: true, unit: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const children = (links as any[]).map((link: any) => {
      const s = link.student ?? {};
      const attendanceRecords = s.attendanceRecords ?? [];
      const totalAttendance = attendanceRecords.length;
      const presentCount = attendanceRecords.filter((a: any) => a.status === 'PRESENT').length;
      const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 100;

      const invoices = s.invoices ?? [];
      const totalInvoiced = invoices.reduce((sum: number, inv: any) => sum + Number(inv.totalAmount || 0), 0);
      const totalPaid = invoices.reduce((sum: number, inv: any) => sum + Number(inv.paidAmount || 0), 0);
      const outstandingBalance = Math.max(0, totalInvoiced - totalPaid);

      return {
        linkId: link.id,
        relationship: link.relationship,
        isPrimary: link.isPrimary,
        id: s.id,
        studentId: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        admissionNumber: s.admissionNumber,
        photoUrl: s.photoUrl,
        bloodGroup: s.bloodGroup,
        genotype: s.genotype,
        allergies: s.allergies,
        chronicConditions: s.chronicConditions,
        enrollmentStatus: s.enrollmentStatus ?? "ACTIVE",
        classSection: s.enrollments?.[0]?.classSection ?? null,
        enrollments: s.enrollments ?? [],
        attendanceRate,
        attendanceRecordsCount: totalAttendance,
        feeSummary: {
          totalInvoiced,
          totalPaid,
          outstandingBalance,
        },
        invoices,
        recentScores: s.scores ?? [],
        clinicVisits: s.clinicVisits ?? [],
      };
    });

    const totalFeeBalance = children.reduce((sum: number, c: any) => sum + Number(c.feeSummary.outstandingBalance || 0), 0);

    return {
      ...parent,
      totalFeeBalance,
      children,
    };
  }

  /**
   * 1-Step creation: Create parent user account and link to student(s)
   */
  async create(dto: CreateParentDto, schoolId: string, actorId: string, actorEmail: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('A user account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        schoolId,
        email: dto.email.toLowerCase(),
        passwordHash,
        role: UserRole.PARENT,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone?.trim() || null,
        isActive: true,
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

    // Link students if provided
    if (dto.studentIds && dto.studentIds.length > 0) {
      for (const studentId of dto.studentIds) {
        try {
          await this.prisma.guardianLink.create({
            data: {
              studentId,
              guardianId: user.id,
              relationship: dto.relationship || 'Parent',
              isPrimary: true,
            },
          });
        } catch {
          // Ignore duplicate link
        }
      }
    }

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'PARENT_REGISTERED',
      targetType: 'USER',
      targetId: user.id,
      afterValue: { email: user.email, linkedStudents: dto.studentIds?.length || 0 },
    });

    return user;
  }

  /**
   * Update parent profile details
   */
  async update(
    id: string,
    schoolId: string,
    dto: { firstName?: string; lastName?: string; phone?: string; isActive?: boolean },
    actorId: string,
    actorEmail: string,
  ) {
    await this.findOne(id, schoolId);

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: dto.firstName?.trim(),
        lastName: dto.lastName?.trim(),
        phone: dto.phone?.trim(),
        isActive: dto.isActive,
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
      },
    });

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'PARENT_PROFILE_UPDATED',
      targetType: 'USER',
      targetId: id,
      afterValue: dto,
    });

    return updated;
  }

  /**
   * Reset parent password directly (Admin control)
   */
  async resetPassword(
    id: string,
    schoolId: string,
    newPassword: string,
    actorId: string,
    actorEmail: string,
  ) {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }

    await this.findOne(id, schoolId);
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'PARENT_PASSWORD_RESET',
      targetType: 'USER',
      targetId: id,
    });

    return { message: 'Password reset successfully' };
  }

  /**
   * Link an additional student to this parent
   */
  async linkStudent(
    parentId: string,
    schoolId: string,
    dto: LinkStudentDto,
    actorId: string,
    actorEmail: string,
  ) {
    await this.findOne(parentId, schoolId);

    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, schoolId },
    });
    if (!student) throw new NotFoundException('Student not found in this school');

    const link = await this.prisma.guardianLink.upsert({
      where: {
        studentId_guardianId: {
          studentId: dto.studentId,
          guardianId: parentId,
        },
      },
      create: {
        studentId: dto.studentId,
        guardianId: parentId,
        relationship: dto.relationship || 'Parent',
        isPrimary: false,
      },
      update: {
        relationship: dto.relationship || 'Parent',
      },
    });

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'GUARDIAN_LINKED_TO_STUDENT',
      targetType: 'GUARDIAN_LINK',
      targetId: link.id,
      afterValue: { parentId, studentId: dto.studentId },
    });

    return link;
  }

  /**
   * Unlink a student from this parent
   */
  async unlinkStudent(
    parentId: string,
    studentId: string,
    schoolId: string,
    actorId: string,
    actorEmail: string,
  ) {
    await this.findOne(parentId, schoolId);

    await this.prisma.guardianLink.deleteMany({
      where: {
        guardianId: parentId,
        studentId,
      },
    });

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'GUARDIAN_UNLINKED_FROM_STUDENT',
      targetType: 'GUARDIAN_LINK',
      targetId: `${parentId}_${studentId}`,
    });

    return { message: 'Student unlinked successfully' };
  }
}
