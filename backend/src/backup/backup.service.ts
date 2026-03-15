import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { spawn } from 'child_process';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigurationService } from '../configuration/configuration.service';
import * as nodemailer from 'nodemailer';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class BackupService {
    private readonly logger = new Logger(BackupService.name);

    constructor(
        private readonly configService: ConfigurationService
    ) { }

    @Cron(CronExpression.EVERY_MINUTE)
    async checkBackupSchedule() {
        const config = await this.configService.getGlobalConfig();

        if (!config.backupEnabled || !config.backupEmail || !config.backupTime) {
            return;
        }

        const now = new Date();
        const [targetH, targetM] = config.backupTime.split(':').map(Number);

        // Simple check: match hour and minute
        if (now.getHours() === targetH && now.getMinutes() === targetM) {
            // Check Frequency
            if (this.shouldRunBackup(config.backupFrequency, now)) {
                this.logger.log('Triggering scheduled backup...');
                await this.performBackup(config.backupEmail);
            }
        }
    }

    private shouldRunBackup(frequency: string, date: Date): boolean {
        // daily: always true if time matches
        if (frequency === 'daily') return true;

        // weekly: let's pick Monday (day 1)
        if (frequency === 'weekly') {
            return date.getDay() === 1;
        }

        // monthly: let's pick the 1st of the month
        if (frequency === 'monthly') {
            return date.getDate() === 1;
        }

        return false;
    }

    async downloadBackup(res: Response) {
        this.generateBackupStream(res);
    }

    private async performBackup(email: string) {
        try {
            const dumpBuffer = await this.generateBackupBuffer();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `backup-graciaspa-${timestamp}.sql`;

            await this.sendEmail(email, filename, dumpBuffer);
            this.logger.log(`Backup sent successfully to ${email}`);
        } catch (error) {
            this.logger.error(`Failed to perform scheduled backup: ${error.message}`);
        }
    }

    private generateBackupBuffer(): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const dbUrl = process.env.DATABASE_URL || '';
            const dbUser = process.env.POSTGRES_USER || 'admin';
            const dbName = process.env.POSTGRES_DB || 'graciaspa_db';
            const containerName = 'graciaspa_postgres';

            // Intentar primero con docker si parece ser el entorno
            const dockerProcess = spawn('docker', [
                'exec', '-i', containerName,
                'pg_dump', '-U', dbUser, '--no-owner', '--no-acl', dbName
            ]);

            const chunks: Buffer[] = [];
            let errorData = '';
            
            dockerProcess.stdout.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
            dockerProcess.stderr.on('data', (data) => {
                errorData += data.toString();
            });
            
            dockerProcess.on('error', (err) => {
                this.logger.warn(`Docker backup failed or not found: ${err.message}. Trying local pg_dump...`);
                this.localPgDump(resolve, reject, chunks);
            });

            dockerProcess.on('close', (code) => {
                if (code !== 0) {
                    this.logger.warn(`Docker backup exited with code ${code}. Error: ${errorData}. Trying local pg_dump...`);
                    this.localPgDump(resolve, reject);
                } else {
                    resolve(Buffer.concat(chunks));
                }
            });
        });
    }

    private localPgDump(resolve: any, reject: any, existingChunks: Buffer[] = []) {
        // Obtenemos los datos de la URL de conexión de Prisma si existe
        // postgresql://USER:PASSWORD@HOST:PORT/DB
        const dbUrl = process.env.DATABASE_URL || '';
        const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
        
        let cmd = 'pg_dump';
        let args: string[] = [];
        let env = { ...process.env };

        if (match) {
            const [, user, password, host, port, db] = match;
            env.PGPASSWORD = password;
            args = ['-U', user, '-h', host, '-p', port, '--no-owner', '--no-acl', db.split('?')[0]];
        } else {
            const dbUser = process.env.POSTGRES_USER || 'admin';
            const dbName = process.env.POSTGRES_DB || 'graciaspa_db';
            args = ['-U', dbUser, '--no-owner', '--no-acl', dbName];
        }

        const localProcess = spawn(cmd, args, { env });
        const chunks = existingChunks;
        let errorData = '';

        localProcess.stdout.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        localProcess.stderr.on('data', (data) => {
            errorData += data.toString();
        });

        localProcess.on('error', (err) => {
            this.logger.error(`Local pg_dump error: ${err.message}`);
            reject(new Error(`Local pg_dump failed: ${err.message}`));
        });

        localProcess.on('close', (code) => {
            if (code !== 0) {
                this.logger.error(`pg_dump final failure. Code: ${code}. Error: ${errorData}`);
                reject(new Error(`pg_dump process exited with code ${code}. Error: ${errorData}`));
            } else {
                resolve(Buffer.concat(chunks));
            }
        });
    }

    // Reusing the stream logic for direct download if needed, 
    // but mostly for consistency.
    private async generateBackupStream(stream: any) {
        try {
            const buffer = await this.generateBackupBuffer();
            
            if (!buffer || buffer.length === 0) {
                throw new Error('El respaldo generado está vacío (0 bytes). Verifique los permisos del usuario de base de datos.');
            }
            
            const dbName = process.env.POSTGRES_DB || 'graciaspa_db';
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `backup-${dbName}-${timestamp}.sql`;

            if (stream.setHeader) {
                stream.setHeader('Content-Disposition', `attachment; filename=${filename}`);
                stream.setHeader('Content-Type', 'application/sql');
                stream.setHeader('Content-Length', buffer.length.toString());
            }

            stream.send ? stream.send(buffer) : stream.write(buffer);
            if (stream.end) stream.end();
        } catch (error) {
            this.logger.error(`Falló la generación del backup para descarga: ${error.message}`);
            if (!stream.headersSent && stream.status) {
                stream.status(500).json({ message: 'Error al generar el backup' });
            }
        }
    }

    async restoreBackup(buffer: Buffer) {
        return new Promise<void>((resolve, reject) => {
            const dbUser = process.env.POSTGRES_USER || 'admin';
            const dbName = process.env.POSTGRES_DB || 'graciaspa_db';
            const containerName = 'graciaspa_postgres';

            this.logger.log(`Starting database restore for ${dbName}...`);

            const dockerProcess = spawn('docker', [
                'exec', '-i', containerName,
                'psql', '-U', dbUser, '-d', dbName
            ]);

            dockerProcess.stdin.write(buffer);
            dockerProcess.stdin.end();

            let errorData = '';
            dockerProcess.stderr.on('data', (data) => {
                errorData += data.toString();
                this.logger.debug(`psql stderr: ${data}`);
            });

            dockerProcess.on('error', (error) => {
                this.logger.error(`Error spawning restore process: ${error.message}`);
                reject(error);
            });

            dockerProcess.on('close', (code) => {
                if (code !== 0) {
                    this.logger.error(`Restore process exited with code ${code}. Errors: ${errorData}`);
                    reject(new Error(`Restore failed with code ${code}`));
                } else {
                    this.logger.log('Database restore completed successfully');
                    resolve();
                }
            });
        });
    }

    private async sendEmail(to: string, filename: string, content: Buffer) {
        // Configure transporter with env vars
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            this.logger.warn('SMTP credentials not found. Skipping email sending.');
            return;
        }

        await transporter.sendMail({
            from: `"Gracias Spa System" <${process.env.SMTP_USER}>`,
            to: to,
            subject: `Backup Database - ${new Date().toLocaleDateString()}`,
            text: 'Adjunto encontrarás el respaldo de la base de datos.',
            attachments: [
                {
                    filename: filename,
                    content: content
                }
            ]
        });
    }
}
