import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) { }

  @RequirePermissions('clients', 'attentions', 'calendar')
  @Post()
  create(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.create(createClientDto);
  }

  @RequirePermissions('clients', 'attentions', 'calendar', 'dashboard', 'reports', 'daily_closing')
  @Get()
  findAll() {
    return this.clientsService.findAll();
  }

  @RequirePermissions('clients', 'attentions', 'calendar', 'dashboard', 'reports', 'daily_closing')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(+id);
  }

  @RequirePermissions('clients')
  @Post('sync-loyalty')
  syncLoyaltyPoints() {
    return this.clientsService.syncLoyaltyPoints();
  }

  @RequirePermissions('clients')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto) {
    return this.clientsService.update(+id, updateClientDto);
  }

  @RequirePermissions('clients')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clientsService.remove(+id);
  }
}
