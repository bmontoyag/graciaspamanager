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
            const dbUser = process.env.POSTGRES_USER || 'admin';
            const dbName = process.env.POSTGRES_DB || 'graciaspa_db';
            const containerName = 'graciaspa_postgres';

            const dockerProcess = spawn('docker', [
                'exec', '-i', containerName,
                'pg_dump', '-U', dbUser, '--no-owner', '--no-acl', dbName
            ]);

            const chunks: Buffer[] = [];

            dockerProcess.stdout.on('data', (chunk) => chunks.push(Buffer.from(chunk)));

            dockerProcess.stderr.on('data', (data) => {
                this.logger.debug(`pg_dump stderr: ${data}`);
            });

            dockerProcess.on('error', (error) => reject(error));

            dockerProcess.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Backup process exited with code ${code}`));
                } else {
                    resolve(Buffer.concat(chunks));
                }
            });
        });
    }

    // Reusing the stream logic for direct download if needed, 
    // but mostly for consistency.
    private generateBackupStream(stream: any) {
        const dbUser = process.env.POSTGRES_USER || 'admin';
        const dbName = process.env.POSTGRES_DB || 'graciaspa_db';
        const containerName = 'graciaspa_postgres';

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup-${dbName}-${timestamp}.sql`;

        if (stream.setHeader) {
            stream.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            stream.setHeader('Content-Type', 'application/sql');
        }

        const dockerProcess = spawn('docker', [
            'exec', '-i', containerName,
            'pg_dump', '-U', dbUser, '--no-owner', '--no-acl', dbName
        ]);

        dockerProcess.stdout.pipe(stream);

        dockerProcess.stderr.on('data', (data) => this.logger.debug(`stderr: ${data}`));
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
