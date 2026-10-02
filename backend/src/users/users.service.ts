import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';

// Nunca exponer credenciales en las respuestas de la API
const SENSITIVE_FIELDS = { passwordHash: true, fingerprintKey: true } as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async create(createUserDto: CreateUserDto) {
    const { password, roleIds, ...rest } = createUserDto;
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash(password, 10);

    return this.prisma.user.create({
      data: {
        ...rest,
        passwordHash,
        roles: {
          create: roleIds?.map((roleId) => ({ roleId })) || [],
        },
      },
      include: {
        roles: { include: { role: true } },
      },
      omit: SENSITIVE_FIELDS,
    });
  }

  findAll() {
    return this.prisma.user.findMany({
      orderBy: { name: 'asc' },
      include: {
        roles: { include: { role: true } },
      },
      omit: SENSITIVE_FIELDS,
    });
  }

  findOne(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: { include: { role: true } },
      },
      omit: SENSITIVE_FIELDS,
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const { password, roleIds, ...rest } = updateUserDto;
    let updateData: any = { ...rest };

    // If password is being updated, hash it
    if (password) {
      const bcrypt = require('bcrypt');
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    // Determine relations update
    const roleUpdate = roleIds ? {
      roles: {
        deleteMany: {},
        create: roleIds.map((roleId) => ({ roleId })),
      }
    } : {};

    return this.prisma.user.update({
      where: { id },
      data: {
        ...updateData,
        ...roleUpdate,
      },
      include: {
        roles: { include: { role: true } },
      },
      omit: SENSITIVE_FIELDS,
    });
  }

  remove(id: number) {
    return this.prisma.user.delete({
      where: { id },
      omit: SENSITIVE_FIELDS,
    });
  }
}
