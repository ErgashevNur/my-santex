import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DebtTxType } from '@prisma/client';
import { CreateDebtorDto, AddDebtDto, AddPaymentDto } from './dto/debtor.dto';

@Injectable()
export class DebtorsService {
  constructor(private prisma: PrismaService) {}

  findAll(storeId: string) {
    return this.prisma.debtor.findMany({
      where: { storeId },
      orderBy: { totalDebt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        totalDebt: true,
        createdAt: true,
        _count: { select: { transactions: true } },
      },
    });
  }

  async findOne(id: string, storeId: string) {
    const debtor = await this.prisma.debtor.findFirst({
      where: { id, storeId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!debtor) throw new NotFoundException('Qarzdor topilmadi');
    return debtor;
  }

  create(storeId: string, dto: CreateDebtorDto) {
    return this.prisma.debtor.create({
      data: { storeId, name: dto.name, phone: dto.phone },
    });
  }

  async delete(id: string, storeId: string) {
    await this.findOne(id, storeId);
    return this.prisma.debtor.delete({ where: { id } });
  }

  async addDebt(id: string, storeId: string, dto: AddDebtDto) {
    await this.findOne(id, storeId);
    return this.prisma.$transaction([
      this.prisma.debtTransaction.create({
        data: {
          storeId,
          debtorId: id,
          type: DebtTxType.DEBT,
          amount: dto.amount,
          note: dto.note,
        },
      }),
      this.prisma.debtor.update({
        where: { id },
        data: { totalDebt: { increment: dto.amount } },
      }),
    ]);
  }

  async addPayment(id: string, storeId: string, dto: AddPaymentDto) {
    const debtor = await this.findOne(id, storeId);
    if (Number(debtor.totalDebt) < dto.amount) {
      throw new BadRequestException(
        `To'lov qarz miqdoridan oshib ketmoqda (qarz: ${Number(debtor.totalDebt)})`,
      );
    }
    return this.prisma.$transaction([
      this.prisma.debtTransaction.create({
        data: {
          storeId,
          debtorId: id,
          type: DebtTxType.PAYMENT,
          amount: dto.amount,
          note: dto.note,
        },
      }),
      this.prisma.debtor.update({
        where: { id },
        data: { totalDebt: { decrement: dto.amount } },
      }),
    ]);
  }

  summary(storeId: string) {
    return this.prisma.debtor.aggregate({
      where: { storeId },
      _sum: { totalDebt: true },
      _count: { id: true },
    });
  }
}
