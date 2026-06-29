import {
  IsString,
  Length,
  IsArray,
  IsNumber,
  IsOptional,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: '12627885', description: '8 xonalik PIN' })
  @IsString()
  @Length(8, 8)
  pin: string;
}

export class EnrollFaceDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty({ type: [Number], minLength: 128 })
  @IsArray()
  @ArrayMinSize(128)
  @IsNumber({}, { each: true })
  faceDescriptor: number[];
}

export class FaceVerifyDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  faceDescriptor?: number[];
}
