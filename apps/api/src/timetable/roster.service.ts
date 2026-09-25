import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, DutyCategory } from '@prisma/client';
import { GenerateDutyRosterDto, AssignDutyDto, CreateSubstitutionDto } from './dto/roster.dto';

@Injectable()
export class RosterService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Auto-generate a balanced, 14-week term faculty supervisory duty roster.
   * Rotates all active teachers across 6 major institutional duty categories:
   * Gate & Welcome, Morning Assembly, Campus Corridor, Dining Hall, Prep Supervision, Sports & Games.
   */
  async generateTermDutyRoster(dto: GenerateDutyRosterDto, schoolId: string) {
    const { academicYear, termId, weeksCount = 14, timetableId } = dto;

    const teachers = await this.prisma.user.findMany({
      where: { schoolId, role: UserRole.TEACHER, isActive: true },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    if (teachers.length === 0) {
      throw new BadRequestException('No active teachers found to assign duties. Add faculty members first.');
    }

    // Clear existing generated duties for this academic year & term
    await this.prisma.teacherDutyAssignment.deleteMany({
      where: {
        schoolId,
        academicYear,
        ...(termId ? { termId } : {}),
      },
    });

    const dutyTypes: {
      category: DutyCategory;
      venue: string;
      instructions: string;
    }[] = [
      {
        category: DutyCategory.GATE_DUTY,
        venue: 'Main School Gate & Security Post',
        instructions: 'Welcome students, register late arrivals, verify student ID cards, inspect uniform decorum.',
      },
      {
        category: DutyCategory.MORNING_ASSEMBLY,
        venue: 'Assembly Quadrangle / Multi-purpose Hall',
        instructions: 'Coordinate morning assembly, national anthem, pledge, uniform inspection, announcements.',
      },
      {
        category: DutyCategory.CAMPUS_CORRIDOR,
        venue: 'Academic Blocks, Hallways & Quadrangle',
        instructions: 'Ensure prompt movement between periods, maintain hallway silence during instructional hours.',
      },
      {
        category: DutyCategory.DINING_HALL,
        venue: 'Student Cafeteria & Dining Hall',
        instructions: 'Supervise breakfast/lunch distribution, maintain dining etiquette, ensure waste clearance.',
      },
      {
        category: DutyCategory.PREP_SUPERVISION,
        venue: 'Library & Afternoon Prep Halls',
        instructions: 'Supervise quiet study sessions, monitor student attendance, assist with academic references.',
      },
      {
        category: DutyCategory.SPORTS_GAMES,
        venue: 'Sports Arena, Football Pitch & Courts',
        instructions: 'Coordinate afternoon physical education, monitor student participation, enforce safety rules.',
      },
    ];

    const assignmentsToCreate: {
      schoolId: string;
      timetableId?: string;
      teacherId: string;
      category: DutyCategory;
      weekNumber: number;
      academicYear: string;
      termId?: string;
      venue: string;
      instructions: string;
    }[] = [];

    // Distribute across weeks with fair round-robin rotation
    let teacherOffset = 0;
    for (let w = 1; w <= weeksCount; w++) {
      for (let dIdx = 0; dIdx < dutyTypes.length; dIdx++) {
        const teacher = teachers[(teacherOffset + dIdx) % teachers.length];
        const spec = dutyTypes[dIdx];

        assignmentsToCreate.push({
          schoolId,
          timetableId: timetableId || undefined,
          teacherId: teacher.id,
          category: spec.category,
          weekNumber: w,
          academicYear,
          termId: termId || undefined,
          venue: spec.venue,
          instructions: spec.instructions,
        });
      }
      teacherOffset += 1;
    }

    await this.prisma.teacherDutyAssignment.createMany({
      data: assignmentsToCreate,
    });

    return {
      message: `Term supervisory duty roster generated successfully for ${weeksCount} weeks.`,
      weeksCount,
      totalAssignments: assignmentsToCreate.length,
      teachersCount: teachers.length,
    };
  }

  /**
   * Get the master 14-week term duty matrix for staff-room notice board.
   */
  async getTermDutyMatrix(schoolId: string, academicYear?: string, termId?: string) {
    const where: any = { schoolId };
    if (academicYear) where.academicYear = academicYear;
    if (termId) where.termId = termId;

    const assignments = await this.prisma.teacherDutyAssignment.findMany({
      where,
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
      },
      orderBy: [{ weekNumber: 'asc' }, { category: 'asc' }],
    });

    const teachers = await this.prisma.user.findMany({
      where: { schoolId, role: UserRole.TEACHER, isActive: true },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    // Group by week
    const weeksMap = new Map<number, any>();
    for (const a of assignments) {
      if (!weeksMap.has(a.weekNumber)) {
        weeksMap.set(a.weekNumber, {
          weekNumber: a.weekNumber,
          duties: {},
        });
      }
      const weekObj = weeksMap.get(a.weekNumber);
      weekObj.duties[a.category] = {
        id: a.id,
        category: a.category,
        teacher: a.teacher,
        venue: a.venue,
        instructions: a.instructions,
        isCompleted: a.isCompleted,
      };
    }

    // Teacher duty workload summary
    const statsMap = new Map<string, { totalDuties: number; categories: Record<string, number> }>();
    for (const t of teachers) {
      statsMap.set(t.id, { totalDuties: 0, categories: {} });
    }
    for (const a of assignments) {
      const stat = statsMap.get(a.teacherId);
      if (stat) {
        stat.totalDuties += 1;
        stat.categories[a.category] = (stat.categories[a.category] || 0) + 1;
      }
    }

    return {
      academicYear: academicYear || '2025/2026',
      termId: termId || null,
      weeks: Array.from(weeksMap.values()).sort((a, b) => a.weekNumber - b.weekNumber),
      teachers: teachers.map((t) => ({
        ...t,
        dutyStats: statsMap.get(t.id) || { totalDuties: 0, categories: {} },
      })),
      totalAssignments: assignments.length,
    };
  }

  /**
   * Get specific supervisory duties assigned to a single teacher.
   */
  async getTeacherDuties(teacherId: string, schoolId: string) {
    const duties = await this.prisma.teacherDutyAssignment.findMany({
      where: { teacherId, schoolId },
      orderBy: [{ weekNumber: 'asc' }, { category: 'asc' }],
    });

    return duties;
  }

  /**
   * Manually create or override a duty assignment.
   */
  async assignDuty(dto: AssignDutyDto, schoolId: string) {
    return this.prisma.teacherDutyAssignment.create({
      data: {
        schoolId,
        teacherId: dto.teacherId,
        category: dto.category,
        day: dto.day,
        periodNumber: dto.periodNumber,
        weekNumber: dto.weekNumber,
        academicYear: dto.academicYear,
        termId: dto.termId,
        venue: dto.venue,
        instructions: dto.instructions,
      },
      include: {
        teacher: { select: { firstName: true, lastName: true } },
      },
    });
  }

  /**
   * Mark a duty assignment as completed.
   */
  async toggleDutyCompletion(dutyId: string, schoolId: string) {
    const duty = await this.prisma.teacherDutyAssignment.findFirst({
      where: { id: dutyId, schoolId },
    });
    if (!duty) {
      throw new NotFoundException('Duty assignment not found');
    }

    return this.prisma.teacherDutyAssignment.update({
      where: { id: dutyId },
      data: { isCompleted: !duty.isCompleted },
    });
  }

  /**
   * Relief & Substitution Engine:
   * Finds qualified and available substitute teachers for a given lesson slot on a specific date.
   */
  async findAvailableSubstitutes(lessonId: string, dateStr: string, schoolId: string) {
    const lesson = await this.prisma.timetableLesson.findFirst({
      where: { id: lessonId, timetable: { schoolId } },
      include: {
        classSection: true,
        subject: true,
        teacher: true,
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found in school timetable');
    }

    const targetDate = new Date(dateStr);
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const targetDay = dayNames[targetDate.getDay()];

    // All active teachers except the absent one
    const teachers = await this.prisma.user.findMany({
      where: {
        schoolId,
        role: UserRole.TEACHER,
        isActive: true,
        id: { not: lesson.teacherId || '' },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    });

    // Fetch existing lessons at this exact day and period
    const busyLessons = await this.prisma.timetableLesson.findMany({
      where: {
        timetableId: lesson.timetableId,
        day: targetDay,
        periodNumber: lesson.periodNumber,
      },
      select: { teacherId: true },
    });
    const busyTeacherIds = new Set(busyLessons.map((l) => l.teacherId).filter(Boolean));

    // Fetch existing substitutions for this date & period
    const existingSubs = await this.prisma.teacherSubstitution.findMany({
      where: {
        schoolId,
        date: targetDate,
        lesson: {
          periodNumber: lesson.periodNumber,
        },
      },
      select: { substituteTeacherId: true },
    });
    for (const sub of existingSubs) {
      busyTeacherIds.add(sub.substituteTeacherId);
    }

    // Filter available teachers
    const available = teachers.filter((t) => !busyTeacherIds.has(t.id));

    // Check subjects taught by available teachers to rank suitability
    const rankedTeachers = await Promise.all(
      available.map(async (teacher) => {
        const taughtSubjects = await this.prisma.classSubject.findMany({
          where: { teacherId: teacher.id },
          include: { subject: true },
        });

        const sameSubject = taughtSubjects.some((ts) => ts.subjectId === lesson.subjectId);
        const dayLessonCount = await this.prisma.timetableLesson.count({
          where: {
            timetableId: lesson.timetableId,
            day: targetDay,
            teacherId: teacher.id,
          },
        });

        let suitabilityScore = 1;
        let recommendationReason = 'Free period available';

        if (sameSubject) {
          suitabilityScore += 4;
          recommendationReason = `Subject specialist (${lesson.subject.name}) with free period`;
        } else if (dayLessonCount <= 3) {
          suitabilityScore += 2;
          recommendationReason = `Light teaching load today (${dayLessonCount} periods) with free period`;
        }

        return {
          ...teacher,
          suitabilityScore,
          recommendationReason,
          periodsToday: dayLessonCount,
          isSubjectMatch: sameSubject,
        };
      }),
    );

    rankedTeachers.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

    return {
      lesson: {
        id: lesson.id,
        subject: lesson.subject.name,
        subjectCode: lesson.subject.code,
        classSection: lesson.classSection.name,
        day: targetDay,
        periodNumber: lesson.periodNumber,
        time: `${lesson.startTime} - ${lesson.endTime}`,
        regularTeacher: lesson.teacher
          ? `${lesson.teacher.firstName} ${lesson.teacher.lastName}`
          : 'Unassigned',
      },
      date: dateStr,
      availableSubstitutes: rankedTeachers,
    };
  }

  /**
   * Confirm a teacher substitution.
   */
  async createSubstitution(dto: CreateSubstitutionDto, schoolId: string) {
    const targetDate = new Date(dto.date);

    // Check if duplicate substitution exists
    const existing = await this.prisma.teacherSubstitution.findFirst({
      where: {
        schoolId,
        lessonId: dto.lessonId,
        date: targetDate,
      },
    });

    if (existing) {
      throw new BadRequestException('A substitution has already been registered for this class period on this date.');
    }

    const sub = await this.prisma.teacherSubstitution.create({
      data: {
        schoolId,
        lessonId: dto.lessonId,
        absentTeacherId: dto.absentTeacherId,
        substituteTeacherId: dto.substituteTeacherId,
        date: targetDate,
        reason: dto.reason || 'Leave / Official Duty Coverage',
      },
      include: {
        lesson: {
          include: {
            subject: true,
            classSection: true,
          },
        },
        absentTeacher: {
          select: { firstName: true, lastName: true },
        },
        substituteTeacher: {
          select: { firstName: true, lastName: true, phone: true },
        },
      },
    });

    return sub;
  }

  /**
   * List substitutions by date or school.
   */
  async getSubstitutions(schoolId: string, dateStr?: string) {
    const where: any = { schoolId };
    if (dateStr) {
      where.date = new Date(dateStr);
    }

    return this.prisma.teacherSubstitution.findMany({
      where,
      include: {
        lesson: {
          include: {
            subject: true,
            classSection: true,
          },
        },
        absentTeacher: {
          select: { id: true, firstName: true, lastName: true },
        },
        substituteTeacher: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
  }
}
