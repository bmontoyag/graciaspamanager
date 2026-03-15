import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function executeMigration() {
    console.log('🚀 Iniciando migración de datos automatizada...');

    try {
        const migrationPath = path.join(__dirname, '..', 'migration.sql');
        
        if (!fs.existsSync(migrationPath)) {
            console.error('❌ Error: No se encontró el archivo backend/migration.sql');
            process.exit(1);
        }

        const sql = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📝 Ejecutando script SQL...');
        
        // Dividir el SQL por punto y coma, filtrar líneas vacías y comentarios
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
            console.log(`Executing: ${statement.substring(0, 50)}...`);
            await prisma.$executeRawUnsafe(statement);
        }
        
        console.log('✅ Migración de datos completada exitosamente.');
        console.log('   - Los terapeutas han sido migrados a la nueva estructura.');
        console.log('   - Las redes sociales y campos de marketing han sido inicializados.');

    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

executeMigration();
