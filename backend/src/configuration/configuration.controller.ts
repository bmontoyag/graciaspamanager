import { Controller, Get, Body, Patch } from '@nestjs/common';
import { ConfigurationService } from './configuration.service';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';

@Controller('configuration')
export class ConfigurationController {
  constructor(private readonly configurationService: ConfigurationService) { }

  @Get()
  getGlobalConfig() {
    return this.configurationService.getGlobalConfig();
  }

  @Patch()
  updateGlobalConfig(@Body() updateConfigurationDto: UpdateConfigurationDto) {
    return this.configurationService.updateGlobalConfig(updateConfigurationDto);
  }
}
