import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DebtorsService } from './debtors.service';
import { CreateDebtorDto, UpdateDebtorDto, AddDebtDto, AddPaymentDto } from './dto/debtor.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/interfaces/jwt-user.interface';

@ApiTags('Debtors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('debtors')
export class DebtorsController {
  constructor(private service: DebtorsService) {}

  @Get()
  findAll(@CurrentUser() user: JwtUser) {
    return this.service.findAll(user.storeId ?? '');
  }

  @Get('summary')
  summary(@CurrentUser() user: JwtUser) {
    return this.service.summary(user.storeId ?? '');
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.findOne(id, user.storeId ?? '');
  }

  @Post()
  create(@Body() dto: CreateDebtorDto, @CurrentUser() user: JwtUser) {
    return this.service.create(user.storeId ?? '', dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDebtorDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.update(id, user.storeId ?? '', dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.delete(id, user.storeId ?? '');
  }

  @Post(':id/debt')
  addDebt(
    @Param('id') id: string,
    @Body() dto: AddDebtDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.addDebt(id, user.storeId ?? '', user.id, dto);
  }

  @Post(':id/payment')
  addPayment(
    @Param('id') id: string,
    @Body() dto: AddPaymentDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.addPayment(id, user.storeId ?? '', user.id, dto);
  }
}
