import { Module } from '@nestjs/common';
import { FeeStructuresService } from './fee-structures.service';
import { InvoicesService } from './invoices.service';
import {
  FeeStructuresController,
  InvoicesController,
  PaystackWebhookController,
} from './fees.controller';

@Module({
  providers: [FeeStructuresService, InvoicesService],
  controllers: [FeeStructuresController, InvoicesController, PaystackWebhookController],
  exports: [FeeStructuresService, InvoicesService],
})
export class FeesModule {}
