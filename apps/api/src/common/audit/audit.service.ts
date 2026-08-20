import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditEntry {
  actorId?: string;
  actorEmail?: string;
  action: string;
  targetType: string;
  targetId?: string;
  beforeValue?: Record<string, unknown>;
  afterValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * AuditService — writes to the AUDIT_LOG table for every sensitive action.
 * Required by PRD section 4.1.
 * Called by every module for: grade edits, attendance changes,
 * role changes, payment entries, and sensitive data access.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: entry.actorId,
        actorEmail: entry.actorEmail,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        beforeValue: entry.beforeValue as object,
        afterValue: entry.afterValue as object,
        metadata: entry.metadata as object,
      },
    });
  }
}
