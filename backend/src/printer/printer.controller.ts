import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrinterService } from './printer.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Printer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('printer')
export class PrinterController {
  constructor(
    private printer: PrinterService,
    private prisma: PrismaService,
  ) {}

  @Get('scan')
  async scan() {
    const usbDevices = this.printer.scanUSB();
    const foundUsb = Object.entries(usbDevices).find(
      ([, v]) => v === 'TOPILDI',
    )?.[0];

    const ip = process.env.PRINTER_IP || '192.168.1.27';
    const ports = await this.printer.scanPorts(ip);
    const openPort = Object.entries(ports).find(([, v]) => v === 'OPEN')?.[0];

    return {
      usb: {
        devices: usbDevices,
        found: foundUsb || null,
        status: foundUsb ? 'TOPILDI' : 'TOPILMADI',
      },
      network: {
        ip,
        ports,
        openPort: openPort ? Number(openPort) : null,
        status: openPort ? 'TOPILDI' : 'TOPILMADI',
      },
      hint: foundUsb
        ? `USB printer topildi: ${foundUsb}`
        : openPort
          ? `Tarmoq orqali port ${openPort} ochiq! .env ga PRINTER_PORT=${openPort} yozing`
          : `Printer topilmadi. USB kabelni va PRINTER_MODE ni tekshiring.`,
    };
  }

  @Post('test')
  async test() {
    const result = await this.printer.printTestPage();
    return result;
  }

  @Post('reprint/:saleId')
  async reprint(@Param('saleId') saleId: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        store: true,
        user: { select: { name: true } },
        items: { include: { product: { select: { name: true } } } },
      },
    });
    if (!sale) return { error: 'Sotuv topilmadi' };

    const subtotal = sale.items.reduce(
      (s, i) => s + Number(i.unitPrice) * Number(i.quantity),
      0,
    );
    const result = await this.printer.printReceipt({
      receiptNo: sale.receiptNo,
      storeName: sale.store.name,
      storePhone: sale.store.phone,
      storeAddress: sale.store.address,
      cashierName: sale.user.name,
      items: sale.items.map((i) => ({
        name: i.product.name,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
      })),
      subtotal,
      discount: Number(sale.discountAmount),
      total: Number(sale.totalAmount),
      paymentMethod: sale.paymentMethod,
      customerName: sale.customerName,
      createdAt: sale.createdAt,
    });
    return result;
  }
}
