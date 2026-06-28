import { IsString, IsEmail, IsOptional, IsEnum, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ description: '8 xonalik PIN', example: '12345678' })
  @IsString()
  @Length(8, 8)
  pin: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  // Super Admin boshqa do'kon uchun user yaratganda
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storeId?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: '8 xonalik yangi PIN' })
  @IsOptional()
  @IsString()
  @Length(8, 8)
  pin?: string;
}
