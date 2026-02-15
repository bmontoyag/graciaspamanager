import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

import { AppointmentsModule } from './appointments/appointments.module';
import { AttentionsModule } from './attentions/attentions.module';
import { PaymentsModule } from './payments/payments.module';
import { ExpensesModule } from './expenses/expenses.module';
import { ServicesModule } from './services/services.module';
import { ClientsModule } from './clients/clients.module';
import { UsersModule } from './users/users.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ConfigurationModule } from './configuration/configuration.module';
import { BlockedSlotsModule } from './blocked-slots/blocked-slots.module';
import { RolesModule } from './roles/roles.module';
import { ModulesModule } from './modules/modules.module';
import { BackupModule } from './backup/backup.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    PrismaModule,
    AppointmentsModule,
    AttentionsModule,
    PaymentsModule,
    ExpensesModule,
    ServicesModule,
    ClientsModule,
    UsersModule,
    DashboardModule,
    ConfigurationModule,
    BlockedSlotsModule,
    RolesModule,
    ModulesModule,
    BackupModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
