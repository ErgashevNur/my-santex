import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(storeId: string) {
    return this.prisma.category.findMany({
      where: { storeId },
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(storeId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: { storeId, ...dto },
    });
  }

  async update(id: string, storeId: string, dto: CreateCategoryDto) {
    const cat = await this.prisma.category.findFirst({ where: { id, storeId } });
    if (!cat) throw new NotFoundException('Kategoriya topilmadi');
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string, storeId: string) {
    const cat = await this.prisma.category.findFirst({ where: { id, storeId } });
    if (!cat) throw new NotFoundException('Kategoriya topilmadi');
    return this.prisma.category.delete({ where: { id } });
  }
}
