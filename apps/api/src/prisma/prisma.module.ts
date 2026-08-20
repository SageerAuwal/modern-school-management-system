import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global makes PrismaService available everywhere without re-importing
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
