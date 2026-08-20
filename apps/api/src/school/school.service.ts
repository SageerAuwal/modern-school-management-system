import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { SetupSchoolDto } from './dto/setup-school.dto';

@Injectable()
export class SchoolService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getProfile(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    if (!school) throw new NotFoundException('School not found');
    return school;
  }

  async setup(dto: SetupSchoolDto, actorId: string, actorEmail: string) {
    // Single-tenant: there's only ever one school record
    const existing = await this.prisma.school.findFirst();

    let school;
    if (existing) {
      const before = { ...existing };
      school = await this.prisma.school.update({
        where: { id: existing.id },
        data: dto,
      });
      await this.auditService.log({
        actorId,
        actorEmail,
        action: 'SCHOOL_PROFILE_UPDATED',
        targetType: 'SCHOOL',
        targetId: school.id,
        beforeValue: before as Record<string, unknown>,
        afterValue: dto as unknown as Record<string, unknown>,
      });
    } else {
      school = await this.prisma.school.create({ data: dto });
      await this.auditService.log({
        actorId,
        actorEmail,
        action: 'SCHOOL_PROFILE_CREATED',
        targetType: 'SCHOOL',
        targetId: school.id,
        afterValue: dto as unknown as Record<string, unknown>,
      });
    }

    return school;
  }
}
