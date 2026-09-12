import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { CreateBusDto, CreateRouteDto, AssignStudentDto } from './dto/transport.dto';

@Injectable()
export class TransportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ── Buses ─────────────────────────────────────────────────────────────────

  async createBus(dto: CreateBusDto, schoolId: string, actorId: string, actorEmail: string) {
    const exists = await this.prisma.bus.findUnique({
      where: { schoolId_plateNumber: { schoolId, plateNumber: dto.plateNumber } },
    });
    if (exists) throw new ConflictException(`Bus with plate ${dto.plateNumber} already exists`);

    const bus = await this.prisma.bus.create({ data: { ...dto, schoolId } });

    await this.auditService.log({
      actorId, actorEmail, action: 'BUS_CREATED',
      targetType: 'BUS', targetId: bus.id,
      afterValue: { name: dto.name, plateNumber: dto.plateNumber, capacity: dto.capacity } as Record<string, unknown>,
    });
    return bus;
  }

  async listBuses(schoolId: string) {
    const buses = await this.prisma.bus.findMany({
      where: { schoolId, isActive: true },
      include: {
        routes: {
          where: { isActive: true },
          select: { id: true, name: true },
        },
        _count: { select: { studentAssignments: { where: { isActive: true } } } },
      },
      orderBy: { name: 'asc' },
    });
    return buses.map((b) => ({
      ...b,
      assignedStudents: b._count.studentAssignments,
      occupancyPercent: Math.round((b._count.studentAssignments / b.capacity) * 100),
    }));
  }

  async getBus(id: string, schoolId: string) {
    const bus = await this.prisma.bus.findFirst({
      where: { id, schoolId },
      include: {
        routes: {
          include: {
            stops: { orderBy: { stopOrder: 'asc' } },
            _count: { select: { studentAssignments: { where: { isActive: true } } } },
          },
        },
        studentAssignments: {
          where: { isActive: true },
          include: {
            student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
            route: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!bus) throw new NotFoundException('Bus not found');
    return bus;
  }

  async updateBus(id: string, schoolId: string, dto: Partial<CreateBusDto>, actorId: string, actorEmail: string) {
    const bus = await this.prisma.bus.findFirst({ where: { id, schoolId } });
    if (!bus) throw new NotFoundException('Bus not found');
    const updated = await this.prisma.bus.update({ where: { id }, data: dto });
    await this.auditService.log({ actorId, actorEmail, action: 'BUS_UPDATED', targetType: 'BUS', targetId: id, afterValue: dto as unknown as Record<string, unknown> });
    return updated;
  }

  async deactivateBus(id: string, schoolId: string, actorId: string, actorEmail: string) {
    const bus = await this.prisma.bus.findFirst({ where: { id, schoolId } });
    if (!bus) throw new NotFoundException('Bus not found');
    const assigned = await this.prisma.studentTransport.count({ where: { busId: id, isActive: true } });
    if (assigned > 0) throw new BadRequestException(`${assigned} students are still assigned to this bus`);
    const updated = await this.prisma.bus.update({ where: { id }, data: { isActive: false } });
    await this.auditService.log({ actorId, actorEmail, action: 'BUS_DEACTIVATED', targetType: 'BUS', targetId: id });
    return updated;
  }

  // ── Routes ────────────────────────────────────────────────────────────────

  async createRoute(dto: CreateRouteDto, schoolId: string, actorId: string, actorEmail: string) {
    const bus = await this.prisma.bus.findFirst({ where: { id: dto.busId, schoolId, isActive: true } });
    if (!bus) throw new NotFoundException('Bus not found');

    const route = await this.prisma.transportRoute.create({
      data: {
        schoolId,
        busId: dto.busId,
        name: dto.name,
        description: dto.description,
        stops: {
          create: dto.stops.map((s) => ({
            stopName: s.stopName,
            stopOrder: s.stopOrder,
            landmark: s.landmark,
            pickupTime: s.pickupTime,
          })),
        },
      },
      include: { stops: { orderBy: { stopOrder: 'asc' } } },
    });

    await this.auditService.log({
      actorId, actorEmail, action: 'ROUTE_CREATED',
      targetType: 'TRANSPORT_ROUTE', targetId: route.id,
      afterValue: { name: dto.name, busId: dto.busId, stops: dto.stops.length } as Record<string, unknown>,
    });
    return route;
  }

  async listRoutes(schoolId: string) {
    return this.prisma.transportRoute.findMany({
      where: { schoolId, isActive: true },
      include: {
        bus: { select: { id: true, name: true, plateNumber: true, driverName: true } },
        stops: { orderBy: { stopOrder: 'asc' } },
        _count: { select: { studentAssignments: { where: { isActive: true } } } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getRoute(id: string, schoolId: string) {
    const route = await this.prisma.transportRoute.findFirst({
      where: { id, schoolId },
      include: {
        bus: { select: { id: true, name: true, plateNumber: true, driverName: true, driverPhone: true, capacity: true } },
        stops: { orderBy: { stopOrder: 'asc' } },
        studentAssignments: {
          where: { isActive: true },
          include: {
            student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
          },
          orderBy: { pickupStop: 'asc' },
        },
      },
    });
    if (!route) throw new NotFoundException('Route not found');
    return route;
  }

  async updateRoute(id: string, schoolId: string, dto: Partial<Pick<CreateRouteDto, 'name' | 'description' | 'busId'>>, actorId: string, actorEmail: string) {
    const route = await this.prisma.transportRoute.findFirst({ where: { id, schoolId } });
    if (!route) throw new NotFoundException('Route not found');
    const updated = await this.prisma.transportRoute.update({ where: { id }, data: dto });
    await this.auditService.log({ actorId, actorEmail, action: 'ROUTE_UPDATED', targetType: 'TRANSPORT_ROUTE', targetId: id, afterValue: dto as unknown as Record<string, unknown> });
    return updated;
  }

  async deactivateRoute(id: string, schoolId: string, actorId: string, actorEmail: string) {
    const route = await this.prisma.transportRoute.findFirst({ where: { id, schoolId } });
    if (!route) throw new NotFoundException('Route not found');
    const assigned = await this.prisma.studentTransport.count({ where: { routeId: id, isActive: true } });
    if (assigned > 0) throw new BadRequestException(`${assigned} students are assigned to this route`);
    const updated = await this.prisma.transportRoute.update({ where: { id }, data: { isActive: false } });
    await this.auditService.log({ actorId, actorEmail, action: 'ROUTE_DEACTIVATED', targetType: 'TRANSPORT_ROUTE', targetId: id });
    return updated;
  }

  // ── Student Assignments ───────────────────────────────────────────────────

  async assignStudent(dto: AssignStudentDto, schoolId: string, actorId: string, actorEmail: string) {
    const [student, bus, route] = await Promise.all([
      this.prisma.student.findFirst({ where: { id: dto.studentId, schoolId } }),
      this.prisma.bus.findFirst({ where: { id: dto.busId, schoolId, isActive: true } }),
      this.prisma.transportRoute.findFirst({ where: { id: dto.routeId, schoolId, busId: dto.busId, isActive: true } }),
    ]);
    if (!student) throw new NotFoundException('Student not found');
    if (!bus) throw new NotFoundException('Bus not found');
    if (!route) throw new NotFoundException('Route not found or not on this bus');

    // Check capacity: count all active assignments on this bus
    const currentLoad = await this.prisma.studentTransport.count({
      where: { busId: dto.busId, isActive: true },
    });
    if (currentLoad >= bus.capacity) {
      throw new BadRequestException(`Bus is full — capacity is ${bus.capacity} students`);
    }

    // Upsert: update if student already assigned this year, create otherwise
    const assignment = await this.prisma.studentTransport.upsert({
      where: { studentId_academicYear: { studentId: dto.studentId, academicYear: dto.academicYear } },
      create: {
        schoolId,
        studentId: dto.studentId,
        busId: dto.busId,
        routeId: dto.routeId,
        pickupStop: dto.pickupStop,
        dropoffStop: dto.dropoffStop,
        academicYear: dto.academicYear,
        isActive: true,
      },
      update: {
        busId: dto.busId,
        routeId: dto.routeId,
        pickupStop: dto.pickupStop,
        dropoffStop: dto.dropoffStop,
        isActive: true,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        bus: { select: { id: true, name: true, plateNumber: true } },
        route: { select: { id: true, name: true } },
      },
    });

    await this.auditService.log({
      actorId, actorEmail, action: 'STUDENT_ASSIGNED_BUS',
      targetType: 'STUDENT_TRANSPORT', targetId: assignment.id,
      afterValue: { studentId: dto.studentId, busId: dto.busId, routeId: dto.routeId } as Record<string, unknown>,
    });
    return assignment;
  }

  async unassignStudent(studentId: string, academicYear: string, schoolId: string, actorId: string, actorEmail: string) {
    const assignment = await this.prisma.studentTransport.findUnique({
      where: { studentId_academicYear: { studentId, academicYear } },
    });
    if (!assignment || assignment.schoolId !== schoolId) throw new NotFoundException('Assignment not found');
    const updated = await this.prisma.studentTransport.update({
      where: { studentId_academicYear: { studentId, academicYear } },
      data: { isActive: false },
    });
    await this.auditService.log({ actorId, actorEmail, action: 'STUDENT_UNASSIGNED_BUS', targetType: 'STUDENT_TRANSPORT', targetId: assignment.id });
    return updated;
  }

  async getBusRoster(busId: string, schoolId: string, academicYear: string) {
    const bus = await this.prisma.bus.findFirst({ where: { id: busId, schoolId } });
    if (!bus) throw new NotFoundException('Bus not found');

    const assignments = await this.prisma.studentTransport.findMany({
      where: { busId, schoolId, academicYear, isActive: true },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true, gender: true } },
        route: { select: { id: true, name: true } },
      },
      orderBy: [{ pickupStop: 'asc' }, { student: { lastName: 'asc' } }],
    });

    return {
      bus: { id: bus.id, name: bus.name, plateNumber: bus.plateNumber, capacity: bus.capacity, driverName: bus.driverName },
      academicYear,
      assignedCount: assignments.length,
      availableSeats: bus.capacity - assignments.length,
      students: assignments,
    };
  }
}
