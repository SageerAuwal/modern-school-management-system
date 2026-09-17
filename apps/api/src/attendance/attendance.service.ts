import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import {
  BulkMarkAttendanceDto,
  EditAttendanceDto,
  AttendanceQueryDto,
} from './dto/attendance.dto';
import { AttendanceStatus, EnrollmentStatus } from '@prisma/client';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ── Bulk Mark ─────────────────────────────────────────────────────────────
  // Marks attendance for an entire class in one request.
  // Uses upsert so re-submitting the same day overwrites (teacher corrects mistakes).

  async bulkMark(
    dto: BulkMarkAttendanceDto,
    schoolId: string,
    actorId: string,
    actorEmail: string,
  ) {
    // Verify class exists in this school
    const section = await this.prisma.classSection.findFirst({
      where: { id: dto.classSectionId, schoolId },
    });
    if (!section) throw new NotFoundException('Class section not found');

    const date = new Date(dto.date);
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }

    // Verify all studentIds are actually enrolled in this class
    const enrolled = await this.prisma.enrollment.findMany({
      where: {
        classSectionId: dto.classSectionId,
        status: EnrollmentStatus.ACTIVE,
      },
      select: { studentId: true },
    });
    const enrolledIds = new Set(enrolled.map((e) => e.studentId));

    const rawEntries = dto.records ?? dto.entries ?? [];
    const invalidIds = rawEntries
      .filter((e) => !enrolledIds.has(e.studentId))
      .map((e) => e.studentId);
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `These students are not enrolled in this class: ${invalidIds.join(', ')}`,
      );
    }

    // Upsert each record (create or update for same student+class+date)
    const results = await Promise.all(
      rawEntries.map((entry) =>
        this.prisma.attendanceRecord.upsert({
          where: {
            studentId_classSectionId_date: {
              studentId: entry.studentId,
              classSectionId: dto.classSectionId,
              date,
            },
          },
          create: {
            schoolId,
            classSectionId: dto.classSectionId,
            studentId: entry.studentId,
            date,
            status: entry.status,
            note: entry.note,
            markedById: actorId,
          },
          update: {
            status: entry.status,
            note: entry.note,
            editedById: actorId,
          },
        }),
      ),
    );

    // Count by status for the response summary
    const summary = results.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'ATTENDANCE_MARKED',
      targetType: 'ATTENDANCE',
      targetId: dto.classSectionId,
      afterValue: {
        date: dto.date,
        classSectionId: dto.classSectionId,
        summary,
      } as Record<string, unknown>,
    });

    return { date: dto.date, marked: results.length, summary };
  }

  // ── Get Class Attendance for a Date ──────────────────────────────────────

  async getClassAttendance(
    classSectionId: string,
    date: string,
    schoolId: string,
  ) {
    const section = await this.prisma.classSection.findFirst({
      where: { id: classSectionId, schoolId },
    });
    if (!section) throw new NotFoundException('Class section not found');

    const parsedDate = new Date(date);

    // Fetch all active enrolled students
    const enrollments = await this.prisma.enrollment.findMany({
      where: { classSectionId, status: EnrollmentStatus.ACTIVE },
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
      orderBy: { student: { lastName: 'asc' } },
    });

    // Fetch attendance records for that date
    const records = await this.prisma.attendanceRecord.findMany({
      where: { classSectionId, date: parsedDate },
    });
    const recordMap = new Map(records.map((r) => [r.studentId, r]));

    const roster = enrollments.map((e) => {
      const record = recordMap.get(e.student.id);
      return {
        student: e.student,
        status: record?.status ?? null,  // null = not yet marked
        note: record?.note ?? null,
        recordId: record?.id ?? null,
      };
    });

    const markedCount = records.length;
    const presentCount = records.filter((r) => r.status === AttendanceStatus.PRESENT).length;
    const absentCount = records.filter((r) => r.status === AttendanceStatus.ABSENT).length;

    return {
      classSection: { id: section.id, name: section.name, level: section.level },
      date,
      totalStudents: enrollments.length,
      markedCount,
      summary: { present: presentCount, absent: absentCount, late: records.filter((r) => r.status === AttendanceStatus.LATE).length, excused: records.filter((r) => r.status === AttendanceStatus.EXCUSED).length },
      roster,
    };
  }

  // ── Edit Single Record (always audited) ───────────────────────────────────

  async editRecord(
    id: string,
    dto: EditAttendanceDto,
    schoolId: string,
    actorId: string,
    actorEmail: string,
  ) {
    const record = await this.prisma.attendanceRecord.findFirst({
      where: { id, schoolId },
    });
    if (!record) throw new NotFoundException('Attendance record not found');

    const before = { status: record.status, note: record.note };

    const updated = await this.prisma.attendanceRecord.update({
      where: { id },
      data: { status: dto.status, note: dto.note, editedById: actorId },
    });

    // Every edit is audited — PRD section 4.1
    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'ATTENDANCE_EDITED',
      targetType: 'ATTENDANCE',
      targetId: id,
      beforeValue: before as Record<string, unknown>,
      afterValue: { status: dto.status, note: dto.note } as Record<string, unknown>,
    });

    return updated;
  }

  // ── Student Attendance History ────────────────────────────────────────────

  async getStudentAttendance(
    studentId: string,
    schoolId: string,
    query: AttendanceQueryDto,
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true, firstName: true, lastName: true, admissionNumber: true },
    });
    if (!student) throw new NotFoundException('Student not found');

    const where: Record<string, unknown> = { studentId, schoolId };
    if (query.from || query.to) {
      where['date'] = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where,
      include: {
        classSection: { select: { id: true, name: true, level: true } },
      },
      orderBy: { date: 'desc' },
    });

    // Compute stats
    const total = records.length;
    const present = records.filter((r) => r.status === AttendanceStatus.PRESENT).length;
    const absent = records.filter((r) => r.status === AttendanceStatus.ABSENT).length;
    const late = records.filter((r) => r.status === AttendanceStatus.LATE).length;
    const excused = records.filter((r) => r.status === AttendanceStatus.EXCUSED).length;
    const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 100) : null;

    return {
      student,
      stats: { total, present, absent, late, excused, attendanceRate },
      records,
    };
  }

  // ── Class Attendance Stats (for a period) ────────────────────────────────

  async getClassStats(
    classSectionId: string,
    schoolId: string,
    query: AttendanceQueryDto,
  ) {
    const section = await this.prisma.classSection.findFirst({
      where: { id: classSectionId, schoolId },
    });
    if (!section) throw new NotFoundException('Class section not found');

    const where: Record<string, unknown> = { classSectionId, schoolId };
    if (query.from || query.to) {
      where['date'] = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    // Group by student to compute per-student stats
    const records = await this.prisma.attendanceRecord.findMany({
      where,
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, admissionNumber: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    // Aggregate per student
    const studentMap = new Map<
      string,
      { student: typeof records[0]['student']; present: number; absent: number; late: number; excused: number; total: number }
    >();

    for (const r of records) {
      const key = r.studentId;
      if (!studentMap.has(key)) {
        studentMap.set(key, { student: r.student, present: 0, absent: 0, late: 0, excused: 0, total: 0 });
      }
      const s = studentMap.get(key)!;
      s.total++;
      if (r.status === AttendanceStatus.PRESENT) s.present++;
      else if (r.status === AttendanceStatus.ABSENT) s.absent++;
      else if (r.status === AttendanceStatus.LATE) s.late++;
      else if (r.status === AttendanceStatus.EXCUSED) s.excused++;
    }

    const studentStats = Array.from(studentMap.values()).map((s) => ({
      ...s,
      attendanceRate: s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : null,
    }));

    return {
      classSection: { id: section.id, name: section.name, level: section.level },
      period: { from: query.from, to: query.to },
      studentStats,
    };
  }
}
