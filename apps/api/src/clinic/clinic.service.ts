import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import {
  CreateClinicVisitDto,
  UpdateClinicVisitDto,
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  UpdateStudentHealthDto,
  CreateImmunizationDto,
} from './dto/clinic.dto';
import { VisitDisposition } from '@prisma/client';

@Injectable()
export class ClinicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ── Clinic Visits & Triage ──────────────────────────────────────────────

  async recordVisit(
    dto: CreateClinicVisitDto,
    schoolId: string,
    nurseId?: string,
    actorEmail?: string,
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, schoolId },
    });
    if (!student) {
      throw new NotFoundException('Student record not found in this school');
    }

    const visit = await this.prisma.clinicVisit.create({
      data: {
        schoolId,
        studentId: dto.studentId,
        nurseId: nurseId || null,
        complaint: dto.complaint,
        symptoms: dto.symptoms || null,
        temperature: dto.temperature != null ? Number(dto.temperature) : null,
        bloodPressure: dto.bloodPressure || null,
        pulseRate: dto.pulseRate != null ? Number(dto.pulseRate) : null,
        weight: dto.weight != null ? Number(dto.weight) : null,
        diagnosis: dto.diagnosis || null,
        treatmentGiven: dto.treatmentGiven || null,
        disposition: dto.disposition || VisitDisposition.RETURNED_TO_CLASS,
        parentNotified: Boolean(dto.parentNotified),
        parentNotificationTime: dto.parentNotified ? new Date() : null,
        referralHospital: dto.referralHospital || null,
        referralReason: dto.referralReason || null,
        doctorNotes: dto.doctorNotes || null,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
            bloodGroup: true,
            genotype: true,
            guardianName: true,
            guardianPhone: true,
          },
        },
        nurse: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Process medication dispensations if provided
    if (dto.dispensedItems && dto.dispensedItems.length > 0) {
      for (const item of dto.dispensedItems) {
        const inventoryItem = await this.prisma.clinicInventory.findFirst({
          where: { id: item.inventoryId, schoolId },
        });
        if (inventoryItem) {
          const qty = Number(item.quantity) || 1;
          await this.prisma.medicationDispense.create({
            data: {
              schoolId,
              visitId: visit.id,
              studentId: dto.studentId,
              inventoryId: item.inventoryId,
              nurseId: nurseId || null,
              quantity: qty,
              dosage: item.dosage || null,
            },
          });

          // Deduct inventory stock
          const newQty = Math.max(0, inventoryItem.quantityOnHand - qty);
          await this.prisma.clinicInventory.update({
            where: { id: inventoryItem.id },
            data: { quantityOnHand: newQty },
          });
        }
      }
    }

    if (actorEmail) {
      await this.auditService.log({
        actorId: nurseId,
        actorEmail,
        action: 'CLINIC_VISIT_LOGGED',
        targetType: 'CLINIC_VISIT',
        targetId: visit.id,
        afterValue: {
          studentName: `${student.firstName} ${student.lastName}`,
          complaint: dto.complaint,
          disposition: visit.disposition,
        },
      });
    }

    return this.getVisitById(visit.id, schoolId);
  }

  async getVisits(
    schoolId: string,
    options?: { studentId?: string; disposition?: string; date?: string },
  ) {
    const where: Record<string, unknown> = { schoolId };

    if (options?.studentId) {
      where.studentId = options.studentId;
    }

    if (options?.disposition && Object.values(VisitDisposition).includes(options.disposition as VisitDisposition)) {
      where.disposition = options.disposition as VisitDisposition;
    }

    if (options?.date) {
      const dayStart = new Date(options.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(options.date);
      dayEnd.setHours(23, 59, 59, 999);
      where.visitDate = { gte: dayStart, lte: dayEnd };
    }

    return this.prisma.clinicVisit.findMany({
      where,
      orderBy: { visitDate: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
            bloodGroup: true,
            genotype: true,
            allergies: true,
            chronicConditions: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
            guardianName: true,
            guardianPhone: true,
          },
        },
        nurse: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        dispenses: {
          include: {
            inventory: {
              select: {
                id: true,
                name: true,
                itemCode: true,
                unit: true,
              },
            },
          },
        },
      },
    });
  }

  async getVisitById(id: string, schoolId: string) {
    const visit = await this.prisma.clinicVisit.findFirst({
      where: { id, schoolId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
            dateOfBirth: true,
            gender: true,
            bloodGroup: true,
            genotype: true,
            allergies: true,
            chronicConditions: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
            guardianName: true,
            guardianPhone: true,
          },
        },
        nurse: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        dispenses: {
          include: {
            inventory: true,
          },
        },
      },
    });
    if (!visit) {
      throw new NotFoundException('Clinic visit record not found');
    }
    return visit;
  }

  async updateVisit(
    id: string,
    dto: UpdateClinicVisitDto,
    schoolId: string,
    actorEmail?: string,
  ) {
    const existing = await this.prisma.clinicVisit.findFirst({
      where: { id, schoolId },
    });
    if (!existing) {
      throw new NotFoundException('Clinic visit record not found');
    }

    const updated = await this.prisma.clinicVisit.update({
      where: { id },
      data: {
        ...(dto.complaint && { complaint: dto.complaint }),
        ...(dto.symptoms !== undefined && { symptoms: dto.symptoms }),
        ...(dto.temperature !== undefined && { temperature: dto.temperature != null ? Number(dto.temperature) : null }),
        ...(dto.bloodPressure !== undefined && { bloodPressure: dto.bloodPressure }),
        ...(dto.pulseRate !== undefined && { pulseRate: dto.pulseRate != null ? Number(dto.pulseRate) : null }),
        ...(dto.weight !== undefined && { weight: dto.weight != null ? Number(dto.weight) : null }),
        ...(dto.diagnosis !== undefined && { diagnosis: dto.diagnosis }),
        ...(dto.treatmentGiven !== undefined && { treatmentGiven: dto.treatmentGiven }),
        ...(dto.disposition && { disposition: dto.disposition }),
        ...(dto.parentNotified !== undefined && {
          parentNotified: Boolean(dto.parentNotified),
          parentNotificationTime: dto.parentNotified ? new Date() : existing.parentNotificationTime,
        }),
        ...(dto.referralHospital !== undefined && { referralHospital: dto.referralHospital }),
        ...(dto.referralReason !== undefined && { referralReason: dto.referralReason }),
        ...(dto.doctorNotes !== undefined && { doctorNotes: dto.doctorNotes }),
      },
    });

    if (actorEmail) {
      await this.auditService.log({
        actorEmail,
        action: 'CLINIC_VISIT_UPDATED',
        targetType: 'CLINIC_VISIT',
        targetId: id,
        afterValue: { disposition: updated.disposition },
      });
    }

    return this.getVisitById(id, schoolId);
  }

  // ── Dispensary Inventory ────────────────────────────────────────────────

  async getInventory(schoolId: string, search?: string) {
    const where: Record<string, unknown> = { schoolId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { itemCode: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }
    const items = await this.prisma.clinicInventory.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return items.map((item) => ({
      ...item,
      isLowStock: item.quantityOnHand <= item.reorderLevel,
      isExpired: item.expiryDate ? new Date(item.expiryDate) < new Date() : false,
    }));
  }

  async addInventoryItem(
    dto: CreateInventoryItemDto,
    schoolId: string,
    actorId?: string,
    actorEmail?: string,
  ) {
    const existing = await this.prisma.clinicInventory.findFirst({
      where: { itemCode: dto.itemCode, schoolId },
    });
    if (existing) {
      throw new ConflictException(`Item with code ${dto.itemCode} already exists in dispensary`);
    }

    const item = await this.prisma.clinicInventory.create({
      data: {
        schoolId,
        itemCode: dto.itemCode,
        name: dto.name,
        category: dto.category || 'MEDICATION',
        dosageForm: dto.dosageForm || null,
        unit: dto.unit || 'Tablets',
        quantityOnHand: Number(dto.quantityOnHand) || 0,
        reorderLevel: dto.reorderLevel != null ? Number(dto.reorderLevel) : 10,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        batchNumber: dto.batchNumber || null,
        locationRack: dto.locationRack || null,
        notes: dto.notes || null,
      },
    });

    if (actorEmail) {
      await this.auditService.log({
        actorId,
        actorEmail,
        action: 'CLINIC_INVENTORY_ADDED',
        targetType: 'CLINIC_INVENTORY',
        targetId: item.id,
        afterValue: { itemCode: item.itemCode, name: item.name, quantityOnHand: item.quantityOnHand },
      });
    }

    return item;
  }

  async updateInventoryItem(
    id: string,
    dto: UpdateInventoryItemDto,
    schoolId: string,
    actorEmail?: string,
  ) {
    const existing = await this.prisma.clinicInventory.findFirst({
      where: { id, schoolId },
    });
    if (!existing) {
      throw new NotFoundException('Inventory item not found');
    }

    const updated = await this.prisma.clinicInventory.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.category && { category: dto.category }),
        ...(dto.dosageForm !== undefined && { dosageForm: dto.dosageForm }),
        ...(dto.unit && { unit: dto.unit }),
        ...(dto.quantityOnHand !== undefined && { quantityOnHand: Number(dto.quantityOnHand) }),
        ...(dto.reorderLevel !== undefined && { reorderLevel: Number(dto.reorderLevel) }),
        ...(dto.expiryDate !== undefined && { expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null }),
        ...(dto.batchNumber !== undefined && { batchNumber: dto.batchNumber }),
        ...(dto.locationRack !== undefined && { locationRack: dto.locationRack }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });

    if (actorEmail) {
      await this.auditService.log({
        actorEmail,
        action: 'CLINIC_INVENTORY_UPDATED',
        targetType: 'CLINIC_INVENTORY',
        targetId: id,
        afterValue: { name: updated.name, quantityOnHand: updated.quantityOnHand },
      });
    }

    return updated;
  }

  // ── Student Health Registry ─────────────────────────────────────────────

  async updateStudentHealth(
    studentId: string,
    dto: UpdateStudentHealthDto,
    schoolId: string,
    actorEmail?: string,
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
    });
    if (!student) {
      throw new NotFoundException('Student record not found');
    }

    const updated = await this.prisma.student.update({
      where: { id: studentId },
      data: {
        ...(dto.bloodGroup !== undefined && { bloodGroup: dto.bloodGroup }),
        ...(dto.genotype !== undefined && { genotype: dto.genotype }),
        ...(dto.allergies !== undefined && { allergies: dto.allergies }),
        ...(dto.chronicConditions !== undefined && { chronicConditions: dto.chronicConditions }),
        ...(dto.emergencyContactName !== undefined && { emergencyContactName: dto.emergencyContactName }),
        ...(dto.emergencyContactPhone !== undefined && { emergencyContactPhone: dto.emergencyContactPhone }),
        ...(dto.medicalNotes !== undefined && { medicalNotes: dto.medicalNotes }),
      },
    });

    if (actorEmail) {
      await this.auditService.log({
        actorEmail,
        action: 'STUDENT_HEALTH_UPDATED',
        targetType: 'STUDENT',
        targetId: studentId,
        afterValue: {
          bloodGroup: updated.bloodGroup,
          genotype: updated.genotype,
          allergies: updated.allergies,
        },
      });
    }

    return updated;
  }

  async getStudentHealthRegistry(schoolId: string, search?: string) {
    const where: Record<string, unknown> = { schoolId, enrollmentStatus: 'ACTIVE' };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { admissionNumber: { contains: search, mode: 'insensitive' } },
        { genotype: { contains: search, mode: 'insensitive' } },
        { bloodGroup: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.student.findMany({
      where,
      orderBy: { lastName: 'asc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        admissionNumber: true,
        bloodGroup: true,
        genotype: true,
        allergies: true,
        chronicConditions: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        medicalNotes: true,
        enrollments: {
          where: { status: 'ACTIVE' },
          select: {
            classSection: {
              select: {
                id: true,
                name: true,
                level: true,
              },
            },
          },
        },
        clinicVisits: {
          take: 1,
          orderBy: { visitDate: 'desc' },
          select: {
            visitDate: true,
            complaint: true,
            disposition: true,
          },
        },
      },
    });
  }

  // ── Routine Immunizations ───────────────────────────────────────────────

  async recordImmunization(
    dto: CreateImmunizationDto,
    schoolId: string,
    actorEmail?: string,
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, schoolId },
    });
    if (!student) {
      throw new NotFoundException('Student record not found');
    }

    const record = await this.prisma.immunizationRecord.create({
      data: {
        schoolId,
        studentId: dto.studentId,
        vaccineName: dto.vaccineName,
        doseNumber: Number(dto.doseNumber) || 1,
        administeredAt: new Date(dto.administeredAt),
        nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : null,
        provider: dto.provider || null,
        batchNumber: dto.batchNumber || null,
        notes: dto.notes || null,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
      },
    });

    if (actorEmail) {
      await this.auditService.log({
        actorEmail,
        action: 'IMMUNIZATION_RECORDED',
        targetType: 'IMMUNIZATION',
        targetId: record.id,
        afterValue: { vaccineName: record.vaccineName, studentId: dto.studentId },
      });
    }

    return record;
  }

  async getImmunizations(schoolId: string, studentId?: string) {
    const where: Record<string, unknown> = { schoolId };
    if (studentId) {
      where.studentId = studentId;
    }

    return this.prisma.immunizationRecord.findMany({
      where,
      orderBy: { administeredAt: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
      },
    });
  }

  // ── Executive Clinic Statistics ─────────────────────────────────────────

  async getStats(schoolId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayVisits, activeResting, totalVisits, inventoryItems] = await Promise.all([
      this.prisma.clinicVisit.count({
        where: { schoolId, visitDate: { gte: todayStart } },
      }),
      this.prisma.clinicVisit.count({
        where: { schoolId, disposition: VisitDisposition.RESTING_IN_BAY },
      }),
      this.prisma.clinicVisit.count({
        where: { schoolId },
      }),
      this.prisma.clinicInventory.findMany({
        where: { schoolId },
        select: { quantityOnHand: true, reorderLevel: true, expiryDate: true },
      }),
    ]);

    const lowStockCount = inventoryItems.filter(
      (item) => item.quantityOnHand <= item.reorderLevel,
    ).length;

    const expiredCount = inventoryItems.filter(
      (item) => item.expiryDate && new Date(item.expiryDate) < new Date(),
    ).length;

    return {
      todayVisits,
      activeResting,
      totalVisits,
      lowStockCount,
      expiredCount,
      totalInventoryItems: inventoryItems.length,
    };
  }
}
