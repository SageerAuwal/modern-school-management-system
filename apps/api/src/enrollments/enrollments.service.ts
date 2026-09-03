import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { EnrollStudentDto, TransferStudentDto } from './dto/enrollment.dto';
import { EnrollmentStatus } from '@prisma/client';

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /** Enroll a student in a class section for an academic year */
  async enroll(
    dto: EnrollStudentDto,
    schoolId: string,
    actorId: string,
    actorEmail: string,
  ) {
    // Verify student belongs to this school
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, schoolId },
    });
    if (!student) throw new NotFoundException('Student not found');
    if (student.enrollmentStatus !== EnrollmentStatus.ACTIVE) {
      throw new BadRequestException('Cannot enroll a withdrawn or graduated student');
    }

    // Verify class section belongs to this school
    const section = await this.prisma.classSection.findFirst({
      where: { id: dto.classSectionId, schoolId, isActive: true },
    });
    if (!section) throw new NotFoundException('Class section not found or inactive');

    // Check capacity
    if (section.capacity) {
      const activeCount = await this.prisma.enrollment.count({
        where: { classSectionId: dto.classSectionId, status: EnrollmentStatus.ACTIVE },
      });
      if (activeCount >= section.capacity) {
        throw new BadRequestException(
          `Class "${section.name}" is full (capacity: ${section.capacity})`,
        );
      }
    }

    // Check for duplicate active enrollment in same class/year
    const existing = await this.prisma.enrollment.findUnique({
      where: {
        studentId_classSectionId_academicYear: {
          studentId: dto.studentId,
          classSectionId: dto.classSectionId,
          academicYear: dto.academicYear,
        },
      },
    });
    if (existing && existing.status === EnrollmentStatus.ACTIVE) {
      throw new ConflictException('Student is already enrolled in this class for this year');
    }

    const enrollment = await this.prisma.enrollment.create({
      data: {
        studentId: dto.studentId,
        classSectionId: dto.classSectionId,
        academicYear: dto.academicYear,
        status: EnrollmentStatus.ACTIVE,
      },
      include: {
        student: { select: { firstName: true, lastName: true, admissionNumber: true } },
        classSection: { select: { name: true, level: true } },
      },
    });

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'STUDENT_ENROLLED',
      targetType: 'ENROLLMENT',
      targetId: enrollment.id,
      afterValue: {
        studentId: dto.studentId,
        classSectionId: dto.classSectionId,
        academicYear: dto.academicYear,
      } as Record<string, unknown>,
    });

    return enrollment;
  }

  /** Transfer a student from their current class to another */
  async transfer(
    enrollmentId: string,
    dto: TransferStudentDto,
    schoolId: string,
    actorId: string,
    actorEmail: string,
  ) {
    const current = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, status: EnrollmentStatus.ACTIVE },
      include: {
        student: { select: { schoolId: true, firstName: true, lastName: true } },
        classSection: { select: { name: true } },
      },
    });
    if (!current) throw new NotFoundException('Active enrollment not found');
    if (current.student.schoolId !== schoolId) {
      throw new NotFoundException('Enrollment not found');
    }

    const targetSection = await this.prisma.classSection.findFirst({
      where: { id: dto.targetClassSectionId, schoolId, isActive: true },
    });
    if (!targetSection) throw new NotFoundException('Target class not found or inactive');

    // Close current enrollment
    await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: EnrollmentStatus.TRANSFERRED,
        exitedAt: new Date(),
        exitReason: dto.reason ?? 'Transfer',
      },
    });

    // Create new enrollment in target class
    const newEnrollment = await this.prisma.enrollment.create({
      data: {
        studentId: current.studentId,
        classSectionId: dto.targetClassSectionId,
        academicYear: current.academicYear,
        status: EnrollmentStatus.ACTIVE,
      },
      include: {
        classSection: { select: { name: true, level: true } },
      },
    });

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'STUDENT_TRANSFERRED',
      targetType: 'ENROLLMENT',
      targetId: newEnrollment.id,
      beforeValue: { classSectionId: current.classSectionId, className: current.classSection.name } as Record<string, unknown>,
      afterValue: { classSectionId: dto.targetClassSectionId, className: targetSection.name, reason: dto.reason } as Record<string, unknown>,
    });

    return newEnrollment;
  }

  /** Get all enrollments for a student (history) */
  async getStudentHistory(studentId: string, schoolId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
    });
    if (!student) throw new NotFoundException('Student not found');

    return this.prisma.enrollment.findMany({
      where: { studentId },
      include: {
        classSection: { select: { id: true, name: true, level: true, academicYear: true } },
      },
      orderBy: { enrolledAt: 'desc' },
    });
  }
}
