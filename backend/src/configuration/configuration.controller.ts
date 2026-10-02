import { Controller, Get, Body, Patch, Req, ForbiddenException } from '@nestjs/common';
import { ConfigurationService } from './configuration.service';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';
import { Public } from '../auth/public.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import { hasPermission } from '../auth/permissions.guard';

// Datos del emisor que el módulo Corporativo puede editar sin el permiso de Configuración
const ISSUER_FIELDS = ['businessName', 'businessRuc', 'businessAddress', 'businessPhone', 'businessEmail', 'igvRate'];

@Controller('configuration')
export class ConfigurationController {
  constructor(private readonly configurationService: ConfigurationService) { }

  // Público: solo marca y colores, para la pantalla de login
  @Public()
  @Get('public')
  getPublicConfig() {
    return this.configurationService.getPublicConfig();
  }

  @Get()
  getGlobalConfig() {
    return this.configurationService.getGlobalConfig();
  }

  @RequirePermissions('settings', 'corporate')
  @Patch()
  updateGlobalConfig(@Body() updateConfigurationDto: UpdateConfigurationDto, @Req() req) {
    if (!hasPermission(req.user, 'settings')) {
      const forbidden = Object.keys(updateConfigurationDto).filter(k => !ISSUER_FIELDS.includes(k));
      if (forbidden.length > 0) {
        throw new ForbiddenException('Solo puede modificar los datos del emisor.');
      }
    }
    return this.configurationService.updateGlobalConfig(updateConfigurationDto);
  }
}
