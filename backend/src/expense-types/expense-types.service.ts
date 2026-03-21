import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseTypeDto } from './dto/create-expense-type.dto';
import { UpdateExpenseTypeDto } from './dto/update-expense-type.dto';

@Injectable()
export class ExpenseTypesService {
  constructor(private prisma: PrismaService) {}

  create(createExpenseTypeDto: CreateExpenseTypeDto) {
    return this.prisma.expenseType.create({
      data: createExpenseTypeDto,
    });
  }

  findAll() {
    return this.prisma.expenseType.findMany({
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: number) {
    return this.prisma.expenseType.findUnique({
      where: { id },
    });
  }

  update(id: number, updateExpenseTypeDto: UpdateExpenseTypeDto) {
    return this.prisma.expenseType.update({
      where: { id },
      data: updateExpenseTypeDto,
    });
  }

  remove(id: number) {
    return this.prisma.expenseType.delete({
      where: { id },
    });
  }
}
