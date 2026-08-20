import { Module } from '@nestjs/common';
import { SchoolService } from './school.service';
import { SchoolController } from './school.controller';

@Module({
  providers: [SchoolService],
  controllers: [SchoolController],
  exports: [SchoolService],
})
export class SchoolModule {}
