import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): object {
    return {
      status: 'ok',
      service: 'school-management-api',
      timestamp: new Date().toISOString(),
    };
  }
}
