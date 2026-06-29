import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateStoreDto,
  UpdateSubscriptionDto,
  CreateSubscriptionPaymentDto,
} from './dto/store.dto';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class StoresService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.store.findMany({
      include: {
        _count: { select: { users: true, products: true, sales: true } },
        payments: { orderBy: { paidAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
        _count: { select: { products: true, sales: true } },
        payments: { orderBy: { paidAt: 'desc' }, take: 5 },
      },
    });
    if (!store) throw new NotFoundException("Do'kon topilmadi");
    return store;
  }

  async create(dto: CreateStoreDto) {
    return this.prisma.store.create({ data: dto });
  }

  async updateSubscription(id: string, dto: UpdateSubscriptionDto) {
    return this.prisma.store.update({
      where: { id },
      data: {
        subscriptionStatus: dto.status,
        subscriptionEndsAt: dto.subscriptionEndsAt
          ? new Date(dto.subscriptionEndsAt)
          : undefined,
        isActive:
          dto.status === SubscriptionStatus.ACTIVE ||
          dto.status === SubscriptionStatus.TRIAL,
      },
    });
  }

  async addPayment(storeId: string, dto: CreateSubscriptionPaymentDto) {
    const payment = await this.prisma.subscriptionPayment.create({
      data: {
        storeId,
        amount: dto.amount,
        validFrom: new Date(dto.validFrom),
        validTo: new Date(dto.validTo),
        notes: dto.notes,
      },
    });

    await this.prisma.store.update({
      where: { id: storeId },
      data: {
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        subscriptionEndsAt: new Date(dto.validTo),
        isActive: true,
      },
    });

    return payment;
  }

  async getDashboardStats() {
    const [totalStores, activeStores, expiredStores, totalRevenue] =
      await Promise.all([
        this.prisma.store.count(),
        this.prisma.store.count({ where: { subscriptionStatus: 'ACTIVE' } }),
        this.prisma.store.count({ where: { subscriptionStatus: 'EXPIRED' } }),
        this.prisma.subscriptionPayment.aggregate({ _sum: { amount: true } }),
      ]);

    return {
      totalStores,
      activeStores,
      expiredStores,
      totalRevenue: totalRevenue._sum.amount || 0,
    };
  }
}
