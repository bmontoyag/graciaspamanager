import { Controller, Get, Post, Body, Patch, Param, Delete, Req, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RequirePermissions } from '../auth/permissions.decorator';
import { hasPermission } from '../auth/permissions.guard';

// Campos que cada usuario puede cambiar en su propio perfil
const SELF_EDITABLE_FIELDS = ['name', 'email', 'phoneNumber', 'password', 'pushToken'] as const;

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @RequirePermissions('users')
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  // Lista de personal: la usan los formularios de atenciones, citas, gastos y eventos
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    this.assertSelfOrAdmin(+id, req.user);
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Req() req) {
    this.assertSelfOrAdmin(+id, req.user);

    if (!hasPermission(req.user, 'users')) {
      const forbidden = Object.keys(updateUserDto).filter(k => !(SELF_EDITABLE_FIELDS as readonly string[]).includes(k));
      if (forbidden.length > 0) {
        throw new ForbiddenException(`No puede modificar: ${forbidden.join(', ')}.`);
      }
    }
    return this.usersService.update(+id, updateUserDto);
  }

  @RequirePermissions('users')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }

  private assertSelfOrAdmin(id: number, user: { userId: number; permissions?: string[] }) {
    if (Number(user?.userId) !== id && !hasPermission(user, 'users')) {
      throw new ForbiddenException('Solo puede ver o editar su propio perfil.');
    }
  }
}
