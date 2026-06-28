import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrinterService } from '../printer/printer.service';
import { CreateSaleDto } from './dto/sale.dto';
import { PaymentMethod, SaleStatus } from '@prisma/client';

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private printer: PrinterService,
  ) {}

  async create(storeId: string, userId: string, dto: CreateSaleDto) {
    const productIds = dto.items.map(i => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, storeId, isActive: true },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('Bir yoki bir nechta tovar topilmadi');
    }

    for (const item of dto.items) {
      const product = products.find(p => p.id === item.productId)!;
      if (Number(product.stock) < item.quantity) {
        throw new BadRequestException(
          `"${product.name}" mahsulotidan yetarli miqdor yo'q. Mavjud: ${product.stock}`,
        );
      }
    }

    const itemsTotal = dto.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const totalAmount = itemsTotal - (dto.discountAmount || 0);

    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          storeId,
          userId,
          totalAmount,
          discountAmount: dto.discountAmount || 0,
          paymentMethod: dto.paymentMethod || PaymentMethod.CASH,
          customerName: dto.customerName,
          notes: dto.notes,
          items: {
            create: dto.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.unitPrice * item.quantity,
            })),
          },
        },
        include: { items: { include: { product: true } }, user: { select: { name: true } }, store: true },
      });

      for (const item of dto.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return sale;
    }).then(async (sale) => {
      // Printer - xato bo'lsa ham sotuvga ta'sir qilmaydi
      const store = await this.prisma.store.findUnique({ where: { id: storeId } });
      const subtotal = dto.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

      this.printer.printReceipt({
        receiptNo:    sale.receiptNo,
        storeName:    store?.name || 'Do\'kon',
        storePhone:   store?.phone,
        storeAddress: store?.address,
        cashierName:  sale.user.name,
        items: sale.items.map(i => ({
          name:       i.product.name,
          quantity:   Number(i.quantity),
          unitPrice:  Number(i.unitPrice),
          totalPrice: Number(i.totalPrice),
        })),
        subtotal,
        discount:       Number(dto.discountAmount || 0),
        total:          Number(sale.totalAmount),
        paymentMethod:  sale.paymentMethod,
        customerName:   sale.customerName,
        createdAt:      sale.createdAt,
      }); // intentionally not awaited - fire and forget

      return sale;
    });
  }

  async findAll(storeId: string, query?: { date?: string; userId?: string; receiptNo?: string; paymentMethod?: string }) {
    const where: any = { storeId };
    if (query?.userId) where.userId = query.userId;
    if (query?.paymentMethod) where.paymentMethod = query.paymentMethod;
    if (query?.receiptNo) {
      const n = parseInt(query.receiptNo, 10);
      if (!isNaN(n)) where.receiptNo = n;
    }
    if (query?.date) {
      const day = new Date(query.date);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      where.createdAt = { gte: day, lt: next };
    }

    return this.prisma.sale.findMany({
      where,
      include: {
        items: { include: { product: { select: { id: true, name: true, unit: true } } } },
        user: { select: { id: true, name: true } },
        store: { select: { id: true, name: true, phone: true, address: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async findOne(id: string, storeId: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, storeId },
      include: {
        items: { include: { product: { select: { id: true, name: true, unit: true } } } },
        user: { select: { id: true, name: true } },
        store: { select: { id: true, name: true, phone: true, address: true } },
      },
    });
    if (!sale) throw new NotFoundException('Sotuv topilmadi');
    return sale;
  }

  async getDailyStats(storeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayStats, weekStats, topProducts] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { storeId, status: SaleStatus.COMPLETED, createdAt: { gte: today, lt: tomorrow } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      this.prisma.sale.aggregate({
        where: {
          storeId,
          status: SaleStatus.COMPLETED,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
      this.prisma.saleItem.groupBy({
        by: ['productId'],
        where: { sale: { storeId, createdAt: { gte: today, lt: tomorrow } } },
        _sum: { quantity: true, totalPrice: true },
        orderBy: { _sum: { totalPrice: 'desc' } },
        take: 5,
      }),
    ]);

    const topProductDetails = await this.prisma.product.findMany({
      where: { id: { in: topProducts.map(p => p.productId) } },
      select: { id: true, name: true },
    });

    return {
      today: {
        revenue: todayStats._sum.totalAmount || 0,
        salesCount: todayStats._count,
      },
      week: {
        revenue: weekStats._sum.totalAmount || 0,
        salesCount: weekStats._count,
      },
      topProducts: topProducts.map(p => ({
        ...p,
        product: topProductDetails.find(d => d.id === p.productId),
      })),
    };
  }
}
