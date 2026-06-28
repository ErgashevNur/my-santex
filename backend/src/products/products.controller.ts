import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, AddStockDto } from './dto/product.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'lowStock', required: false })
  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('lowStock') lowStock?: string,
  ) {
    return this.productsService.findAll(user.storeId, { search, categoryId, lowStock });
  }

  @Get('barcode/:barcode')
  findByBarcode(@CurrentUser() user: any, @Param('barcode') barcode: string) {
    return this.productsService.findByBarcode(user.storeId, barcode);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ROP, UserRole.SUPER_ADMIN, UserRole.SALES_MANAGER)
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateProductDto) {
    return this.productsService.create(user.storeId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ROP, UserRole.SUPER_ADMIN, UserRole.SALES_MANAGER)
  @Put(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, user.storeId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ROP, UserRole.SUPER_ADMIN, UserRole.SALES_MANAGER)
  @Patch(':id/stock')
  addStock(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: AddStockDto) {
    return this.productsService.addStock(id, user.storeId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ROP, UserRole.SUPER_ADMIN, UserRole.SALES_MANAGER)
  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.productsService.remove(id, user.storeId);
  }
}
