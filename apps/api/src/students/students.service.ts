import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { FilterStudentsDto, LinkGuardianDto } from './dto/student-filters.dto';
import { EnrollmentStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Fields returned for list views — no sensitive medical data
const STUDENT_LIST_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  otherNames: true,
  admissionNumber: true,
  gender: true,
  enrollmentStatus: true,
  enrolledAt: true,
  photoUrl: true,
  guardianName: true,
  guardianPhone: true,
  guardianRelationship: true,
  guardianPhotoUrl: true,
  enrollments: {
    where: { status: EnrollmentStatus.ACTIVE },
    select: {
      classSection: { select: { id: true, name: true, level: true } },
      academicYear: true,
    },
    take: 1,
  },
};

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ── Create ────────────────────────────────────────────────────────────────

  async create(
    dto: CreateStudentDto,
    schoolId: string,
    actorId: string,
    actorEmail: string,
  ) {
    if (dto.admissionNumber) {
      const existing = await this.prisma.student.findUnique({
        where: { admissionNumber: dto.admissionNumber },
      });
      if (existing) {
        throw new ConflictException(
          `Admission number ${dto.admissionNumber} already exists`,
        );
      }
    }

    const { classSectionId, createPortalAccount, email, password, ...studentData } = dto;

    let portalUser: any = null;
    if (createPortalAccount && email && password) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (existingUser) {
        throw new ConflictException('A user account with this email already exists');
      }
      const passwordHash = await bcrypt.hash(password, 12);
      portalUser = await this.prisma.user.create({
        data: {
          schoolId,
          email: email.toLowerCase(),
          passwordHash,
          role: UserRole.STUDENT,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          phone: dto.guardianPhone?.trim() || null,
          photoUrl: dto.photoUrl,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
          isActive: true,
        },
      });
    }

    const student = await this.prisma.student.create({
      data: {
        ...studentData,
        schoolId,
        dateOfBirth: studentData.dateOfBirth ? new Date(studentData.dateOfBirth) : undefined,
      },
    });

    if (classSectionId) {
      const classSection = await this.prisma.classSection.findFirst({
        where: { id: classSectionId, schoolId },
      });
      if (classSection) {
        await this.prisma.enrollment.create({
          data: {
            studentId: student.id,
            classSectionId: classSection.id,
            academicYear: classSection.academicYear || '2025/2026',
            status: EnrollmentStatus.ACTIVE,
          },
        });
      }
    }

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'STUDENT_CREATED',
      targetType: 'STUDENT',
      targetId: student.id,
      afterValue: {
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNumber: student.admissionNumber,
        classSectionId,
        portalAccountCreated: !!portalUser,
      } as Record<string, unknown>,
    });

    return {
      ...student,
      portalUser,
    };
  }

  // ── List ─────────────────────────────────────────────────────────────────

  async findAll(schoolId: string, filters: FilterStudentsDto) {
    const where: Record<string, unknown> = { schoolId };

    if (filters.status) {
      where['enrollmentStatus'] = filters.status;
    }

    if (filters.search) {
      where['OR'] = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { admissionNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.classSectionId) {
      where['enrollments'] = {
        some: {
          classSectionId: filters.classSectionId,
          academicYear: filters.academicYear,
          status: EnrollmentStatus.ACTIVE,
        },
      };
    }

    return this.prisma.student.findMany({
      where,
      select: STUDENT_LIST_SELECT,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  // ── Get One (360-degree Profile & Monitor) ───────────────────────────────

  async findOne(id: string, schoolId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id, schoolId },
      include: {
        guardianLinks: {
          select: {
            id: true,
            relationship: true,
            isPrimary: true,
            guardianId: true,
          },
        },
        enrollments: {
          orderBy: { enrolledAt: 'desc' },
          include: {
            classSection: {
              select: { id: true, name: true, level: true, academicYear: true },
            },
          },
        },
        attendanceRecords: {
          orderBy: { date: 'desc' },
          take: 60,
          select: { id: true, date: true, status: true, note: true },
        },
        scores: {
          orderBy: { createdAt: 'desc' },
          include: {
            subject: { select: { id: true, name: true, code: true } },
            term: { select: { id: true, name: true, academicYear: true } },
          },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          include: {
            payments: { select: { id: true, amount: true, method: true, paidAt: true, reference: true } },
          },
        },
        bookLoans: {
          orderBy: { createdAt: 'desc' },
          include: {
            book: { select: { id: true, title: true, author: true } },
          },
        },
      },
    });

    if (!student) throw new NotFoundException('Student not found');

    const s = student as any;

    // Fetch linked guardian users
    const guardianIds: string[] = (s.guardianLinks ?? []).map((g: any) => g.guardianId);
    const guardianUsers = await this.prisma.user.findMany({
      where: { id: { in: guardianIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        photoUrl: true,
        isActive: true,
        lastLoginAt: true,
      },
    });

    const guardians = (s.guardianLinks ?? []).map((link: any) => {
      const u = guardianUsers.find((g: any) => g.id === link.guardianId);
      return {
        id: link.id,
        relationship: link.relationship,
        isPrimary: link.isPrimary,
        user: u ?? null,
      };
    });

    // Check if student has a portal User account
    const portalUser = await this.prisma.user.findFirst({
      where: {
        schoolId,
        role: UserRole.STUDENT,
        firstName: { equals: s.firstName, mode: 'insensitive' },
        lastName: { equals: s.lastName, mode: 'insensitive' },
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    // Compute attendance statistics
    const attendanceList = s.attendanceRecords ?? [];
    const totalDays = attendanceList.length;
    const presentDays = attendanceList.filter((a: any) => a.status === 'PRESENT').length;
    const absentDays = attendanceList.filter((a: any) => a.status === 'ABSENT').length;
    const lateDays = attendanceList.filter((a: any) => a.status === 'LATE').length;
    const excusedDays = attendanceList.filter((a: any) => a.status === 'EXCUSED').length;
    const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

    // Compute fee totals
    const invoiceList = s.invoices ?? [];
    const totalInvoiced = invoiceList.reduce((sum: number, i: any) => sum + Number(i.totalAmount || 0), 0);
    const totalPaid = invoiceList.reduce((sum: number, i: any) => sum + Number(i.paidAmount || 0), 0);
    const outstandingBalance = Math.max(0, totalInvoiced - totalPaid);

    return {
      ...s,
      guardians,
      portalUser,
      attendanceStats: {
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        excusedDays,
        rate: attendanceRate,
      },
      feeSummary: {
        totalInvoiced,
        totalPaid,
        outstandingBalance,
      },
    };
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(
    id: string,
    schoolId: string,
    dto: UpdateStudentDto,
    actorId: string,
    actorEmail: string,
  ) {
    const existing = await this.findOne(id, schoolId);
    const { classSectionId, ...studentData } = dto;

    const updated = await this.prisma.student.update({
      where: { id },
      data: {
        ...studentData,
        dateOfBirth: studentData.dateOfBirth ? new Date(studentData.dateOfBirth) : undefined,
      },
    });

    if (classSectionId) {
      const classSection = await this.prisma.classSection.findFirst({
        where: { id: classSectionId, schoolId },
      });
      if (classSection) {
        const activeEnrollment = await this.prisma.enrollment.findFirst({
          where: { studentId: id, status: EnrollmentStatus.ACTIVE },
        });
        if (activeEnrollment && activeEnrollment.classSectionId !== classSectionId) {
          await this.prisma.enrollment.update({
            where: { id: activeEnrollment.id },
            data: { status: EnrollmentStatus.TRANSFERRED, exitedAt: new Date(), exitReason: 'Reassigned to ' + classSection.name },
          });
          await this.prisma.enrollment.create({
            data: {
              studentId: id,
              classSectionId: classSection.id,
              academicYear: classSection.academicYear || '2025/2026',
              status: EnrollmentStatus.ACTIVE,
            },
          });
        } else if (!activeEnrollment) {
          await this.prisma.enrollment.create({
            data: {
              studentId: id,
              classSectionId: classSection.id,
              academicYear: classSection.academicYear || '2025/2026',
              status: EnrollmentStatus.ACTIVE,
            },
          });
        }
      }
    }

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'STUDENT_UPDATED',
      targetType: 'STUDENT',
      targetId: id,
      beforeValue: { firstName: existing.firstName, lastName: existing.lastName } as Record<string, unknown>,
      afterValue: dto as unknown as Record<string, unknown>,
    });

    return updated;
  }

  // ── Withdraw ──────────────────────────────────────────────────────────────

  async withdraw(
    id: string,
    schoolId: string,
    reason: string,
    actorId: string,
    actorEmail: string,
  ) {
    await this.findOne(id, schoolId);

    // Close all active enrollments
    await this.prisma.enrollment.updateMany({
      where: { studentId: id, status: EnrollmentStatus.ACTIVE },
      data: {
        status: EnrollmentStatus.WITHDRAWN,
        exitedAt: new Date(),
        exitReason: reason,
      },
    });

    const student = await this.prisma.student.update({
      where: { id },
      data: {
        enrollmentStatus: EnrollmentStatus.WITHDRAWN,
        withdrawnAt: new Date(),
      },
    });

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'STUDENT_WITHDRAWN',
      targetType: 'STUDENT',
      targetId: id,
      afterValue: { reason } as Record<string, unknown>,
    });

    return student;
  }

  // ── Re-enroll ─────────────────────────────────────────────────────────────

  async reenroll(
    id: string,
    schoolId: string,
    actorId: string,
    actorEmail: string,
  ) {
    const student = await this.findOne(id, schoolId);
    if (student.enrollmentStatus === EnrollmentStatus.ACTIVE) {
      throw new BadRequestException('Student is already active');
    }

    const updated = await this.prisma.student.update({
      where: { id },
      data: { enrollmentStatus: EnrollmentStatus.ACTIVE, withdrawnAt: null },
    });

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'STUDENT_REENROLLED',
      targetType: 'STUDENT',
      targetId: id,
    });

    return updated;
  }

  // ── Guardian Links ────────────────────────────────────────────────────────

  async linkGuardian(
    studentId: string,
    schoolId: string,
    dto: LinkGuardianDto,
    actorId: string,
    actorEmail: string,
  ) {
    await this.findOne(studentId, schoolId);

    // Verify guardian exists and is a PARENT
    const guardian = await this.prisma.user.findFirst({
      where: { id: dto.guardianId, schoolId, role: 'PARENT' },
    });
    if (!guardian) {
      throw new NotFoundException('Guardian not found or is not a PARENT user');
    }

    const existing = await this.prisma.guardianLink.findUnique({
      where: { studentId_guardianId: { studentId, guardianId: dto.guardianId } },
    });
    if (existing) {
      throw new ConflictException('Guardian already linked to this student');
    }

    const link = await this.prisma.guardianLink.create({
      data: {
        studentId,
        guardianId: dto.guardianId,
        relationship: dto.relationship,
        isPrimary: false,
      },
    });

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'GUARDIAN_LINKED',
      targetType: 'STUDENT',
      targetId: studentId,
      afterValue: { guardianId: dto.guardianId, relationship: dto.relationship } as Record<string, unknown>,
    });

    return link;
  }

  async unlinkGuardian(
    studentId: string,
    schoolId: string,
    guardianId: string,
    actorId: string,
    actorEmail: string,
  ) {
    await this.findOne(studentId, schoolId);

    await this.prisma.guardianLink.delete({
      where: { studentId_guardianId: { studentId, guardianId } },
    });

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'GUARDIAN_UNLINKED',
      targetType: 'STUDENT',
      targetId: studentId,
      afterValue: { guardianId } as Record<string, unknown>,
    });

    return { message: 'Guardian unlinked successfully' };
  }

  async resetPortalPassword(
    studentId: string,
    schoolId: string,
    newPassword: string,
    actorId: string,
    actorEmail: string,
  ) {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
    });
    if (!student) throw new NotFoundException('Student not found');

    const portalUser = await this.prisma.user.findFirst({
      where: {
        schoolId,
        role: UserRole.STUDENT,
        firstName: { equals: student.firstName, mode: 'insensitive' },
        lastName: { equals: student.lastName, mode: 'insensitive' },
      },
    });

    if (!portalUser) {
      throw new NotFoundException('No linked student portal account found');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: portalUser.id },
      data: { passwordHash },
    });

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'STUDENT_PASSWORD_RESET',
      targetType: 'USER',
      targetId: portalUser.id,
    });

    return { message: 'Student portal password reset successfully' };
  }
}
