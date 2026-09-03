import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { CreateStaffRecordDto } from './dto/create-staff.dto';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateStaffRecordDto, schoolId: string, actorId: string, actorEmail: string) {
    const record = await this.prisma.staffRecord.create({
      data: {
        ...dto,
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
      afterValue: { firstName: record.firstName, lastName: record.lastName, role: record.role } as Record<string, unknown>,
    });
    return record;
  }

  async findAll(schoolId: string, activeOnly = true) {
    return this.prisma.staffRecord.findMany({
      where: { schoolId, ...(activeOnly ? { isActive: true } : {}) },
      orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
    });
  }

  async findOne(id: string, schoolId: string) {
    const record = await this.prisma.staffRecord.findFirst({ where: { id, schoolId } });
    if (!record) throw new NotFoundException('Staff record not found');
    return record;
  }

  async update(id: string, schoolId: string, dto: Partial<CreateStaffRecordDto>, actorId: string, actorEmail: string) {
    const existing = await this.findOne(id, schoolId);
    const updated = await this.prisma.staffRecord.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
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
    await this.findOne(id, schoolId);
    const updated = await this.prisma.staffRecord.update({
      where: { id },
      data: { isActive: false, endDate: new Date() },
    });
    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'STAFF_RECORD_DEACTIVATED',
      targetType: 'STAFF_RECORD',
      targetId: id,
    });
    return updated;
  }
}
