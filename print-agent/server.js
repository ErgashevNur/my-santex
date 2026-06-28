const express = require('express');
const cors = require('cors');
const fs = require('fs');
const fsp = require('fs/promises');
const { exec } = require('child_process');
const os = require('os');
const path = require('path');

const app = express();
const PORT = process.env.PRINT_AGENT_PORT || 5555;
const WIDTH = parseInt(process.env.PRINTER_WIDTH || '48', 10);
const IS_WINDOWS = os.platform() === 'win32';

const USB_CANDIDATES = ['/dev/usb/lp0', '/dev/usb/lp1', '/dev/usb/lp2', '/dev/usb/lp3'];

const PAYMENT_LABELS = {
  CASH: 'Naqd pul',
  CARD: 'Plastik karta',
  TRANSFER: "Bank o'tkazma",
  INSTALLMENT: "Muddatli to'lov",
};

app.use(cors());
app.use(express.json());

// ── Status ───────────────────────────────────────────────────────────────────
app.get('/status', (req, res) => {
  if (IS_WINDOWS) {
    const printerName = process.env.PRINTER_NAME || 'XP-80';
    return res.json({ ok: true, platform: 'windows', printer: printerName });
  }
  const devices = {};
  for (const d of USB_CANDIDATES) {
    devices[d] = fs.existsSync(d) ? 'TOPILDI' : "YO'Q";
  }
  const found = Object.entries(devices).find(([, v]) => v === 'TOPILDI')?.[0] || null;
  res.json({ ok: true, platform: 'linux', printer: found ? 'ULANGAN' : "ULANMAGAN", device: found, devices });
});

// ── Cut only ─────────────────────────────────────────────────────────────────
app.post('/cut', async (req, res) => {
  const GS = '\x1D';
  // 3 qator feed + partial cut
  const buf = Buffer.from('\n\n\n' + `${GS}\x56\x41\x00`, 'latin1');
  if (IS_WINDOWS) return sendWindows(buf, res);
  return sendLinux(buf, res);
});

// ── Print ────────────────────────────────────────────────────────────────────
app.post('/print', async (req, res) => {
  const sale = req.body;
  if (!sale || !sale.items) {
    return res.status(400).json({ ok: false, error: "Sale data yo'q" });
  }
  const buf = buildReceipt(sale);
  if (IS_WINDOWS) return sendWindows(buf, res);
  return sendLinux(buf, res);
});

