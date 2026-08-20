import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // ── Config: loads .env, available everywhere via ConfigService ────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),

    // ── Rate limiting: applied globally to ALL endpoints ──────────────────────
    // 100 requests per 60 seconds per IP by default.
    // Auth endpoints will have stricter limits set per-route in Module 1.
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60000,   // 60 seconds
        limit: 100,   // max 100 requests per ttl window
      },
    ]),

    // ── Prisma: database connection, available everywhere ─────────────────────
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // ── Apply rate limiting globally as a guard ───────────────────────────────
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
