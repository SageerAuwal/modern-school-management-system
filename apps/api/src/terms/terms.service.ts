import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { CreateTermDto } from './dto/term.dto';

@Injectable()
export class TermsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateTermDto, schoolId: string, actorId: string, actorEmail: string) {
    const existing = await this.prisma.term.findUnique({
      where: { schoolId_name_academicYear: { schoolId, name: dto.name, academicYear: dto.academicYear } },
    });
    if (existing) throw new ConflictException(`"${dto.name}" for ${dto.academicYear} already exists`);

    // If marking as current, unset previous current term
    if (dto.isCurrent) {
      await this.prisma.term.updateMany({ where: { schoolId, isCurrent: true }, data: { isCurrent: false } });
    }

    const term = await this.prisma.term.create({
      data: { ...dto, schoolId, startDate: new Date(dto.startDate), endDate: new Date(dto.endDate) },
    });
    await this.auditService.log({ actorId, actorEmail, action: 'TERM_CREATED', targetType: 'TERM', targetId: term.id, afterValue: { name: dto.name, academicYear: dto.academicYear } as Record<string, unknown> });
    return term;
  }

  async findAll(schoolId: string) {
    return this.prisma.term.findMany({
      where: { schoolId },
      orderBy: [{ academicYear: 'desc' }, { startDate: 'asc' }],
    });
  }

  async findOne(id: string, schoolId: string) {
    const t = await this.prisma.term.findFirst({ where: { id, schoolId } });
    if (!t) throw new NotFoundException('Term not found');
    return t;
  }

  async getCurrent(schoolId: string) {
    const t = await this.prisma.term.findFirst({ where: { schoolId, isCurrent: true } });
    if (!t) throw new NotFoundException('No current term set');
    return t;
  }

  /** Mark a term as current — unsets all others */
  async setCurrent(id: string, schoolId: string, actorId: string, actorEmail: string) {
    await this.findOne(id, schoolId);
    await this.prisma.term.updateMany({ where: { schoolId, isCurrent: true }, data: { isCurrent: false } });
    const updated = await this.prisma.term.update({ where: { id }, data: { isCurrent: true } });
    await this.auditService.log({ actorId, actorEmail, action: 'TERM_SET_CURRENT', targetType: 'TERM', targetId: id });
    return updated;
  }
}
