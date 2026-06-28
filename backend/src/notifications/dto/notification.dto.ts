import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class CreateNotificationDto {
  @IsString() @IsNotEmpty()
  title: string;

  @IsString() @IsNotEmpty()
  body: string;

  @IsIn(['ALL', 'ROP', 'SALES_MANAGER'])
  target: string;
}
