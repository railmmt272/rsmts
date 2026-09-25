import { Controller, Get, Delete, UseGuards, Query, Inject } from '@nestjs/common';
import { SystemService } from './system.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../users/schemas/user.schema.js';

@Controller('system')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemController {
  constructor(@Inject(SystemService) private readonly systemService: SystemService) { }

  @Get('health')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.MANAGEMENT)
  getHealthStatus() {
    return this.systemService.getHealthStatus();
  }

  @Get('audit-logs')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.MANAGEMENT)
  getAuditLogs(@Query('limit') limit?: number) {
    return this.systemService.getAuditLogs(limit ? Number(limit) : 100);
  }

  @Delete('audit-logs')
  @Roles(UserRole.SYSTEM_ADMIN)
  clearAuditLogs() {
    return this.systemService.clearAuditLogs();
  }
}
