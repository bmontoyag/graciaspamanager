import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private jwtService: JwtService,
        private prisma: PrismaService,
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: {
                roles: {
                    include: {
                        role: {
                            include: {
                                modules: {
                                    include: { module: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (user && await bcrypt.compare(pass, user.passwordHash)) {
            const { passwordHash, ...result } = user;
            return result;
        }
        return null;
    }

    async login(user: any) {
        // Flatten permissions
        const permissions = new Set<string>();

        // We no longer rely on user.role enum. 
        // Instead, check if any of the assigned roles is 'ADMIN' by name or checking specific permission 'all'

        const roles = user.roles ? user.roles.map((ur: any) => ur.role.name) : [];
        if (roles.includes('ADMIN')) {
            permissions.add('all');
        }

        if (user.roles) {
            user.roles.forEach((ur: any) => {
                if (ur.role.modules) {
                    ur.role.modules.forEach((rm: any) => {
                        if (rm.module && rm.module.key) {
                            permissions.add(rm.module.key);
                        }
                    });
                }
            });
        }

        const payload = {
            email: user.email,
            sub: user.id,
            roles: roles,
            permissions: Array.from(permissions)
        };

        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                roles: roles,
                permissions: Array.from(permissions)
            }
        };
    }

    async loginWithFingerprint(fingerprintKey: string) {
        const user = await this.prisma.user.findFirst({ where: { fingerprintKey } });
        if (!user) {
            return null;
        }
        return this.login(user); // Should ideally verify a signature, not just presence
    }
}
