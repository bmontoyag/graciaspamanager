import { Controller, Patch, Param, Body } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('attention-workers')
export class AttentionWorkersController {
    constructor(private prisma: PrismaService) { }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateData: any) {
        return this.prisma.attentionWorker.update({
            where: { id: +id },
            data: {
                isPaid: updateData.isPaid,
                paidAt: updateData.paidAt ? new Date(updateData.paidAt) : null,
                expenseId: updateData.expenseId
            }
        });
    }
}
