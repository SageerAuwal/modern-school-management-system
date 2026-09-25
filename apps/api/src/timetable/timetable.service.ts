import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { GenerateTimetableDto, UpdateLessonDto } from './dto/timetable.dto';
import { UserRole } from '@prisma/client';

const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

interface PeriodTimeSlot {
  periodNumber: number;
  startTime: string;
  endTime: string;
}

@Injectable()
export class TimetableService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Calculates time slots for the daily routine, including break time
   */
  private calculateTimeSlots(
    startTimeStr: string,
    periodDuration: number,
    periodsPerDay: number,
    breakAfter: number,
    breakDuration: number,
  ): PeriodTimeSlot[] {
    const slots: PeriodTimeSlot[] = [];
    const [startH, startM] = startTimeStr.split(':').map(Number);
    let currentMinutes = startH * 60 + startM;

    for (let p = 1; p <= periodsPerDay; p++) {
      const pStartMinutes = currentMinutes;
      const pEndMinutes = pStartMinutes + periodDuration;

      const formatTime = (mins: number) => {
        const h = Math.floor(mins / 60) % 24;
        const m = mins % 60;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 === 0 ? 12 : h % 12;
        const displayM = m < 10 ? `0${m}` : `${m}`;
        return `${displayH < 10 ? '0' : ''}${displayH}:${displayM} ${ampm}`;
      };

      slots.push({
        periodNumber: p,
        startTime: formatTime(pStartMinutes),
        endTime: formatTime(pEndMinutes),
      });

      currentMinutes = pEndMinutes;
      // Add break duration after specified period
      if (p === breakAfter) {
        currentMinutes += breakDuration;
      }
    }

    return slots;
  }

  /**
   * AUTO-GENERATE TIMETABLE
   * Runs a Constraint Satisfaction Algorithm to allocate subjects to periods across all classes
   * with zero teacher collisions and zero class period overlaps.
   */
  async generate(dto: GenerateTimetableDto, schoolId: string, actorId: string, actorEmail: string) {
    const periodsPerDay = dto.periodsPerDay ?? 8;
    const periodDuration = dto.periodDuration ?? dto.lessonDuration ?? 40;
    const startTime = dto.startTime ?? '08:00';
    const breakAfter = dto.breakAfter ?? dto.breakAfterPeriod ?? 4;
    const breakDuration = dto.breakDuration ?? 30;

    // 1. Fetch all active classes
    const classes = await this.prisma.classSection.findMany({
      where: { schoolId, isActive: true },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });

    if (classes.length === 0) {
      throw new BadRequestException('No active classes found to generate timetable for. Create classes first.');
    }

    // 2. Fetch all school subjects
    let schoolSubjects = await this.prisma.subject.findMany({
      where: { schoolId, isActive: true },
    });

    // If school has no subjects yet, seed standard Nigerian curriculum subjects
    if (schoolSubjects.length === 0) {
      const standardSubjects = [
        { name: 'Mathematics', code: 'MTH' },
        { name: 'English Language', code: 'ENG' },
        { name: 'Basic Science', code: 'BSC' },
        { name: 'Social Studies', code: 'SOS' },
        { name: 'Civic Education', code: 'CVE' },
        { name: 'Computer Studies', code: 'CMP' },
        { name: 'Biology', code: 'BIO' },
        { name: 'Chemistry', code: 'CHM' },
        { name: 'Physics', code: 'PHY' },
        { name: 'Agricultural Science', code: 'AGR' },
        { name: 'Islamic Religious Studies', code: 'IRS' },
        { name: 'Physical & Health Education', code: 'PHE' },
      ];

      for (const s of standardSubjects) {
        await this.prisma.subject.create({
          data: { schoolId, name: s.name, code: s.code },
        });
      }

      schoolSubjects = await this.prisma.subject.findMany({
        where: { schoolId, isActive: true },
      });
    }

    // 3. Fetch all teachers in the school
    const teachers = await this.prisma.user.findMany({
      where: { schoolId, role: UserRole.TEACHER, isActive: true },
      select: { id: true, firstName: true, lastName: true },
    });

    // 4. Calculate period times
    const timeSlots = this.calculateTimeSlots(startTime, periodDuration, periodsPerDay, breakAfter, breakDuration);

    // 5. Build Class-Subject Allocations with Teacher Assignments
    // Distribute all active teachers across subjects fairly so every teacher has assigned classes
    let teacherRotIdx = 0;
    for (let cIdx = 0; cIdx < classes.length; cIdx++) {
      const cls = classes[cIdx];
      const existingCS = await this.prisma.classSubject.findMany({
        where: { classSectionId: cls.id },
      });

      if (existingCS.length < 6) {
        // Link subjects to this class if not already linked
        for (let sIdx = 0; sIdx < schoolSubjects.length; sIdx++) {
          const sub = schoolSubjects[sIdx];
          const assignedTeacher = teachers.length > 0 ? teachers[teacherRotIdx % teachers.length] : null;
          teacherRotIdx++;

          await this.prisma.classSubject.upsert({
            where: { classSectionId_subjectId: { classSectionId: cls.id, subjectId: sub.id } },
            create: {
              classSectionId: cls.id,
              subjectId: sub.id,
              teacherId: assignedTeacher?.id,
            },
            update: {
              teacherId: assignedTeacher?.id,
            },
          });
        }
      } else if (teachers.length > 0) {
        // Ensure any unassigned classSubject gets an active teacher
        for (const cs of existingCS) {
          if (!cs.teacherId) {
            const assignedTeacher = teachers[teacherRotIdx % teachers.length];
            teacherRotIdx++;
            await this.prisma.classSubject.update({
              where: { id: cs.id },
              data: { teacherId: assignedTeacher.id },
            });
          }
        }
      }
    }

    // 6. Fetch full classSubjects mapping
    const allClassSubjects = await this.prisma.classSubject.findMany({
      where: { classSection: { schoolId, isActive: true } },
      include: { subject: true, teacher: true },
    });

    // 7. CONSTRAINT SATISFACTION ENGINE
    // teacherBusy: Map<teacherId, Set<"DAY_PERIOD">>
    const teacherBusy = new Map<string, Set<string>>();
    // teacherWeeklyCount: Map<teacherId, number>
    const teacherWeeklyCount = new Map<string, number>();
    // teacherDailyCount: Map<"teacherId_day", number>
    const teacherDailyCount = new Map<string, number>();
    // classBusy: Map<classId, Set<"DAY_PERIOD">>
    const classBusy = new Map<string, Set<string>>();
    // classDayCount: Map<"classId_day", number> tracks daily periods to balance Monday–Friday
    const classDayCount = new Map<string, number>();

    for (const t of teachers) {
      teacherBusy.set(t.id, new Set<string>());
      teacherWeeklyCount.set(t.id, 0);
      for (const d of WEEKDAYS) {
        teacherDailyCount.set(`${t.id}_${d}`, 0);
      }
    }
    for (const c of classes) {
      classBusy.set(c.id, new Set<string>());
      for (const d of WEEKDAYS) {
        classDayCount.set(`${c.id}_${d}`, 0);
      }
    }

    const lessonsToCreate: Array<{
      classSectionId: string;
      subjectId: string;
      teacherId?: string;
      day: string;
      periodNumber: number;
      startTime: string;
      endTime: string;
      room?: string;
      isDouble?: boolean;
    }> = [];

    // Target ~35 to 40 periods per week (7-8 periods per day across all 5 school days)
    const targetWeeklyPeriods = Math.min(periodsPerDay * 5, 38);

    for (const cls of classes) {
      const clsSubjects = allClassSubjects.filter((cs) => cs.classSectionId === cls.id);
      if (clsSubjects.length === 0) continue;

      // Map target frequency per subject
      const subjectQueue: Array<{
        subjectId: string;
        teacherId?: string;
        isCore: boolean;
        isDouble: boolean;
      }> = [];

      for (const cs of clsSubjects) {
        const subName = cs.subject.name.toLowerCase();
        const isCore = subName.includes('math') || subName.includes('english');
        const isLab = subName.includes('science') || subName.includes('chemistry') || subName.includes('physics') || subName.includes('computer');

        // Balanced period distribution: Core gets 6, Labs get 5, Humanities/Commercial get 4-5
        const periodsCount = isCore ? 6 : isLab ? 5 : 5;

        for (let i = 0; i < periodsCount; i++) {
          subjectQueue.push({
            subjectId: cs.subjectId,
            teacherId: cs.teacherId ?? undefined,
            isCore,
            isDouble: isLab && i === 0,
          });
        }
      }

      // Pad remaining periods with subjects to reach full 35-38 period weekly load
      let padIdx = 0;
      while (subjectQueue.length < targetWeeklyPeriods && clsSubjects.length > 0) {
        const cs = clsSubjects[padIdx % clsSubjects.length];
        const subName = cs.subject.name.toLowerCase();
        const isCore = subName.includes('math') || subName.includes('english');
        subjectQueue.push({
          subjectId: cs.subjectId,
          teacherId: cs.teacherId ?? undefined,
          isCore,
          isDouble: false,
        });
        padIdx++;
      }

      // Distribute core subjects evenly
      subjectQueue.sort((a, b) => (b.isCore ? 1 : 0) - (a.isCore ? 1 : 0));

      const classSubjectDayCount = new Map<string, number>();

      for (const item of subjectQueue) {
        let placed = false;

        // Sort days by:
        // 1. Least filled day for this class (guarantees equal Monday–Friday distribution)
        // 2. Least taught day for this subject (spreads the subject throughout the week)
        const sortedDays = [...WEEKDAYS].sort((d1, d2) => {
          const load1 = classDayCount.get(`${cls.id}_${d1}`) || 0;
          const load2 = classDayCount.get(`${cls.id}_${d2}`) || 0;
          if (load1 !== load2) return load1 - load2;

          const c1 = classSubjectDayCount.get(`${item.subjectId}_${d1}`) || 0;
          const c2 = classSubjectDayCount.get(`${item.subjectId}_${d2}`) || 0;
          return c1 - c2;
        });

        for (const day of sortedDays) {
          if (placed) break;

          const currentDayLoad = classDayCount.get(`${cls.id}_${day}`) || 0;
          if (currentDayLoad >= periodsPerDay) continue;

          const dayCount = classSubjectDayCount.get(`${item.subjectId}_${day}`) || 0;
          // Avoid more than 2 periods of same subject on the same day
          if (dayCount >= 2) continue;

          // Search periods: Core subjects prefer morning (periods 1-4)
          const periodsOrder = item.isCore
            ? [1, 2, 3, 4, 5, 6, 7, 8]
            : [5, 6, 7, 8, 3, 4, 1, 2];

          for (const period of periodsOrder) {
            if (period > periodsPerDay) continue;

            const slotKey = `${day}_${period}`;

            // Check 1: Is this class section free at this slot?
            if (classBusy.get(cls.id)?.has(slotKey)) continue;

            // Check 2: If teacher assigned, check collision and workload caps
            if (item.teacherId) {
              // A. Collision check
              if (teacherBusy.get(item.teacherId)?.has(slotKey)) continue;

              // B. Daily limit: Max 5 teaching periods per day (guarantees >= 3 periods of PPA / Rest / Duty)
              const tDayCount = teacherDailyCount.get(`${item.teacherId}_${day}`) || 0;
              if (tDayCount >= 5) continue;

              // C. Weekly limit: Max 22 teaching periods per week
              const tWeekCount = teacherWeeklyCount.get(item.teacherId) || 0;
              if (tWeekCount >= 22) continue;
            }

            // Slot is conflict-free and balanced! Allocate:
            classBusy.get(cls.id)?.add(slotKey);
            if (item.teacherId) {
              teacherBusy.get(item.teacherId)?.add(slotKey);
              teacherDailyCount.set(`${item.teacherId}_${day}`, (teacherDailyCount.get(`${item.teacherId}_${day}`) || 0) + 1);
              teacherWeeklyCount.set(item.teacherId, (teacherWeeklyCount.get(item.teacherId) || 0) + 1);
            }

            const timeSlot = timeSlots.find((t) => t.periodNumber === period)!;

            lessonsToCreate.push({
              classSectionId: cls.id,
              subjectId: item.subjectId,
              teacherId: item.teacherId,
              day,
              periodNumber: period,
              startTime: timeSlot.startTime,
              endTime: timeSlot.endTime,
              room: `${cls.name} Room`,
              isDouble: false,
            });

            classDayCount.set(`${cls.id}_${day}`, currentDayLoad + 1);
            classSubjectDayCount.set(`${item.subjectId}_${day}`, dayCount + 1);
            placed = true;
            break;
          }
        }
      }
    }

    // 8. Atomic Database Persistence
    // Deactivate previous active timetable and save new one
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.timetable.updateMany({
        where: { schoolId, isActive: true },
        data: { isActive: false },
      });

      const title = dto.title || `${dto.academicYear} Master Academic Timetable`;

      const timetable = await tx.timetable.create({
        data: {
          schoolId,
          academicYear: dto.academicYear,
          termId: dto.termId,
          title,
          periodsPerDay,
          periodDuration,
          startTime,
          breakAfter,
          breakDuration,
          isActive: true,
          lessons: {
            create: lessonsToCreate.map((l) => ({
              classSectionId: l.classSectionId,
              subjectId: l.subjectId,
              teacherId: l.teacherId,
              day: l.day,
              periodNumber: l.periodNumber,
              startTime: l.startTime,
              endTime: l.endTime,
              room: l.room,
              isDouble: l.isDouble ?? false,
            })),
          },
        },
        include: {
          lessons: {
            include: {
              classSection: { select: { id: true, name: true, level: true } },
              subject: { select: { id: true, name: true, code: true } },
              teacher: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      });

      return timetable;
    });

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'TIMETABLE_AUTO_GENERATED',
      targetType: 'TIMETABLE',
      targetId: result.id,
      afterValue: {
        academicYear: dto.academicYear,
        totalLessons: lessonsToCreate.length,
        classesCount: classes.length,
      } as Record<string, unknown>,
    });

    return {
      message: 'Timetable generated successfully with 0 teacher conflicts.',
      timetable: result,
      totalLessons: lessonsToCreate.length,
      classesCount: classes.length,
      conflictsCount: 0,
    };
  }

  /**
   * Get active master timetable
   */
  async getActive(schoolId: string) {
    const timetable = await this.prisma.timetable.findFirst({
      where: { schoolId, isActive: true },
      include: {
        term: { select: { id: true, name: true } },
        lessons: {
          include: {
            classSection: { select: { id: true, name: true, level: true } },
            subject: { select: { id: true, name: true, code: true } },
            teacher: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
          orderBy: [{ day: 'asc' }, { periodNumber: 'asc' }],
        },
      },
    });

    return timetable;
  }

  /**
   * Get weekly timetable for a specific class section
   */
  async getClassTimetable(timetableId: string, classSectionId: string, schoolId: string) {
    const timetable = await this.prisma.timetable.findFirst({
      where: { id: timetableId, schoolId },
    });
    if (!timetable) throw new NotFoundException('Timetable not found');

    const lessons = await this.prisma.timetableLesson.findMany({
      where: { timetableId, classSectionId },
      include: {
        classSection: { select: { id: true, name: true, level: true } },
        subject: { select: { id: true, name: true, code: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ day: 'asc' }, { periodNumber: 'asc' }],
    });

    return {
      timetable,
      classSectionId,
      lessons,
    };
  }

  /**
   * Get weekly schedule for a specific teacher
   */
  async getTeacherTimetable(timetableId: string, teacherId: string, schoolId: string) {
    const timetable = await this.prisma.timetable.findFirst({
      where: { id: timetableId, schoolId },
    });
    if (!timetable) throw new NotFoundException('Timetable not found');

    const lessons = await this.prisma.timetableLesson.findMany({
      where: { timetableId, teacherId },
      include: {
        classSection: { select: { id: true, name: true, level: true } },
        subject: { select: { id: true, name: true, code: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ day: 'asc' }, { periodNumber: 'asc' }],
    });

    return {
      timetable,
      teacherId,
      lessons,
    };
  }

  /**
   * Get master school schedule grid for all classes on a specific day
   */
  async getMasterDayGrid(timetableId: string, day: string, schoolId: string) {
    const timetable = await this.prisma.timetable.findFirst({
      where: { id: timetableId, schoolId },
    });
    if (!timetable) throw new NotFoundException('Timetable not found');

    const lessons = await this.prisma.timetableLesson.findMany({
      where: { timetableId, day: day.toUpperCase() },
      include: {
        classSection: { select: { id: true, name: true, level: true } },
        subject: { select: { id: true, name: true, code: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ classSection: { name: 'asc' } }, { periodNumber: 'asc' }],
    });

    return {
      timetable,
      day: day.toUpperCase(),
      lessons,
    };
  }

  /**
   * Update a scheduled lesson (e.g. manual drag/drop or room swap) with collision detection
   */
  async updateLesson(lessonId: string, dto: UpdateLessonDto, schoolId: string, actorId: string, actorEmail: string) {
    const lesson = await this.prisma.timetableLesson.findFirst({
      where: { id: lessonId, timetable: { schoolId } },
      include: { timetable: true },
    });
    if (!lesson) throw new NotFoundException('Lesson entry not found');

    // If day or period changed, check for teacher collision
    const targetDay = dto.day ?? lesson.day;
    const targetPeriod = dto.periodNumber ?? lesson.periodNumber;
    const targetTeacherId = dto.teacherId ?? lesson.teacherId;

    if (targetTeacherId && (dto.day || dto.periodNumber || dto.teacherId)) {
      const collision = await this.prisma.timetableLesson.findFirst({
        where: {
          timetableId: lesson.timetableId,
          teacherId: targetTeacherId,
          day: targetDay,
          periodNumber: targetPeriod,
          id: { not: lessonId },
        },
        include: {
          classSection: { select: { name: true } },
          subject: { select: { name: true } },
        },
      });

      if (collision) {
        throw new ConflictException(
          `Teacher is already scheduled to teach ${collision.subject.name} to class ${collision.classSection.name} on ${targetDay} at Period ${targetPeriod}.`
        );
      }
    }

    const updated = await this.prisma.timetableLesson.update({
      where: { id: lessonId },
      data: {
        subjectId: dto.subjectId,
        teacherId: dto.teacherId,
        room: dto.room,
        day: dto.day,
        periodNumber: dto.periodNumber,
      },
      include: {
        classSection: { select: { id: true, name: true, level: true } },
        subject: { select: { id: true, name: true, code: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.auditService.log({
      actorId,
      actorEmail,
      action: 'TIMETABLE_LESSON_UPDATED',
      targetType: 'TIMETABLE_LESSON',
      targetId: lessonId,
      afterValue: dto as Record<string, unknown>,
    });

    return updated;
  }
}
