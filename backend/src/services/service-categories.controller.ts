
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ServiceCategoriesService } from './service-categories.service';
import { AuthGuard } from '@nestjs/passport';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('service-categories')
export class ServiceCategoriesController {
    constructor(private readonly serviceCategoriesService: ServiceCategoriesService) { }

    @Get()
    findAll() {
        return this.serviceCategoriesService.findAll();
    }

    @RequirePermissions('services')
    @Post()
    @UseGuards(AuthGuard('jwt'))
    create(@Body() data: { name: string; description?: string }) {
        return this.serviceCategoriesService.create(data);
    }

    @RequirePermissions('services')
    @Patch(':id')
    @UseGuards(AuthGuard('jwt'))
    update(@Param('id', ParseIntPipe) id: number, @Body() data: { name?: string; description?: string }) {
        return this.serviceCategoriesService.update(id, data);
    }

    @RequirePermissions('services')
    @Delete(':id')
    @UseGuards(AuthGuard('jwt'))
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.serviceCategoriesService.remove(id);
    }
}
