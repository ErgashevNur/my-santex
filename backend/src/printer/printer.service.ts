import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as net from 'net';
import * as fs from 'fs';
import * as fsp from 'fs/promises';

export interface ReceiptData {
  receiptNo: number;
  storeName: string;
  storePhone?: string | null;
  storeAddress?: string | null;
  cashierName: string;
  items: { name: string; quantity: number; unitPrice: number; totalPrice: number }[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  customerName?: string | null;
  createdAt: Date;
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Naqd pul',
  CARD: 'Plastik karta',
  TRANSFER: "Bank o'tkazma",
  INSTALLMENT: "Muddatli to'lov",
};

// Keng tarqalgan thermal printer portlar
const COMMON_PORTS = [9100, 9101, 515, 631, 8080, 10001, 6101];

// Linuxda USB termal printer odatda shu nomlar bilan chiqadi
const USB_DEVICE_CANDIDATES = ['/dev/usb/lp0', '/dev/usb/lp1', '/dev/usb/lp2', '/dev/usb/lp3'];

@Injectable()
export class PrinterService {
  private readonly logger = new Logger(PrinterService.name);
  private cachedPort: number | null = null;

  constructor(private config: ConfigService) {}

  private getMode(): 'USB' | 'NETWORK' {
    return this.config.get<string>('PRINTER_MODE', 'USB').toUpperCase() === 'NETWORK'
      ? 'NETWORK'
      : 'USB';
  }

  async printReceipt(data: ReceiptData): Promise<{ success: boolean; port?: number; device?: string; error?: string }> {
    const buf = this.buildReceipt(data);
    return this.send(buf);
  }

  async printTestPage(): Promise<{ success: boolean; port?: number; device?: string; error?: string }> {
    const W  = this.config.get<number>('PRINTER_WIDTH', 48);
    const ESC = '\x1B'; const GS = '\x1D';
    let t = `${ESC}\x40${ESC}\x61\x01`;
    t += '='.repeat(W) + '\n';
    t += 'MY SANTEX - TEST CHEK\n';
    t += new Date().toLocaleString('uz-UZ') + '\n';
    t += '='.repeat(W) + '\n';
    t += 'Printer ishlayapti!\n\n\n';
    t += `${GS}\x56\x41\x05`;
    return this.send(Buffer.from(t, 'latin1'));
  }

  private async send(buf: Buffer): Promise<{ success: boolean; port?: number; device?: string; error?: string }> {
    if (this.getMode() === 'USB') {
      return this.sendUSB(buf);
    }
    const ip = this.config.get<string>('PRINTER_IP', '192.168.1.27');
    return this.smartSend(ip, buf);
  }

  // USB kabel orqali to'g'ridan-to'g'ri /dev/usb/lpX ga yozadi
  private async sendUSB(buf: Buffer): Promise<{ success: boolean; device?: string; error?: string }> {
    const configured = this.config.get<string>('PRINTER_USB_PATH', '');
    const candidates = configured ? [configured] : USB_DEVICE_CANDIDATES;

    for (const devicePath of candidates) {
      try {
        await fsp.writeFile(devicePath, buf);
        this.logger.log(`Chek yuborildi → USB ${devicePath}`);
        return { success: true, device: devicePath };
      } catch (err) {
        this.logger.debug(`USB device ${devicePath} ishlamadi: ${(err as Error).message}`);
      }
    }

    this.logger.warn(`USB printer topilmadi (sinab ko'rilgan: ${candidates.join(', ')})`);
    return { success: false, error: `USB printer topilmadi: ${candidates.join(', ')}` };
  }

  // USB device mavjudligini tekshiradi (scan endpoint uchun)
  async scanUSB(): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    for (const devicePath of USB_DEVICE_CANDIDATES) {
      results[devicePath] = fs.existsSync(devicePath) ? 'TOPILDI' : 'YO\'Q';
    }
    return results;
  }

  // Portlarni auto-detect qiladi
  private async smartSend(ip: string, buf: Buffer): Promise<{ success: boolean; port?: number; error?: string }> {
    const cfgPort = this.config.get<number>('PRINTER_PORT', 9100);

    // Avval keshdan yoki config portdan sinab ko'r
    const tryFirst = this.cachedPort ?? cfgPort;
    const ok = await this.tryPort(ip, tryFirst, buf);
    if (ok) {
      this.cachedPort = tryFirst;
      this.logger.log(`Chek yuborildi → ${ip}:${tryFirst}`);
      return { success: true, port: tryFirst };
    }

    // Boshqa portlarni sinab ko'r
    const others = COMMON_PORTS.filter(p => p !== tryFirst);
    for (const port of others) {
      const r = await this.tryPort(ip, port, buf);
      if (r) {
        this.cachedPort = port;
        this.logger.log(`Chek yuborildi (auto-port ${port}) → ${ip}:${port}`);
        this.logger.warn(`→ .env ga qo'shing: PRINTER_PORT=${port}`);
        return { success: true, port };
      }
    }

    this.logger.warn(`Printer topilmadi: ${ip} (sinab ko'rilgan portlar: ${[tryFirst, ...others].join(', ')})`);
    return { success: false, error: `Printer ulanmadi: ${ip}` };
  }

