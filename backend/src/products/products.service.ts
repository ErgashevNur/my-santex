import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProductDto,
  UpdateProductDto,
  AddStockDto,
} from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    storeId: string,
    query?: { search?: string; categoryId?: string; lowStock?: string },
  ) {
    const where: Prisma.ProductWhereInput = { storeId, isActive: true };

    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { barcode: { contains: query.search } },
      ];
    }
    if (query?.categoryId) {
      where.categoryId = query.categoryId;
    }

    const products = await this.prisma.product.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });

    if (query?.lowStock === 'true') {
      return products.filter((p) => Number(p.stock) <= Number(p.minStock));
    }
    return products;
  }

  async findByBarcode(storeId: string, barcode: string) {
    const product = await this.prisma.product.findFirst({
      where: { storeId, barcode, isActive: true },
    });
    if (!product) throw new NotFoundException('Tovar topilmadi');
    return product;
  }

  async create(storeId: string, dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        storeId,
        name: dto.name,
        barcode: dto.barcode,
        categoryId: dto.categoryId,
        unit: dto.unit,
        costPrice: dto.costPrice,
        sellPrice: dto.sellPrice,
        stock: dto.stock ?? 0,
        minStock: dto.minStock ?? 5,
        description: dto.description,
        imageUrl: dto.imageUrl,
      },
    });
  }

  async update(id: string, storeId: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findFirst({
      where: { id, storeId },
    });
    if (!product) throw new NotFoundException('Tovar topilmadi');
    return this.prisma.product.update({
      where: { id },
      data: dto,
    });
  }

  async addStock(id: string, storeId: string, dto: AddStockDto) {
    const product = await this.prisma.product.findFirst({
      where: { id, storeId },
    });
    if (!product) throw new NotFoundException('Tovar topilmadi');
    return this.prisma.product.update({
      where: { id },
      data: { stock: { increment: dto.quantity } },
    });
  }

  async remove(id: string, storeId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, storeId },
    });
    if (!product) throw new NotFoundException('Tovar topilmadi');
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
