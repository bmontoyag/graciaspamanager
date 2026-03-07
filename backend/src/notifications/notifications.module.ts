import { Global, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { NotificationsCronService } from './notifications.cron.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
    imports: [PrismaModule, ScheduleModule.forRoot()],
    providers: [NotificationsService, NotificationsCronService],
    exports: [NotificationsService],
})
export class NotificationsModule { }
