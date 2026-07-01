import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execFileAsync = promisify(execFile);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  // Har 3 soatda bir marta (server vaqti bo'yicha)
  @Cron(CronExpression.EVERY_3_HOURS)
  async scheduledBackup() {
    try {
      await this.runBackup();
    } catch (e) {
      this.logger.error('Rejalashtirilgan backup muvaffaqiyatsiz tugadi', e);
    }
  }

  async runBackup(): Promise<void> {
    const dumpPath = await this.createDump();
    await this.sendToTelegram(dumpPath);
  }

  private async createDump(): Promise<string> {
    const rawUrl = process.env.DATABASE_URL;
    if (!rawUrl) throw new Error('DATABASE_URL topilmadi');

    const dbUrl = new URL(rawUrl);
    const host = dbUrl.hostname;
    const port = dbUrl.port || '5432';
    const user = decodeURIComponent(dbUrl.username);
    const password = decodeURIComponent(dbUrl.password);
    const dbName = dbUrl.pathname.replace(/^\//, '');

    const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
    fs.mkdirSync(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dumpPath = path.join(backupDir, `mysantex-backup-${timestamp}.sql`);

    // Oddiy SQL format (-F p) — tiklash uchun faqat `psql` yetarli, pg_restore shart emas.
    // --clean --if-exists — mavjud jadvallar bo'lsa ham xatosiz qayta tiklanadi.
    await execFileAsync(
      'pg_dump',
      ['-h', host, '-p', port, '-U', user, '-d', dbName, '-F', 'p', '--clean', '--if-exists', '-f', dumpPath],
      { env: { ...process.env, PGPASSWORD: password } },
    );

    return dumpPath;
  }

  private async sendToTelegram(filePath: string): Promise<void> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatIds = (process.env.TELEGRAM_CHAT_IDS ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (!token || chatIds.length === 0) {
      this.logger.warn(
        'TELEGRAM_BOT_TOKEN yoki TELEGRAM_CHAT_IDS sozlanmagan — backup yuborilmadi',
      );
      return;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const caption =
      `My Santex — DB backup\n${new Date().toLocaleString('uz-UZ')}\n\n` +
      `Tiklash: psql -h HOST -U mysantex -d mysantex -f ${path.basename(filePath)}`;

    for (const chatId of chatIds) {
      const form = new FormData();
      form.append('chat_id', chatId);
      form.append('caption', caption);
      form.append('document', new Blob([fileBuffer]), path.basename(filePath));

      const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        const text = await res.text();
        this.logger.error(`Telegram API xatosi (chat_id=${chatId}): ${res.status} ${text}`);
        continue;
      }

      this.logger.log(`Backup Telegram'ga yuborildi: chat_id=${chatId}, fayl=${path.basename(filePath)}`);
    }
  }
}
