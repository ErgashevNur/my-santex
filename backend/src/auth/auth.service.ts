import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, EnrollFaceDto, FaceVerifyDto } from './dto/login.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { pin: dto.pin },
      include: { store: true },
    });

    if (!user) throw new UnauthorizedException("PIN noto'g'ri");
    if (!user.isActive)
      throw new ForbiddenException('Foydalanuvchi bloklangan');

    if (user.role === UserRole.SUPER_ADMIN) {
      if (!user.faceEnrolled) {
        // Yuz hali ro'yxatga olinmagan — setup kerak
        return { requireSetup: true, userId: user.id };
      }
      // Yuz saqlangan — tekshirish kerak
      return { requireFaceVerification: true, userId: user.id };
    }

    if (user.store && !user.store.isActive) {
      throw new ForbiddenException(
        "Do'kon obunasi bloklangan. Administrator bilan bog'laning.",
      );
    }

    const token = this.jwt.sign({
      sub: user.id,
      role: user.role,
      storeId: user.storeId,
    });

    const {
      pin: _pin,
      faceDescriptor: _fd,
      faceEnrolled: _fe,
      ...userOut
    } = user;
    return { token, user: userOut };
  }

  // Faqat bir marta: yuzni saqlash (faceEnrolled = false bo'lganda)
  async enrollFace(dto: EnrollFaceDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      include: { store: true },
    });

    if (!user || user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException("Ruxsat yo'q");
    }
    if (user.faceEnrolled) {
      throw new ForbiddenException(
        "Yuz allaqachon ro'yxatga olingan. Setup qayta ishlatib bo'lmaydi.",
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        faceDescriptor: JSON.stringify(dto.faceDescriptor),
        faceEnrolled: true,
      },
    });

    const token = this.jwt.sign({
      sub: user.id,
      role: user.role,
      storeId: user.storeId,
    });

    const {
      pin: _pin,
      faceDescriptor: _fd,
      faceEnrolled: _fe,
      ...userOut
    } = user;
    return { token, user: { ...userOut, faceEnrolled: true } };
  }

  // Har safar login paytida yuz tekshirish
  async verifyFace(dto: FaceVerifyDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      include: { store: true },
    });

    if (!user || user.role !== UserRole.SUPER_ADMIN) {
      throw new UnauthorizedException("Ruxsat yo'q");
    }
    if (!user.faceEnrolled || !user.faceDescriptor) {
      throw new ForbiddenException(
        "Avval /setup sahifasidan yuzingizni ro'yxatga oling",
      );
    }
    if (!dto.faceDescriptor || dto.faceDescriptor.length === 0) {
      throw new ForbiddenException("Yuz ma'lumoti yuborilmadi");
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const saved: number[] = JSON.parse(user.faceDescriptor);
    if (saved.length < 128 || dto.faceDescriptor.length < 128) {
      throw new ForbiddenException("Yuz ma'lumoti noto'g'ri format");
    }
    const dist = this.euclidean(saved, dto.faceDescriptor);
    if (dist > 0.6) {
      throw new ForbiddenException("Yuz tasdiqlanmadi. Qayta urinib ko'ring.");
    }

    const token = this.jwt.sign({
      sub: user.id,
      role: user.role,
      storeId: user.storeId,
    });

    const {
      pin: _pin,
      faceDescriptor: _fd,
      faceEnrolled: _fe,
      ...userOut
    } = user;
    return { token, user: userOut };
  }

  private euclidean(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      sum += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sum);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { store: true },
    });
    if (!user) throw new UnauthorizedException();

    const { pin: _pin, faceDescriptor: _fd, faceEnrolled: _fe, ...rest } = user;
    return rest;
  }
}
