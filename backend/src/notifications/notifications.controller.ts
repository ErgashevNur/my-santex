import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, Req, Sse, MessageEvent,
  UseGuards, UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import type { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { SubscriptionScheduler } from './subscription.scheduler';
import { CreateNotificationDto } from './dto/notification.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(
    private service: NotificationsService,
    private scheduler: SubscriptionScheduler,
  ) {}

  // Faqat dev/test uchun — scheduler ni qo'lda ishga tushirish
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post('trigger-subscription-check')
  async triggerCheck() {
    await this.scheduler.checkExpiringSubscriptions();
    return { ok: true };
  }

  // SSE — token query param orqali, JwtAuthGuard ishlatilmaydi
  @Sse('stream')
  stream(@Query('token') token: string, @Req() req: Request): Observable<MessageEvent> {
    if (!token) throw new UnauthorizedException();
    try {
      const secret = process.env.JWT_SECRET || 'my-santex-super-secret-jwt-key-2024';
      const payload: any = jwt.verify(token, secret);
      const { obs, close } = this.service.subscribe(String(payload.sub), String(payload.role));
      (req as any).on('close', close);
      return obs;
    } catch {
      throw new UnauthorizedException();
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Get('admin')
  findAllForAdmin() {
    return this.service.findAllForAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateNotificationDto) {
    return this.service.create(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: any) {
    return this.service.getUnreadCount(user.id, user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findForUser(@CurrentUser() user: any) {
    return this.service.findForUser(user.id, user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('read-all/mark')
  markAllRead(@CurrentUser() user: any) {
    return this.service.markAllRead(user.id, user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.markAsRead(id, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
