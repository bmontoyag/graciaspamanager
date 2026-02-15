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
          primaryColor: '#8B7355',
          backgroundColor: '#F5F1E8',
          sidebarColor: '#2C3E50',
          themeMode: 'light',
          openTime: '09:00',
          closeTime: '21:00',
          appointmentBuffer: 10,
        },
      });
    }

    return config;
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
