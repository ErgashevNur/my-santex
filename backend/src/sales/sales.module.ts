import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { PrinterModule } from '../printer/printer.module';

@Module({
  imports: [PrinterModule],
  providers: [SalesService],
  controllers: [SalesController],
})
export class SalesModule {}