  private tryPort(ip: string, port: number, buf: Buffer): Promise<boolean> {
    return new Promise((resolve) => {
      const client = new net.Socket();
      const timer = setTimeout(() => { client.destroy(); resolve(false); }, 3000);
      client.connect(port, ip, () => {
        client.write(buf, () => { clearTimeout(timer); client.destroy(); resolve(true); });
      });
      client.on('error', () => { clearTimeout(timer); resolve(false); });
    });
  }

  async scanPorts(ip: string): Promise<Record<number, string>> {
    const results: Record<number, string> = {};
    await Promise.all(
      COMMON_PORTS.map(async (port) => {
        const open = await this.checkPortOpen(ip, port);
        results[port] = open ? 'OPEN' : 'CLOSED';
      })
    );
    return results;
  }

  private checkPortOpen(ip: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const client = new net.Socket();
      const timer = setTimeout(() => { client.destroy(); resolve(false); }, 2000);
      client.connect(port, ip, () => { clearTimeout(timer); client.destroy(); resolve(true); });
      client.on('error', () => { clearTimeout(timer); resolve(false); });
    });
  }

  private buildReceipt(d: ReceiptData): Buffer {
    const W   = this.config.get<number>('PRINTER_WIDTH', 48);
    const ESC = '\x1B'; const GS = '\x1D';

    const bold1  = `${ESC}\x45\x01`;
    const bold0  = `${ESC}\x45\x00`;
    const dblH   = `${ESC}\x21\x10`;
    const normal = `${ESC}\x21\x00`;
    const alignL = `${ESC}\x61\x00`;
    const alignC = `${ESC}\x61\x01`;
    const LF = '\n';
    const sep  = '='.repeat(W);
    const dash = '-'.repeat(W);

    const money = (n: number | string) => {
      const v = typeof n === 'string' ? parseFloat(n) : n;
      return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' sum';
    };

    const pad2 = (n: number) => String(n).padStart(2, '0');
    const dt = new Date(d.createdAt);
    const dateStr = `${pad2(dt.getDate())}.${pad2(dt.getMonth()+1)}.${dt.getFullYear()}`;
    const timeStr = `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;

    let t = `${ESC}\x40`;

    // ── HEADER ──────────────────────────────
    t += alignC + bold1 + dblH;
    t += d.storeName + LF;
    t += normal + bold0;
    if (d.storeAddress) t += d.storeAddress + LF;
    if (d.storePhone)   t += 'Tel: ' + d.storePhone + LF;
    t += alignL + sep + LF;

    // ── CHEK MA'LUMOTLARI ───────────────────
    const receiptId = `#${String(d.receiptNo).padStart(4, '0')}`;
    t += `Chek   : ${bold1}${receiptId}${bold0}` + LF;
    t += `Sana   : ${dateStr} ${timeStr}` + LF;
    t += `Kassir : ${d.cashierName}` + LF;
    if (d.customerName) t += `Mijoz  : ${d.customerName}` + LF;

    // ── TOVARLAR (har biri alohida qatorda) ─
    d.items.forEach((item, idx) => {
      t += sep + LF;

      // Tovar nomi — bold
      const prefix = `${idx + 1}. `;
      const maxLen = W - prefix.length;
      const nm = item.name.length > maxLen
        ? item.name.slice(0, maxLen - 2) + '..'
        : item.name;
      t += bold1 + prefix + nm + bold0 + LF;

      // Miqdor x narx = jami (o'ngda jami summa)
      const left  = `   ${item.quantity} x ${money(item.unitPrice)}`;
      const right = money(item.totalPrice);
      const gap   = W - left.length - right.length;
      if (gap >= 1) {
        t += left + ' '.repeat(gap) + right + LF;
      } else {
        t += left + LF;
        t += '   = '.padEnd(W - right.length) + right + LF;
      }
    });

    // ── JAMI ───────────────────────────────
    t += sep + LF;
    const MW = 16;
    t += 'Jami:'.padEnd(W - MW) + money(d.subtotal).padStart(MW) + LF;
    if (d.discount > 0) {
      t += 'Chegirma:'.padEnd(W - MW) + ('-' + money(d.discount)).padStart(MW) + LF;
      t += dash + LF;
    }

    // TO'LASH — bold
    t += bold1;
    t += "TO'LASH:".padEnd(W - MW) + money(d.total).padStart(MW) + LF;
    t += bold0 + sep + LF;

    // ── TO'LOV TURI ────────────────────────
    t += `To'lov : ${bold1}${PAYMENT_LABELS[d.paymentMethod] || d.paymentMethod}${bold0}` + LF;
    t += sep + LF;
    t += alignC + bold1 + 'Xarid uchun rahmat!' + bold0 + LF;
    t += LF + LF + LF;
    t += `${GS}\x56\x41\x05`;

    return Buffer.from(t, 'latin1');
  }
}
