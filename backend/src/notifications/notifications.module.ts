import { Global, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { NotificationsCronService } from './notifications.cron.service';
import { NotificationsController } from './notifications.controller';
import { ActivityNotifier } from './activity-notifier.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
    imports: [PrismaModule, ScheduleModule],
    controllers: [NotificationsController],
    providers: [NotificationsService, NotificationsCronService, ActivityNotifier],
    exports: [NotificationsService, ActivityNotifier],
})
export class NotificationsModule { }
