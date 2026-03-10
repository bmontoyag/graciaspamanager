
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * SCRIPT DE REPARACIÓN DE COMISIONES
 * ---------------------------------
 * Este script busca todas las atenciones donde la comisión se grabó como 0.00
 * y la recalcula basándose en el costo total y el porcentaje del terapeuta.
 */
async function repairCommissions() {
    console.log('🚀 Iniciando reparación de comisiones...');

    // 1. Buscar registros con comisión en 0
    const records = await prisma.attentionWorker.findMany({
        where: { commissionAmount: 0 },
        include: {
            attention: true,
            worker: true
        }
    });

    if (records.length === 0) {
        console.log('✅ No se encontraron registros con comisión en 0. Todo está correcto.');
        return;
    }

    console.log(`🔍 Se encontraron ${records.length} registros para reparar.`);

    for (const record of records) {
        const totalCost = Number(record.attention.totalCost) || 0;

        // Si la atención no tiene costo, no hay nada que calcular
        if (totalCost === 0) {
            console.log(`⚠️  Saltando ID ${record.id}: La atención tiene costo S/ 0.00`);
            continue;
        }

        // 2. Contar terapeutas para dividir el costo (split)
        const therapistCount = await prisma.attentionWorker.count({
            where: { attentionId: record.attentionId }
        });

        const splitCost = totalCost / (therapistCount || 1);
        const percentage = Number(record.worker.commissionPercentage) || 50;
        const newCommission = Number((splitCost * (percentage / 100)).toFixed(2));

        console.log(`🛠️  Arreglando ID ${record.id}: ${record.worker.name}`);
        console.log(`   -> Costo: S/ ${totalCost} | Split (${therapistCount} pers): S/ ${splitCost}`);
        console.log(`   -> Comisión: ${percentage}% de ${splitCost} = S/ ${newCommission}`);

        // 3. Actualizar en la DB
        await prisma.attentionWorker.update({
            where: { id: record.id },
            data: { commissionAmount: newCommission }
        });
    }

    console.log('\n✨ Reparación completada exitosamente.');
}

repairCommissions()
    .catch(e => {
        console.error('❌ Error durante la reparación:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
