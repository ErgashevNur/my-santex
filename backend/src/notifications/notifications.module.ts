import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { SubscriptionScheduler } from './subscription.scheduler';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, SubscriptionScheduler],
})
export class NotificationsModule {}
