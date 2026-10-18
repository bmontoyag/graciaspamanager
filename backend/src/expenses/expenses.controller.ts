import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Req } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { RequirePermissions } from '../auth/permissions.decorator';
import { ActivityNotifier } from '../notifications/activity-notifier.service';

@RequirePermissions('expenses')
@Controller('expenses')
export class ExpensesController {
  constructor(
    private readonly expensesService: ExpensesService,
    private readonly activityNotifier: ActivityNotifier,
  ) {}

  @RequirePermissions('expenses', 'daily_closing')
  @Post()
  async create(@Body() createExpenseDto: CreateExpenseDto, @Req() req) {
    const expense = await this.expensesService.create(createExpenseDto);
    this.activityNotifier.expenseCreated(req.user, expense.id);
    return expense;
  }

  @RequirePermissions('expenses', 'daily_closing', 'reports')
  @Get()
  findAll() {
    return this.expensesService.findAll();
  }

  @RequirePermissions('expenses', 'daily_closing', 'reports')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.expensesService.findOne(id);
  }

  @RequirePermissions('expenses', 'daily_closing')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateExpenseDto: UpdateExpenseDto) {
    return this.expensesService.update(id, updateExpenseDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.expensesService.remove(id);
  }
}
