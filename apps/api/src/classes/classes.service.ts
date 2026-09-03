import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { CreateClassSectionDto } from './dto/create-class.dto';
import { PartialType } from '@nestjs/mapped-types';

class UpdateClassSectionDto extends PartialType(CreateClassSectionDto) {}

@Injectable()
export class ClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    dto: CreateClassSectionDto,
    schoolId: string,
    actorId: string,
    actorEmail: string,
  ) {
    const existing = await this.prisma.classSection.findFirst({
      where: { schoolId, name: dto.name, academicYear: dto.academicYear },
    });
    if (existing) {
      throw new ConflictException(
        `Class "${dto.name}" already exists for ${dto.academicYear}`,
      );
    }

    if (dto.teacherId) {
      const teacher = await this.prisma.user.findFirst({
        where: { id: dto.teacherId, schoolId },
      });
      if (!teacher) throw new NotFoundException('Teacher not found');
    }

    const section = await this.prisma.classSection.create({
      data: { ...dto, schoolId },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'CLASS_CREATED',
      targetType: 'CLASS_SECTION',
      targetId: section.id,
      afterValue: { name: section.name, academicYear: section.academicYear } as Record<string, unknown>,
    });

    return section;
  }

  async findAll(schoolId: string, academicYear?: string) {
    return this.prisma.classSection.findMany({
      where: { schoolId, ...(academicYear ? { academicYear } : {}) },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        _count: {
          select: {
            enrollments: { where: { status: 'ACTIVE' } },
          },
        },
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string, schoolId: string) {
    const section = await this.prisma.classSection.findFirst({
      where: { id, schoolId },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, email: true } },
        enrollments: {
          where: { status: 'ACTIVE' },
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                admissionNumber: true,
                gender: true,
              },
            },
          },
          orderBy: { student: { lastName: 'asc' } },
        },
        _count: { select: { enrollments: true } },
      },
    });
    if (!section) throw new NotFoundException('Class section not found');
    return section;
  }

  async update(
    id: string,
    schoolId: string,
    dto: UpdateClassSectionDto,
    actorId: string,
    actorEmail: string,
  ) {
    const existing = await this.findOne(id, schoolId);

    if (dto.teacherId) {
      const teacher = await this.prisma.user.findFirst({
        where: { id: dto.teacherId, schoolId },
      });
      if (!teacher) throw new NotFoundException('Teacher not found');
    }

    const updated = await this.prisma.classSection.update({
      where: { id },
      data: dto,
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'CLASS_UPDATED',
      targetType: 'CLASS_SECTION',
      targetId: id,
      beforeValue: { name: existing.name, teacherId: existing.teacherId } as Record<string, unknown>,
      afterValue: dto as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async deactivate(id: string, schoolId: string, actorId: string, actorEmail: string) {
    await this.findOne(id, schoolId);
    const updated = await this.prisma.classSection.update({
      where: { id },
      data: { isActive: false },
    });
    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'CLASS_DEACTIVATED',
      targetType: 'CLASS_SECTION',
      targetId: id,
    });
    return updated;
  }
}
