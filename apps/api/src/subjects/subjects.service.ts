import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { CreateSubjectDto } from './dto/subject.dto';

@Injectable()
export class SubjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateSubjectDto, schoolId: string, actorId: string, actorEmail: string) {
    const existing = await this.prisma.subject.findUnique({
      where: { schoolId_name: { schoolId, name: dto.name } },
    });
    if (existing) throw new ConflictException(`Subject "${dto.name}" already exists`);

    const subject = await this.prisma.subject.create({ data: { ...dto, schoolId } });
    await this.auditService.log({ actorId, actorEmail, action: 'SUBJECT_CREATED', targetType: 'SUBJECT', targetId: subject.id, afterValue: dto as unknown as Record<string, unknown> });
    return subject;
  }

  async findAll(schoolId: string) {
    return this.prisma.subject.findMany({
      where: { schoolId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, schoolId: string) {
    const s = await this.prisma.subject.findFirst({ where: { id, schoolId } });
    if (!s) throw new NotFoundException('Subject not found');
    return s;
  }

  async update(id: string, schoolId: string, dto: Partial<CreateSubjectDto>, actorId: string, actorEmail: string) {
    await this.findOne(id, schoolId);
    const updated = await this.prisma.subject.update({ where: { id }, data: dto });
    await this.auditService.log({ actorId, actorEmail, action: 'SUBJECT_UPDATED', targetType: 'SUBJECT', targetId: id, afterValue: dto as unknown as Record<string, unknown> });
    return updated;
  }

  async deactivate(id: string, schoolId: string, actorId: string, actorEmail: string) {
    await this.findOne(id, schoolId);
    const updated = await this.prisma.subject.update({ where: { id }, data: { isActive: false } });
    await this.auditService.log({ actorId, actorEmail, action: 'SUBJECT_DEACTIVATED', targetType: 'SUBJECT', targetId: id });
    return updated;
  }

  // ── Class-Subject assignments ─────────────────────────────────────────────

  async assignToClass(classSectionId: string, subjectId: string, teacherId: string | undefined, schoolId: string) {
    // Verify both belong to this school
    const [section, subject] = await Promise.all([
      this.prisma.classSection.findFirst({ where: { id: classSectionId, schoolId } }),
      this.prisma.subject.findFirst({ where: { id: subjectId, schoolId } }),
    ]);
    if (!section) throw new NotFoundException('Class section not found');
    if (!subject) throw new NotFoundException('Subject not found');

    return this.prisma.classSubject.upsert({
      where: { classSectionId_subjectId: { classSectionId, subjectId } },
      create: { classSectionId, subjectId, teacherId },
      update: { teacherId },
      include: { subject: true, teacher: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async getClassSubjects(classSectionId: string, schoolId: string) {
    const section = await this.prisma.classSection.findFirst({ where: { id: classSectionId, schoolId } });
    if (!section) throw new NotFoundException('Class section not found');

    return this.prisma.classSubject.findMany({
      where: { classSectionId },
      include: {
        subject: true,
        teacher: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { subject: { name: 'asc' } },
    });
  }

  async removeFromClass(classSectionId: string, subjectId: string, schoolId: string) {
    const section = await this.prisma.classSection.findFirst({ where: { id: classSectionId, schoolId } });
    if (!section) throw new NotFoundException('Class section not found');
    return this.prisma.classSubject.delete({
      where: { classSectionId_subjectId: { classSectionId, subjectId } },
    });
  }
}
