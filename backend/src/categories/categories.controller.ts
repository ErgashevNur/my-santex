import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/category.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/interfaces/jwt-user.interface';
import { UserRole } from '@prisma/client';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  findAll(@CurrentUser() user: JwtUser) {
    return this.categoriesService.findAll(user.storeId ?? '');
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ROP, UserRole.SUPER_ADMIN)
  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(user.storeId ?? '', dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ROP, UserRole.SUPER_ADMIN)
  @Put(':id')
  update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoriesService.update(id, user.storeId ?? '', dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ROP, UserRole.SUPER_ADMIN)
  @Delete(':id')
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.categoriesService.remove(id, user.storeId ?? '');
  }
}
