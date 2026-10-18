import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { DeviceTokenDto } from './dto/device-token.dto';
import { NotificationsService } from './notifications.service';

/** Registro de dispositivos de la app móvil para recibir notificaciones push. */
@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Post('devices')
    @HttpCode(204)
    async register(@Body() dto: DeviceTokenDto, @Req() req) {
        await this.notificationsService.registerDevice(Number(req.user.userId), dto.token, dto.platform ?? 'android');
    }

    @Post('devices/remove')
    @HttpCode(204)
    async unregister(@Body() dto: DeviceTokenDto, @Req() req) {
        await this.notificationsService.unregisterDevice(Number(req.user.userId), dto.token);
    }
}
