import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    // In serverless environments (e.g. Vercel), do NOT await $connect() on module init
    // to prevent cold start timeouts while waiting for serverless DB wake-up.
    // Prisma connects lazily on the first database query.
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
