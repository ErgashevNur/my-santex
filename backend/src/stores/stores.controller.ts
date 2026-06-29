import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { StoresService } from './stores.service';
import {
  CreateStoreDto,
  UpdateSubscriptionDto,
  CreateSubscriptionPaymentDto,
} from './dto/store.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Stores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('stores')
export class StoresController {
  constructor(private storesService: StoresService) {}

  @Get()
  findAll() {
    return this.storesService.findAll();
  }

  @Get('dashboard')
  getDashboard() {
    return this.storesService.getDashboardStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.storesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateStoreDto) {
    return this.storesService.create(dto);
  }

  @Patch(':id/subscription')
  updateSubscription(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.storesService.updateSubscription(id, dto);
  }

  @Post(':id/payments')
  addPayment(
    @Param('id') id: string,
    @Body() dto: CreateSubscriptionPaymentDto,
  ) {
    return this.storesService.addPayment(id, dto);
  }
}