// ── Windows: PowerShell P/Invoke orqali RAW ESC/POS ─────────────────────────
function sendWindows(buf, res) {
  const printerName = process.env.PRINTER_NAME || 'XP-80';
  const tmpFile = path.join(os.tmpdir(), `chek_${Date.now()}.prn`).replace(/\\/g, '\\\\');

  fs.writeFile(tmpFile.replace(/\\\\/g, '\\'), buf, (writeErr) => {
    if (writeErr) {
      console.error('[print-agent] Temp fayl xato:', writeErr.message);
      return res.status(500).json({ ok: false, error: writeErr.message });
    }

    // Windows Spooler API orqali RAW bytes yuborish (driver formatlamaydi)
    const ps = `
$bytes = [System.IO.File]::ReadAllBytes("${tmpFile}")
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class RawPrint {
  [DllImport("winspool.drv",CharSet=CharSet.Auto,SetLastError=true)]
  public static extern bool OpenPrinter(string n, out IntPtr h, IntPtr d);
  [DllImport("winspool.drv",CharSet=CharSet.Auto,SetLastError=true)]
  public static extern bool ClosePrinter(IntPtr h);
  [DllImport("winspool.drv",CharSet=CharSet.Auto,SetLastError=true)]
  public static extern int StartDocPrinter(IntPtr h, int lev, ref DOCINFO di);
  [DllImport("winspool.drv",CharSet=CharSet.Auto,SetLastError=true)]
  public static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.drv",CharSet=CharSet.Auto,SetLastError=true)]
  public static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.drv",CharSet=CharSet.Auto,SetLastError=true)]
  public static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.drv",CharSet=CharSet.Auto,SetLastError=true)]
  public static extern bool WritePrinter(IntPtr h,byte[] b,int c,out int w);
  [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Auto)]
  public struct DOCINFO {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }
}
'@
$h=[IntPtr]::Zero
[RawPrint]::OpenPrinter("${printerName}",[ref]$h,[IntPtr]::Zero)|Out-Null
$di=New-Object RawPrint+DOCINFO
$di.pDocName="Chek"
$di.pDataType="RAW"
[RawPrint]::StartDocPrinter($h,1,[ref]$di)|Out-Null
[RawPrint]::StartPagePrinter($h)|Out-Null
$w=0
[RawPrint]::WritePrinter($h,$bytes,$bytes.Length,[ref]$w)|Out-Null
[RawPrint]::EndPagePrinter($h)|Out-Null
[RawPrint]::EndDocPrinter($h)|Out-Null
[RawPrint]::ClosePrinter($h)|Out-Null
Write-Output "OK:$w"
`;

    exec(`powershell -NoProfile -NonInteractive -Command "${ps.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
      { timeout: 8000 },
      (err, stdout, stderr) => {
        fs.unlink(tmpFile.replace(/\\\\/g, '\\'), () => {});
        if (err || !stdout.includes('OK:')) {
          const msg = stderr || err?.message || 'Noma\'lum xato';
          console.error('[print-agent] Windows print xato:', msg);
          return res.status(500).json({ ok: false, error: `Printer topilmadi: "${printerName}". PRINTER_NAME ni tekshiring.` });
        }
        console.log(`[print-agent] Chek yuborildi → ${printerName}`);
        res.json({ ok: true, printer: printerName });
      }
    );
  });
}

// ── Linux: to'g'ridan-to'g'ri USB device ga ──────────────────────────────────
async function sendLinux(buf, res) {
  const configured = process.env.PRINTER_USB_PATH || '';
  const candidates = configured ? [configured] : USB_CANDIDATES;
  for (const devicePath of candidates) {
    try {
      await fsp.writeFile(devicePath, buf);
      console.log(`[print-agent] Chek yuborildi → ${devicePath}`);
      return res.json({ ok: true, device: devicePath });
    } catch (err) {
      console.log(`[print-agent] ${devicePath}: ${err.message}`);
    }
  }
  res.status(500).json({ ok: false, error: `USB printer topilmadi: ${candidates.join(', ')}` });
}

// ── ESC/POS receipt (kesish komandasi bilan) ──────────────────────────────────
function buildReceipt(d) {
  const W   = WIDTH;
  const ESC = '\x1B';
  const GS  = '\x1D';

  const bold1  = `${ESC}\x45\x01`;
  const bold0  = `${ESC}\x45\x00`;
  const dblH   = `${ESC}\x21\x10`;
  const normal = `${ESC}\x21\x00`;
  const alignL = `${ESC}\x61\x00`;
  const alignC = `${ESC}\x61\x01`;
  const LF   = '\n';
  const sep  = '='.repeat(W);
  const dash = '-'.repeat(W);

  const money = (n) => {
    const v = typeof n === 'string' ? parseFloat(n) : n;
    return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' sum';
  };

  const pad2 = (n) => String(n).padStart(2, '0');
  const dt = new Date(d.createdAt);
  const dateStr = `${pad2(dt.getDate())}.${pad2(dt.getMonth() + 1)}.${dt.getFullYear()}`;
  const timeStr = `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;

  const store    = d.store   || {};
  const user     = d.user    || {};
  const items    = d.items   || [];
  const subtotal = items.reduce((s, i) => s + Number(i.totalPrice), 0);
  const discount = Number(d.discountAmount || 0);
  const receiptId = `#${String(d.receiptNo).padStart(4, '0')}`;

  let t = `${ESC}\x40`;

  t += alignC + bold1 + dblH;
  t += (store.name || "Do'kon") + LF;
  t += normal + bold0;
  if (store.address) t += store.address + LF;
  if (store.phone)   t += 'Tel: ' + store.phone + LF;
  t += alignL + sep + LF;

  t += `Chek   : ${bold1}${receiptId}${bold0}` + LF;
  t += `Sana   : ${dateStr} ${timeStr}` + LF;
  t += `Kassir : ${user.name || '—'}` + LF;
  if (d.customerName) t += `Mijoz  : ${d.customerName}` + LF;

  items.forEach((item, idx) => {
    t += sep + LF;
    const prefix = `${idx + 1}. `;
    const maxLen = W - prefix.length;
    const nm = item.product?.name || item.name || '';
    const name = nm.length > maxLen ? nm.slice(0, maxLen - 2) + '..' : nm;
    t += bold1 + prefix + name + bold0 + LF;
    const left  = `   ${Number(item.quantity)} x ${money(Number(item.unitPrice))}`;
    const right = money(Number(item.totalPrice));
    const gap   = W - left.length - right.length;
    if (gap >= 1) {
      t += left + ' '.repeat(gap) + right + LF;
    } else {
      t += left + LF;
      t += '   = '.padEnd(W - right.length) + right + LF;
    }
  });

  t += sep + LF;
  const MW = 16;
  t += 'Jami:'.padEnd(W - MW) + money(subtotal).padStart(MW) + LF;
  if (discount > 0) {
    t += 'Chegirma:'.padEnd(W - MW) + ('-' + money(discount)).padStart(MW) + LF;
    t += dash + LF;
  }
  t += bold1;
  t += "TO'LASH:".padEnd(W - MW) + money(Number(d.totalAmount)).padStart(MW) + LF;
  t += bold0 + sep + LF;

  t += `To'lov : ${bold1}${PAYMENT_LABELS[d.paymentMethod] || d.paymentMethod}${bold0}` + LF;
  t += sep + LF;
  t += alignC + bold1 + 'Xarid uchun rahmat!' + bold0 + LF;
  t += LF + LF + LF;

  // Qog'oz kesish: GS V 65 0 = partial cut (ko'pchilik termallarda ishlaydi)
  t += `${GS}\x56\x41\x00`;

  return Buffer.from(t, 'latin1');
}

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║   My Santex — Print Agent            ║`);
  console.log(`╚══════════════════════════════════════╝`);
  console.log(`Platforma : ${IS_WINDOWS ? 'Windows' : 'Linux'}`);
  console.log(`Manzil    : http://localhost:${PORT}`);
  if (IS_WINDOWS) {
    const name = process.env.PRINTER_NAME || 'XP-80';
    console.log(`Printer   : ${name}`);
    console.log(`\nBoshqa printer nomi bo'lsa:`);
    console.log(`  set PRINTER_NAME=PrinterNomi && node server.js\n`);
  } else {
    console.log('USB qurilmalar:');
    for (const d of USB_CANDIDATES) {
      console.log(`  ${d}: ${fs.existsSync(d) ? '✓ TOPILDI' : "YO'Q"}`);
    }
    console.log('');
  }
});
