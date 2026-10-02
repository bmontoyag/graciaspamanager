import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ExpenseTypesService } from './expense-types.service';
import { CreateExpenseTypeDto } from './dto/create-expense-type.dto';
import { UpdateExpenseTypeDto } from './dto/update-expense-type.dto';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('expense-types')
export class ExpenseTypesController {
  constructor(private readonly expenseTypesService: ExpenseTypesService) {}

  @RequirePermissions('settings')
  @Post()
  create(@Body() createExpenseTypeDto: CreateExpenseTypeDto) {
    return this.expenseTypesService.create(createExpenseTypeDto);
  }

  @Get()
  findAll() {
    return this.expenseTypesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.expenseTypesService.findOne(+id);
  }

  @RequirePermissions('settings')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateExpenseTypeDto: UpdateExpenseTypeDto,
  ) {
    return this.expenseTypesService.update(+id, updateExpenseTypeDto);
  }

  @RequirePermissions('settings')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.expenseTypesService.remove(+id);
  }
}
