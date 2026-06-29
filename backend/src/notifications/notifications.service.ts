import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { MessageEvent } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/notification.dto';

interface Client {
  role: string;
  subject: Subject<MessageEvent>;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  // SSE — ulangan clientlar
  private clients = new Map<string, Client>();

  subscribe(
    userId: string,
    role: string,
  ): { obs: Observable<MessageEvent>; close: () => void } {
    const subject = new Subject<MessageEvent>();
    this.clients.set(userId, { role, subject });
    return {
      obs: subject.asObservable(),
      close: () => {
        subject.complete();
        this.clients.delete(userId);
      },
    };
  }

  private push(target: string, data: object) {
    for (const [, client] of this.clients) {
      if (target === 'ALL' || target === client.role) {
        client.subject.next({ data });
      }
    }
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async create(senderId: string, dto: CreateNotificationDto) {
    const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const n = await this.prisma.notifications.create({
      data: {
        id,
        senderId,
        title: dto.title,
        body: dto.body,
        target: dto.target,
      },
      select: {
        id: true,
        title: true,
        body: true,
        target: true,
        createdAt: true,
      },
    });
    // SSE orqali real-time yuborish
    this.push(dto.target, n);
    return n;
  }

  async findForUser(userId: string, userRole: string) {
    const list = await this.prisma.notifications.findMany({
      where: { OR: [{ target: 'ALL' }, { target: userRole }] },
      include: {
        users: { select: { name: true } },
        notification_reads: { where: { userId }, select: { readAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return list.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      target: n.target,
      createdAt: n.createdAt,
      senderName: n.users.name,
      isRead: n.notification_reads.length > 0,
      readAt: n.notification_reads[0]?.readAt ?? null,
    }));
  }

  async getUnreadCount(userId: string, userRole: string) {
    const count = await this.prisma.notifications.count({
      where: {
        OR: [{ target: 'ALL' }, { target: userRole }],
        notification_reads: { none: { userId } },
      },
    });
    return { count };
  }

  async markAsRead(notificationId: string, userId: string) {
    await this.prisma.notification_reads.upsert({
      where: { notificationId_userId: { notificationId, userId } },
      create: { notificationId, userId },
      update: {},
    });
    return { ok: true };
  }

  async markAllRead(userId: string, userRole: string) {
    const unread = await this.prisma.notifications.findMany({
      where: {
        OR: [{ target: 'ALL' }, { target: userRole }],
        notification_reads: { none: { userId } },
      },
      select: { id: true },
    });
    if (unread.length === 0) return { marked: 0 };
    await this.prisma.notification_reads.createMany({
      data: unread.map((n) => ({ notificationId: n.id, userId })),
      skipDuplicates: true,
    });
    return { marked: unread.length };
  }

  async findAllForAdmin() {
    const list = await this.prisma.notifications.findMany({
      include: {
        users: { select: { name: true } },
        _count: { select: { notification_reads: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return list.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      target: n.target,
      createdAt: n.createdAt,
      senderName: n.users.name,
      readCount: n._count.notification_reads,
    }));
  }

  async delete(id: string) {
    await this.prisma.notifications.delete({ where: { id } });
    return { ok: true };
  }
}
