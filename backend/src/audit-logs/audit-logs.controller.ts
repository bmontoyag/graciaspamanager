import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { AuthGuard } from '@nestjs/passport';
import { RequirePermissions } from '../auth/permissions.decorator';

@RequirePermissions('settings')
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) { }

  @Get()
  @UseGuards(AuthGuard('jwt')) // Todo Admin y usuarios autenticados
  findAll() {
    return this.auditLogsService.findAll();
  }
}
