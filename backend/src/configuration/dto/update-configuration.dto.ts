import { IsOptional, IsString, IsNumber, IsBoolean, IsInt } from 'class-validator';

export class UpdateConfigurationDto {
    @IsOptional() @IsString() primaryColor?: string;
    @IsOptional() @IsString() backgroundColor?: string;
    @IsOptional() @IsString() sidebarColor?: string;
    @IsOptional() @IsString() themeMode?: string;
    @IsOptional() @IsString() logoUrl?: string;
    @IsOptional() @IsString() loginBgUrl?: string;

    // Horarios
    @IsOptional() @IsString() openTime?: string;
    @IsOptional() @IsString() closeTime?: string;
    @IsOptional() @IsNumber() appointmentBuffer?: number;

    // Backup
    @IsOptional() @IsBoolean() backupEnabled?: boolean;
    @IsOptional() @IsString() backupFrequency?: string;
    @IsOptional() @IsString() backupTime?: string;
    @IsOptional() @IsString() backupEmail?: string;

    // Notificaciones Push
    @IsOptional() @IsBoolean() notificationsEnabled?: boolean;       // Activar/desactivar push globalmente
    @IsOptional() @IsBoolean() notifyNewAppointment?: boolean;       // Nueva cita creada
    @IsOptional() @IsBoolean() notifyAppointmentReminder?: boolean;  // Recordatorio de cita
    @IsOptional() @IsBoolean() notifyDailySummary?: boolean;         // Resumen diario
    @IsOptional() @IsBoolean() notifyPaymentReceived?: boolean;      // Pago registrado
    @IsOptional() @IsBoolean() notifyCancellation?: boolean;         // Cita cancelada
    @IsOptional() @IsInt() reminderMinutesBefore?: number;       // Minutos antes del recordatorio
    @IsOptional() @IsString() dailySummaryTime?: string;            // Hora del resumen diario (HH:mm)
    @IsOptional() @IsString() birthdayMessage?: string;

    // Marketing & Communications
    @IsOptional() @IsString() whatsappMessageTemplate?: string;
    
    @IsOptional()
    @IsString({ each: true })
    discoverySources?: string[];
}
