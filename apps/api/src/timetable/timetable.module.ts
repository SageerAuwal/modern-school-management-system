import { Module } from '@nestjs/common';
import { TimetableController } from './timetable.controller';
import { TimetableService } from './timetable.service';
import { RosterController } from './roster.controller';
import { RosterService } from './roster.service';

@Module({
  controllers: [TimetableController, RosterController],
  providers: [TimetableService, RosterService],
  exports: [TimetableService, RosterService],
})
export class TimetableModule {}
