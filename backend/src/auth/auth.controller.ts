import { Controller, Post, Body, UseGuards, Request, Get, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    async login(@Body() req) {
        return this.authService.validateUser(req.email, req.password).then((user) => {
            if (!user) {
                throw new UnauthorizedException();
            }
            return this.authService.login(user);
        });
    }

    @Post('biometric-login')
    async biometricLogin(@Body() body: { key: string }) {
        return this.authService.loginWithFingerprint(body.key);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('profile')
    getProfile(@Request() req) {
        return req.user;
    }
}
