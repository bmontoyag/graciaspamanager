import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { ServiceCategoriesController } from './service-categories.controller';
import { ServiceCategoriesService } from './service-categories.service';

@Module({
  imports: [PrismaModule],
  controllers: [ServicesController, ServiceCategoriesController],
  providers: [ServicesService, ServiceCategoriesService],
})
export class ServicesModule { }
