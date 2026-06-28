import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/sale.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('date') date?: string,
    @Query('userId') userId?: string,
    @Query('receiptNo') receiptNo?: string,
    @Query('paymentMethod') paymentMethod?: string,
  ) {
    return this.salesService.findAll(user.storeId, { date, userId, receiptNo, paymentMethod });
  }

  @Get('stats')
  getStats(@CurrentUser() user: any) {
    return this.salesService.getDailyStats(user.storeId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.salesService.findOne(id, user.storeId);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateSaleDto) {
    return this.salesService.create(user.storeId, user.id, dto);
  }
}
