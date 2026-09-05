import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { BulkEnterScoresDto, ReportCardQueryDto } from './dto/score.dto';
import { EnrollmentStatus } from '@prisma/client';

// Nigerian standard grading scale (out of 100)
function computeGrade(total: number): { grade: string; remark: string } {
  if (total >= 70) return { grade: 'A', remark: 'Excellent' };
  if (total >= 60) return { grade: 'B', remark: 'Very Good' };
  if (total >= 50) return { grade: 'C', remark: 'Good' };
  if (total >= 45) return { grade: 'D', remark: 'Average' };
  if (total >= 40) return { grade: 'E', remark: 'Below Average' };
  return { grade: 'F', remark: 'Fail' };
}

@Injectable()
export class ScoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ── Bulk Enter / Update Scores for a Subject ──────────────────────────────

  async bulkEnter(
    dto: BulkEnterScoresDto,
    schoolId: string,
    actorId: string,
    actorEmail: string,
  ) {
    // Validate class, subject, and term belong to this school
    const [section, subject, term] = await Promise.all([
      this.prisma.classSection.findFirst({ where: { id: dto.classSectionId, schoolId } }),
      this.prisma.subject.findFirst({ where: { id: dto.subjectId, schoolId } }),
      this.prisma.term.findFirst({ where: { id: dto.termId, schoolId } }),
    ]);
    if (!section) throw new NotFoundException('Class section not found');
    if (!subject) throw new NotFoundException('Subject not found');
    if (!term) throw new NotFoundException('Term not found');

    // Verify all students are enrolled
    const enrolled = await this.prisma.enrollment.findMany({
      where: { classSectionId: dto.classSectionId, status: EnrollmentStatus.ACTIVE },
      select: { studentId: true },
    });
    const enrolledIds = new Set(enrolled.map((e) => e.studentId));

    const invalid = dto.entries.filter((e) => !enrolledIds.has(e.studentId)).map((e) => e.studentId);
    if (invalid.length > 0) {
      throw new BadRequestException(`Students not enrolled in this class: ${invalid.join(', ')}`);
    }

    // Upsert each score entry with computed grade
    const results = await Promise.all(
      dto.entries.map((entry) => {
        const total =
          (entry.ca1 ?? 0) + (entry.ca2 ?? 0) + (entry.ca3 ?? 0) + (entry.exam ?? 0);
        const { grade, remark } = total > 0 ? computeGrade(total) : { grade: null, remark: null };

        return this.prisma.score.upsert({
          where: {
            studentId_subjectId_classSectionId_termId: {
              studentId: entry.studentId,
              subjectId: dto.subjectId,
              classSectionId: dto.classSectionId,
              termId: dto.termId,
            },
          },
          create: {
            schoolId,
            studentId: entry.studentId,
            subjectId: dto.subjectId,
            classSectionId: dto.classSectionId,
            termId: dto.termId,
            academicYear: dto.academicYear,
            ca1: entry.ca1,
            ca2: entry.ca2,
            ca3: entry.ca3,
            exam: entry.exam,
            total: total || null,
            grade: grade ?? undefined,
            remark: remark ?? undefined,
            enteredById: actorId,
          },
          update: {
            ca1: entry.ca1,
            ca2: entry.ca2,
            ca3: entry.ca3,
            exam: entry.exam,
            total: total || null,
            grade: grade ?? undefined,
            remark: remark ?? undefined,
            editedById: actorId,
          },
        });
      }),
    );

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'SCORES_ENTERED',
      targetType: 'SCORE',
      targetId: dto.classSectionId,
      afterValue: {
        subjectId: dto.subjectId,
        termId: dto.termId,
        count: results.length,
      } as Record<string, unknown>,
    });

    return { entered: results.length, subjectId: dto.subjectId, termId: dto.termId };
  }

  // ── Class Score Sheet for a Subject ──────────────────────────────────────
  // Shows every enrolled student's score for one subject in one term.

  async getClassScoreSheet(
    classSectionId: string,
    subjectId: string,
    termId: string,
    schoolId: string,
  ) {
    const [section, subject, term] = await Promise.all([
      this.prisma.classSection.findFirst({ where: { id: classSectionId, schoolId } }),
      this.prisma.subject.findFirst({ where: { id: subjectId, schoolId } }),
      this.prisma.term.findFirst({ where: { id: termId, schoolId } }),
    ]);
    if (!section) throw new NotFoundException('Class section not found');
    if (!subject) throw new NotFoundException('Subject not found');
    if (!term) throw new NotFoundException('Term not found');

    // Get all enrolled students
    const enrollments = await this.prisma.enrollment.findMany({
      where: { classSectionId, status: EnrollmentStatus.ACTIVE },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
      },
      orderBy: { student: { lastName: 'asc' } },
    });

    const scores = await this.prisma.score.findMany({
      where: { classSectionId, subjectId, termId },
    });
    const scoreMap = new Map(scores.map((s) => [s.studentId, s]));

    const sheet = enrollments.map((e) => ({
      student: e.student,
      score: scoreMap.get(e.student.id) ?? null,
    }));

    return {
      classSection: { id: section.id, name: section.name },
      subject: { id: subject.id, name: subject.name, code: subject.code },
      term: { id: term.id, name: term.name, academicYear: term.academicYear },
      sheet,
    };
  }

  // ── Student Report Card ───────────────────────────────────────────────────
  // All subjects for a student in a term, with position in class.

  async getReportCard(studentId: string, query: ReportCardQueryDto, schoolId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true, firstName: true, lastName: true, admissionNumber: true, gender: true },
    });
    if (!student) throw new NotFoundException('Student not found');

    const term = await this.prisma.term.findFirst({ where: { id: query.termId, schoolId } });
    if (!term) throw new NotFoundException('Term not found');

    const section = await this.prisma.classSection.findFirst({
      where: { id: query.classSectionId, schoolId },
    });
    if (!section) throw new NotFoundException('Class section not found');

    // Fetch this student's scores
    const scores = await this.prisma.score.findMany({
      where: { studentId, termId: query.termId, classSectionId: query.classSectionId },
      include: { subject: { select: { id: true, name: true, code: true } } },
      orderBy: { subject: { name: 'asc' } },
    });

    // Compute overall stats
    const scoredSubjects = scores.filter((s) => s.total !== null);
    const overallTotal = scoredSubjects.reduce((sum, s) => sum + (s.total ?? 0), 0);
    const overallAverage = scoredSubjects.length > 0
      ? Math.round((overallTotal / (scoredSubjects.length * 100)) * 100)
      : null;

    // Compute class position using overall average across all students in the class
    const allStudentScores = await this.prisma.score.groupBy({
      by: ['studentId'],
      where: { termId: query.termId, classSectionId: query.classSectionId },
      _avg: { total: true },
      orderBy: { _avg: { total: 'desc' } },
    });

    const positionIndex = allStudentScores.findIndex((s) => s.studentId === studentId);
    const position = positionIndex >= 0 ? positionIndex + 1 : null;
    const totalStudents = allStudentScores.length;

    return {
      student,
      term: { id: term.id, name: term.name, academicYear: term.academicYear },
      classSection: { id: section.id, name: section.name, level: section.level },
      scores,
      summary: {
        subjectsOffered: scores.length,
        subjectsScored: scoredSubjects.length,
        overallTotal: Math.round(overallTotal),
        overallAverage,
        position,
        totalStudentsInClass: totalStudents,
      },
    };
  }

  // ── Class Results Table ───────────────────────────────────────────────────
  // Ranked list of all students with their averages for a term.

  async getClassResults(classSectionId: string, termId: string, schoolId: string) {
    const [section, term] = await Promise.all([
      this.prisma.classSection.findFirst({ where: { id: classSectionId, schoolId } }),
      this.prisma.term.findFirst({ where: { id: termId, schoolId } }),
    ]);
    if (!section) throw new NotFoundException('Class section not found');
    if (!term) throw new NotFoundException('Term not found');

    // Get ranked averages
    const ranked = await this.prisma.score.groupBy({
      by: ['studentId'],
      where: { classSectionId, termId },
      _avg: { total: true },
      _count: { subjectId: true },
      orderBy: { _avg: { total: 'desc' } },
    });

    // Fetch student details
    const studentIds = ranked.map((r) => r.studentId);
    const students = await this.prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, firstName: true, lastName: true, admissionNumber: true },
    });
    const studentMap = new Map(students.map((s) => [s.id, s]));

    const results = ranked.map((r, index) => ({
      position: index + 1,
      student: studentMap.get(r.studentId),
      average: r._avg.total ? Math.round(r._avg.total * 10) / 10 : null,
      subjectsScored: r._count.subjectId,
      ...computeGrade(r._avg.total ?? 0),
    }));

    return {
      classSection: { id: section.id, name: section.name, level: section.level },
      term: { id: term.id, name: term.name, academicYear: term.academicYear },
      totalStudents: results.length,
      results,
    };
  }
}
