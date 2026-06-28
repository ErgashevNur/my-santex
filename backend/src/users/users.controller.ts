import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Roles(UserRole.ROP, UserRole.SUPER_ADMIN)
  @Get()
  findAll(@CurrentUser() user: any, @Query('storeId') storeId?: string) {
    // Super Admin: query param bilan istalgan do'kon xodimlarini ko'ra oladi
    const targetStore = user.role === UserRole.SUPER_ADMIN && storeId ? storeId : user.storeId;
    return this.usersService.findAllByStore(targetStore);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get('pins')
  findAllWithPins() {
    return this.usersService.findAllWithPins();
  }

  @Roles(UserRole.ROP, UserRole.SUPER_ADMIN)
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateUserDto) {
    return this.usersService.create(user.storeId, dto, user.role);
  }

  @Roles(UserRole.ROP, UserRole.SUPER_ADMIN)
  @Patch(':id/toggle-active')
  toggleActive(@CurrentUser() user: any, @Param('id') id: string) {
    return this.usersService.toggleActive(id, user.storeId);
  }

  @Roles(UserRole.ROP, UserRole.SUPER_ADMIN)
  @Patch(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, user.storeId, dto);
  }
}
