import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { CreateFeeStructureDto } from './dto/fee-structure.dto';

@Injectable()
export class FeeStructuresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateFeeStructureDto, schoolId: string, actorId: string, actorEmail: string) {
    const fee = await this.prisma.feeStructure.create({
      data: { ...dto, schoolId },
      include: { term: { select: { id: true, name: true } } },
    });
    await this.auditService.log({ actorId, actorEmail, action: 'FEE_STRUCTURE_CREATED', targetType: 'FEE_STRUCTURE', targetId: fee.id, afterValue: dto as unknown as Record<string, unknown> });
    return fee;
  }

  async findAll(schoolId: string, academicYear?: string) {
    return this.prisma.feeStructure.findMany({
      where: { schoolId, isActive: true, ...(academicYear ? { academicYear } : {}) },
      include: { term: { select: { id: true, name: true } } },
      orderBy: [{ academicYear: 'desc' }, { level: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string, schoolId: string) {
    const f = await this.prisma.feeStructure.findFirst({ where: { id, schoolId } });
    if (!f) throw new NotFoundException('Fee structure not found');
    return f;
  }

  async update(id: string, schoolId: string, dto: Partial<CreateFeeStructureDto>, actorId: string, actorEmail: string) {
    await this.findOne(id, schoolId);
    const updated = await this.prisma.feeStructure.update({ where: { id }, data: dto });
    await this.auditService.log({ actorId, actorEmail, action: 'FEE_STRUCTURE_UPDATED', targetType: 'FEE_STRUCTURE', targetId: id, afterValue: dto as unknown as Record<string, unknown> });
    return updated;
  }

  async deactivate(id: string, schoolId: string, actorId: string, actorEmail: string) {
    await this.findOne(id, schoolId);
    const updated = await this.prisma.feeStructure.update({ where: { id }, data: { isActive: false } });
    await this.auditService.log({ actorId, actorEmail, action: 'FEE_STRUCTURE_DEACTIVATED', targetType: 'FEE_STRUCTURE', targetId: id });
    return updated;
  }
}
