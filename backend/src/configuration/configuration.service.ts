import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';

@Injectable()
export class ConfigurationService {
  constructor(private prisma: PrismaService) { }

  // Get the global configuration (there should only be one record)
  async getGlobalConfig() {
    let config = await this.prisma.configuration.findFirst();

    // If no configuration exists, create default one
    if (!config) {
      config = await this.prisma.configuration.create({
        data: {
          primaryColor: '#56685A',
          backgroundColor: '#F3F2EC',
          sidebarColor: '#3F4F44',
          themeMode: 'light',
          openTime: '09:00',
          closeTime: '21:00',
          appointmentBuffer: 10,
        },
      });
    }

    return config;
  }

  // Subconjunto sin datos sensibles (email de backup, RUC, plantillas, etc.)
  async getPublicConfig() {
    const config = await this.getGlobalConfig();
    return {
      businessName: config.businessName,
      primaryColor: config.primaryColor,
      backgroundColor: config.backgroundColor,
      sidebarColor: config.sidebarColor,
      themeMode: config.themeMode,
      logoUrl: config.logoUrl,
      loginBgUrl: config.loginBgUrl,
    };
  }

  // Update the global configuration
  async updateGlobalConfig(updateConfigurationDto: UpdateConfigurationDto) {
    const existing = await this.prisma.configuration.findFirst();

    if (existing) {
      return this.prisma.configuration.update({
        where: { id: existing.id },
        data: updateConfigurationDto,
      });
    } else {
      return this.prisma.configuration.create({
        data: updateConfigurationDto,
      });
    }
  }
}
