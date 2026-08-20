import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SchoolModule } from './school/school.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // ── Config ────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),

    // ── Rate limiting: global baseline (stricter limits on auth routes) ────
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // ── Infrastructure ────────────────────────────────────────────────────
    PrismaModule,
    CommonModule,  // Provides AuditService globally

    // ── Feature modules ───────────────────────────────────────────────────
    AuthModule,
    UsersModule,
    SchoolModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
