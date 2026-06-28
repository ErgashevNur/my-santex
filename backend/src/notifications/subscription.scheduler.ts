import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionScheduler {
  private readonly logger = new Logger(SubscriptionScheduler.name);

  constructor(private prisma: PrismaService) {}

  // Har kuni ertalab soat 9:00 da tekshiradi
  @Cron('0 9 * * *')
  async checkExpiringSubscriptions() {
    this.logger.log('Obuna muddatlari tekshirilmoqda...');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = new Date(tomorrow.setHours(0, 0, 0, 0));
    const tomorrowEnd   = new Date(tomorrow.setHours(23, 59, 59, 999));

    // Ertaga tugaydigan obunali do'konlar
    const stores = await this.prisma.store.findMany({
      where: {
        subscriptionEndsAt: { gte: tomorrowStart, lte: tomorrowEnd },
        isActive: true,
      },
      include: {
        users: {
          where: { role: 'ROP', isActive: true },
          select: { id: true, name: true },
        },
      },
    });

    if (stores.length === 0) {
      this.logger.log('Ertaga tugunadigan obuna yo\'q.');
      return;
    }

    // Bugun allaqachon xabar yuborilganmi?
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    for (const store of stores) {
      const endDate = store.subscriptionEndsAt!;
      const dateStr = `${String(endDate.getDate()).padStart(2,'0')}.${String(endDate.getMonth()+1).padStart(2,'0')}.${endDate.getFullYear()}`;

      // Bugun bu do'kon uchun xabar yuborilganmi tekshiramiz
      const alreadySent = await this.prisma.notifications.findFirst({
        where: {
          title: { contains: store.name },
          createdAt: { gte: todayStart },
        },
      });

      if (alreadySent) {
        this.logger.log(`"${store.name}" uchun xabar bugun allaqachon yuborilgan, o'tkazib yuborildi.`);
        continue;
      }

      for (const rop of store.users) {
        const notifId = `notif_sub_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
        const superAdmin = await this.prisma.user.findFirst({
          where: { role: 'SUPER_ADMIN' },
          select: { id: true },
        });

        if (!superAdmin) continue;

        await this.prisma.notifications.create({
          data: {
            id: notifId,
            senderId: superAdmin.id,
            title: `"${store.name}" obuna muddati tugashi haqida`,
            body: this.buildMessage(rop.name, store.name, dateStr),
            target: 'ROP',
          },
        });

        this.logger.log(`Xabar yuborildi: ${rop.name} → "${store.name}" (${dateStr})`);
      }
    }
  }

  private buildMessage(ropName: string, storeName: string, endDate: string): string {
    return (
      `Hurmatli ${ropName},\n\n` +
      `"${storeName}" do'koningizning My Santex tizimidagi obuna muddati ${endDate} kuni tugaydi.\n\n` +
      `Xizmatdan uzluksiz foydalanishni davom ettirish uchun obunangizni ` +
      `muddatidan oldin yangilashingizni so'raymiz.\n\n` +
      `Obunani yangilash uchun tizim administratori bilan bog'laning.\n\n` +
      `Hurmat bilan,\nMy Santex tizimi`
    );
  }
}
