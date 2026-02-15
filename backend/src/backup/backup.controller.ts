import { Controller, Get, Res } from '@nestjs/common';
import { BackupService } from './backup.service';
import type { Response } from 'express';

@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) { }

  @Get()
  download(@Res() res: Response) {
    return this.backupService.downloadBackup(res);
  }
}
