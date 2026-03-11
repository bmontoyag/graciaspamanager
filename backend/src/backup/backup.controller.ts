import { Controller, Get, Post, Res, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BackupService } from './backup.service';
import type { Response } from 'express';

@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) { }

  @Get('download')
  download(@Res() res: Response) {
    return this.backupService.downloadBackup(res);
  }

  @Post('restore')
  @UseInterceptors(FileInterceptor('file'))
  async restore(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }
    await this.backupService.restoreBackup(file.buffer);
    return { message: 'Base de datos restaurada correctamente' };
  }
}
