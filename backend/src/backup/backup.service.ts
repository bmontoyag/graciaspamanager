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

    async testEmailBackup() {
        const config = await this.configService.getGlobalConfig();
        if (!config.backupEnabled || !config.backupEmail) {
            throw new Error('Backup is not enabled or email is not configured in settings.');
        }
        this.logger.log(`Manual test: Triggering backup email to ${config.backupEmail}...`);
        await this.performBackup(config.backupEmail);
        return { message: `Backup email triggered for ${config.backupEmail}` };
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
            const dbUser = process.env.POSTGRES_USER || 'admin';
            const dbName = process.env.POSTGRES_DB || 'graciaspa_db';
            const containerName = 'graciaspa_postgres';

            // Attempt Docker backup first if it exists
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
                this.logger.debug(`Docker backup not found or failed: ${err.message}. Trying local pg_dump...`);
                this.localPgDump(resolve, reject, chunks);
            });

            dockerProcess.on('close', (code) => {
                if (code !== 0) {
                    this.logger.debug(`Docker backup exited with code ${code}. Error: ${errorData || 'N/A'}. Trying local pg_dump...`);
                    this.localPgDump(resolve, reject);
                } else {
                    resolve(Buffer.concat(chunks));
                }
            });
        });
    }

    private localPgDump(resolve: any, reject: any, existingChunks: Buffer[] = []) {
        const dbUrl = process.env.DATABASE_URL || '';
        const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
        
        // Allow custom pg_dump path from ENV
        let cmd = process.env.PG_DUMP_PATH || 'pg_dump';
        let args: string[] = [];
        let env = { ...process.env };

        if (match) {
            const [, user, password, host, port, db] = match;
            env.PGPASSWORD = password;
            // Handle optional query params in DB name
            const actualDb = db.split('?')[0];
            args = ['-U', user, '-h', host, '-p', port, '--no-owner', '--no-acl', actualDb];
            this.logger.debug(`Using local pg_dump with user ${user} on host ${host}:${port}`);
        } else {
            const dbUser = process.env.POSTGRES_USER || 'admin';
            const dbName = process.env.POSTGRES_DB || 'graciaspa_db';
            args = ['-U', dbUser, '--no-owner', '--no-acl', dbName];
            this.logger.debug(`Using default local pg_dump with user ${dbUser}`);
        }

        const localProcess = spawn(cmd, args, { env });
        const chunks = existingChunks;
        let errorData = '';

        localProcess.stdout.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        localProcess.stderr.on('data', (data) => {
            errorData += data.toString();
        });

        localProcess.on('error', (err) => {
            const msg = `Failed to start local pg_dump (${cmd}): ${err.message}. Ensure PostgreSQL client tools are installed and in PATH or set PG_DUMP_PATH.`;
            this.logger.error(msg);
            reject(new Error(msg));
        });

        localProcess.on('close', (code) => {
            if (code !== 0) {
                const msg = `pg_dump process failed with code ${code}. Error Output: ${errorData || 'No error output'}`;
                this.logger.error(msg);
                reject(new Error(msg));
            } else if (chunks.length === 0) {
                const msg = `pg_dump succeeded but produced 0 bytes. Check user permissions.`;
                this.logger.error(msg);
                reject(new Error(msg));
            } else {
                this.logger.log(`Backup buffer generated successfully (${Buffer.concat(chunks).length} bytes)`);
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
