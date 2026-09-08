import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SchoolModule } from './school/school.module';
import { StudentsModule } from './students/students.module';
import { ClassesModule } from './classes/classes.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { StaffModule } from './staff/staff.module';
import { AttendanceModule } from './attendance/attendance.module';
import { SubjectsModule } from './subjects/subjects.module';
import { TermsModule } from './terms/terms.module';
import { ScoresModule } from './scores/scores.module';
import { FeesModule } from './fees/fees.module';
import { LibraryModule } from './library/library.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    ThrottlerModule.forRoot([{ name: 'global', ttl: 60000, limit: 100 }]),
    PrismaModule,
    CommonModule,
    AuthModule,
    UsersModule,
    SchoolModule,
    StudentsModule,
    ClassesModule,
    EnrollmentsModule,
    StaffModule,
    AttendanceModule,
    SubjectsModule,
    TermsModule,
    ScoresModule,
    FeesModule,
    LibraryModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
