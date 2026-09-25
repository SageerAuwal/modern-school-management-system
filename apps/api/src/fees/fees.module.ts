import { Module } from '@nestjs/common';
import { FeeStructuresService } from './fee-structures.service';
import { InvoicesService } from './invoices.service';
import { BursarService } from './bursar.service';
import {
  FeeStructuresController,
  InvoicesController,
  PaystackWebhookController,
} from './fees.controller';
import { BursarController } from './bursar.controller';

@Module({
  providers: [FeeStructuresService, InvoicesService, BursarService],
  controllers: [
    FeeStructuresController,
    InvoicesController,
    PaystackWebhookController,
    BursarController,
  ],
  exports: [FeeStructuresService, InvoicesService, BursarService],
})
export class FeesModule {}
