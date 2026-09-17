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
import { EnrollmentStatus } from '@prisma/client';

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

  // ── Create ───────────────────────────────────────────────────────────────

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

    const { classSectionId, ...studentData } = dto;

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
      afterValue: { firstName: student.firstName, lastName: student.lastName, admissionNumber: student.admissionNumber, classSectionId } as Record<string, unknown>,
    });

    return student;
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

  // ── Get One ───────────────────────────────────────────────────────────────

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
      },
    });

    if (!student) throw new NotFoundException('Student not found');
    return student;
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
}
