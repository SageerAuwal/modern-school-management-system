import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit/audit.service';

@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class CommonModule {}
