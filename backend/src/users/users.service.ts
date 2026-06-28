import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAllByStore(storeId: string) {
    return this.prisma.user.findMany({
      where: { storeId },
      select: {
        id: true, name: true, email: true, phone: true,
        role: true, isActive: true, createdAt: true, avatarUrl: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Super Admin: barcha foydalanuvchilarning PIN larini ko'rish
  async findAllWithPins() {
    return this.prisma.user.findMany({
      select: {
        id: true, name: true, phone: true, role: true,
        isActive: true, pin: true, storeId: true,
        store: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(callerStoreId: string | null, dto: CreateUserDto, creatorRole: UserRole) {
    if (dto.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin yaratishga ruxsat yo\'q');
    }
    if (dto.role === UserRole.ROP && creatorRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('ROP faqat super admin tomonidan yaratilishi mumkin');
    }

    // Super Admin boshqa do'kon uchun yaratganda dto.storeId ishlatiladi
    const storeId = creatorRole === UserRole.SUPER_ADMIN && dto.storeId
      ? dto.storeId
      : callerStoreId;

    const existing = await this.prisma.user.findUnique({ where: { pin: dto.pin } });
    if (existing) throw new ConflictException('Bu PIN allaqachon band');

    const user = await this.prisma.user.create({
      data: {
        storeId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        pin: dto.pin,
        role: dto.role || UserRole.SALES_MANAGER,
      },
    });

    const { pin: _, faceDescriptor: __, ...result } = user;
    return result;
  }

  async toggleActive(id: string, storeId: string) {
    const user = await this.prisma.user.findFirst({ where: { id, storeId } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    return this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, isActive: true },
    });
  }

  async update(id: string, storeId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({ where: { id, storeId } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    const data: any = { name: dto.name, phone: dto.phone };
    if (dto.pin) data.pin = dto.pin;

    const updated = await this.prisma.user.update({ where: { id }, data });
    const { pin: _, faceDescriptor: __, ...result } = updated;
    return result;
  }
}
