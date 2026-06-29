#!/usr/bin/env node
/**
 * My Santex — Print Agent (cross-OS)
 * Zero-dependency. Faqat Node.js (>= 14) kerak. npm install SHART EMAS.
 *
 * Ishga tushirish:
 *   PRINTER_IP=192.168.1.38 node server.js     # TAVSIYA: driversiz, hamma OS
 *   PRINTER_NAME=XP-80 node server.js          # Windows spooler / macOS CUPS
 *   node server.js                             # Linux USB /dev/usb/lp0
 *
 * Endpointlar (eski kontrakt o'zgarmagan — frontend printViaAgent.ts shundayligicha ishlaydi):
 *   GET  /status   -> joriy rejim va transport zanjiri
 *   POST /print    -> sotuv JSON -> chek chiqaradi
 *   POST /cut      -> faqat qog'ozni kesadi
 */

'use strict';

const http = require('http');
const net = require('net');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

// ---------- Sozlamalar (ENV) ----------
const HOST = process.env.HOST || '127.0.0.1';
const PORT = parseInt(process.env.PORT || '5555', 10);

const PRINTER_IP = (process.env.PRINTER_IP || '').trim();
const PRINTER_PORT_NET = parseInt(process.env.PRINTER_PORT || '9100', 10);
const PRINTER_NAME = process.env.PRINTER_NAME || 'XP-80';
const PRINTER_USB_PATH = process.env.PRINTER_USB_PATH || '/dev/usb/lp0';
const PLATFORM = process.platform; // 'win32' | 'darwin' | 'linux'

const WIDTH = 48; // 80mm, A shrift => 48 belgi

// =====================================================================
//  1) CHEK QURISH — transportdan mustaqil (ESC/POS bufer qaytaradi)
// =====================================================================
const ESC = 0x1b, GS = 0x1d, LF = 0x0a;

function sanitize(s) {
  // Uzbek maxsus belgilari (o', g') va "aqlli" qo'shtirnoqlarni latin1 uchun ASCII'ga
  return String(s == null ? '' : s)
    .replace(/[ʻʼ‘’]/g, "'")
    .replace(/[“”]/g, '"');
}

function money(n) {
  const v = Math.round(Number(n) || 0).toString();
  return v.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' sum';
}

function pad4(n) {
  return String(n == null ? 0 : n).padStart(4, '0');
}

function paymentLabel(m) {
  const map = {
    CASH: 'Naqd pul', CARD: 'Karta', TRANSFER: "O'tkazma",
    DEBT: 'Qarz', MIXED: 'Aralash',
  };
  return map[String(m || '').toUpperCase()] || String(m || '-');
}

function fmtDate(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return String(iso || '');
  const p = (x) => String(x).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ` +
         `${p(d.getHours())}:${p(d.getMinutes())}`;
}

// chap + o'ng ustun, 48 belgiga tekislangan
function row(left, right) {
  left = sanitize(left);
  right = sanitize(right);
  let gap = WIDTH - left.length - right.length;
  if (gap < 1) {
    left = left.slice(0, Math.max(0, WIDTH - right.length - 1));
    gap = Math.max(1, WIDTH - left.length - right.length);
  }
  return left + ' '.repeat(gap) + right;
}

function buildReceipt(sale) {
  sale = sale || {};
  const store = sale.store || {};
  const user = sale.user || {};
  const items = Array.isArray(sale.items) ? sale.items : [];
  const sep = '='.repeat(WIDTH);

  const out = [];
  const cmd = (...b) => out.push(Buffer.from(b));
  const ln = (s) => out.push(Buffer.from(sanitize(s) + '\n', 'latin1'));

  cmd(ESC, 0x40);                 // reset
  cmd(ESC, 0x61, 1);              // markaz
  cmd(ESC, 0x21, 0x10);           // ikki baravar baland shrift
  ln(store.name || 'MY SANTEX');
  cmd(ESC, 0x21, 0x00);           // normal shrift
  if (store.address) ln(store.address);
  if (store.phone) ln('Tel: ' + store.phone);

  cmd(ESC, 0x61, 0);              // chapga tekislash
  ln(sep);
  ln(row('Chek :', '#' + pad4(sale.receiptNo)));
  ln(row('Sana :', fmtDate(sale.createdAt)));
  if (user.name) ln(row('Kassir :', user.name));
  ln(sep);

  items.forEach((it, i) => {
    const name = (it.product && it.product.name) || it.name || 'Tovar';
    const qty = Number(it.quantity) || 0;
    const price = Number(it.unitPrice) || 0;
    const total = Number(it.totalPrice != null ? it.totalPrice : qty * price);
    ln(`${i + 1}. ${name}`);
    ln(row(`   ${qty} x ${money(price)}`, money(total)));
  });
  ln(sep);

  cmd(ESC, 0x21, 0x08);           // qalin (emphasized)
  ln(row('Jami:', money(sale.totalAmount)));
  cmd(ESC, 0x21, 0x00);
  ln(sep);
  ln(row("To'lov :", paymentLabel(sale.paymentMethod)));
  ln(sep);

  cmd(ESC, 0x61, 1);              // markaz
  ln('Xarid uchun rahmat!');
  cmd(ESC, 0x61, 0);

  cmd(LF, LF, LF);                // qog'oz chiqarish
  cmd(GS, 0x56, 0x41, 0x00);      // qisman kesish
  return Buffer.concat(out);
}

const CUT_BUF = Buffer.from([GS, 0x56, 0x41, 0x00]);

// =====================================================================
//  2) TRANSPORTLAR — har biri Promise qaytaradi
// =====================================================================

// (a) Network — TCP RAW 9100. Universal, driversiz.
function tNetwork(buf) {
  return new Promise((resolve, reject) => {
    const sock = new net.Socket();
    let done = false;
    const fail = (m) => {
      if (!done) { done = true; sock.destroy(); reject(new Error('network: ' + m)); }
    };
    sock.setTimeout(5000);
    sock.on('error', (e) => fail(e.message));
    sock.on('timeout', () => fail('timeout'));
    sock.connect(PRINTER_PORT_NET, PRINTER_IP, () => {
      sock.write(buf, () => sock.end(() => {
        if (!done) {
          done = true;
          resolve({ via: 'network', host: PRINTER_IP, port: PRINTER_PORT_NET });
        }
      }));
    });
  });
}

// (b) Linux USB — to'g'ridan-to'g'ri qurilma fayli.
function tUsbLinux(buf) {
  return new Promise((resolve, reject) => {
    fs.writeFile(PRINTER_USB_PATH, buf, (err) => {
      if (err) reject(new Error('usb: ' + err.message));
      else resolve({ via: 'usb', path: PRINTER_USB_PATH });
    });
  });
}

// (c) CUPS raw — macOS va Linux (lp -o raw). "Raw" navbat kerak.
function tCups(buf) {
  return new Promise((resolve, reject) => {
    const tmp = path.join(os.tmpdir(), `santex-${Date.now()}-${process.pid}.bin`);
    fs.writeFile(tmp, buf, (err) => {
      if (err) return reject(new Error('cups: ' + err.message));
      execFile('lp', ['-d', PRINTER_NAME, '-o', 'raw', tmp], (e, _o, stderr) => {
        fs.unlink(tmp, () => {});
        if (e) reject(new Error('cups: ' + ((stderr || e.message) + '').trim()));
        else resolve({ via: 'cups', name: PRINTER_NAME });
      });
    });
  });
}

// (d) Windows — RAW spooler (winspool WritePrinter), temp .ps1 fayl orqali (-File bilan).
function tWindows(buf) {
  return new Promise((resolve, reject) => {
    const stamp = `${Date.now()}-${process.pid}`;
    const binFile = path.join(os.tmpdir(), `santex-${stamp}.bin`);
    const ps1File = path.join(os.tmpdir(), `santex-${stamp}.ps1`);
    fs.writeFile(binFile, buf, (e1) => {
      if (e1) return reject(new Error('windows: ' + e1.message));
      fs.writeFile(ps1File, winRawScript(), (e2) => {
        if (e2) { fs.unlink(binFile, () => {}); return reject(new Error('windows: ' + e2.message)); }
        const env = Object.assign({}, process.env, {
          SANTEX_FILE: binFile, SANTEX_PRINTER: PRINTER_NAME,
        });
        const args = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', ps1File];
        execFile('powershell.exe', args, { env, windowsHide: true }, (e, _o, stderr) => {
          fs.unlink(binFile, () => {});
          fs.unlink(ps1File, () => {});
          if (e) reject(new Error('windows: ' + ((stderr || e.message) + '').trim()));
          else resolve({ via: 'windows-spooler', name: PRINTER_NAME });
        });
      });
    });
  });
}

// PowerShell skript .ps1 faylga yoziladi va -File bilan ishga tushiriladi.
// DIQQAT: here-string yopuvchisi '@ ALOHIDA qatorda, chap chetda turishi shart.
function winRawScript() {
  return `$ErrorActionPreference = 'Stop'
$src = @'
using System;
using System.Runtime.InteropServices;
public class SantexRaw {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public class DOCINFO {
    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
  }
  [DllImport("winspool.Drv", EntryPoint="OpenPrinterW", SetLastError=true, CharSet=CharSet.Unicode)]
  public static extern bool OpenPrinter(string n, out IntPtr h, IntPtr d);
  [DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true)]
  public static extern bool ClosePrinter(IntPtr h);
  [DllImport("winspool.Drv", EntryPoint="StartDocPrinterW", SetLastError=true, CharSet=CharSet.Unicode)]
  public static extern bool StartDocPrinter(IntPtr h, int l, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFO di);
  [DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true)]
  public static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true)]
  public static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true)]
  public static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true)]
  public static extern bool WritePrinter(IntPtr h, byte[] b, int n, out int w);
  public static void Send(string printer, byte[] data) {
    IntPtr h;
    if (!OpenPrinter(printer, out h, IntPtr.Zero)) throw new Exception("OpenPrinter muvaffaqiyatsiz: " + printer);
    try {
      DOCINFO di = new DOCINFO();
      di.pDocName = "My Santex Chek"; di.pDataType = "RAW";
      if (!StartDocPrinter(h, 1, di)) throw new Exception("StartDocPrinter xato");
      try {
        if (!StartPagePrinter(h)) throw new Exception("StartPagePrinter xato");
        int w; if (!WritePrinter(h, data, data.Length, out w)) throw new Exception("WritePrinter xato");
        EndPagePrinter(h);
      } finally { EndDocPrinter(h); }
    } finally { ClosePrinter(h); }
  }
}
'@
Add-Type -TypeDefinition $src -Language CSharp
$bytes = [System.IO.File]::ReadAllBytes($env:SANTEX_FILE)
[SantexRaw]::Send($env:SANTEX_PRINTER, $bytes)
`;
}

// =====================================================================
//  3) SELECTOR + FALLBACK — OS va ENV asosida zanjir
// =====================================================================
function safeExists(p) { try { return fs.existsSync(p); } catch (_) { return false; } }

function buildChain() {
  const chain = [];
  if (PRINTER_IP) chain.push({ name: 'network', fn: tNetwork });
  if (PLATFORM === 'win32') {
    chain.push({ name: 'windows', fn: tWindows });
  } else if (PLATFORM === 'darwin') {
    chain.push({ name: 'cups', fn: tCups });
  } else { // linux va boshqalar
    if (safeExists(PRINTER_USB_PATH)) chain.push({ name: 'usb', fn: tUsbLinux });
    chain.push({ name: 'cups', fn: tCups });
  }
  return chain;
}

async function printBuffer(buf) {
  const chain = buildChain();
  if (chain.length === 0) {
    throw new Error("Transport yo'q. PRINTER_IP yoki PRINTER_NAME bering.");
  }
  const errs = [];
  for (const t of chain) {
    try {
      const r = await t.fn(buf);
      console.log(`[print] OK -> ${t.name}`);
      return r;
    } catch (e) {
      console.warn(`[print] ${t.name} muvaffaqiyatsiz: ${e.message}`);
      errs.push(e.message);
    }
  }
  throw new Error('Barcha transportlar muvaffaqiyatsiz -> ' + errs.join(' | '));
}

function statusInfo() {
  const chain = buildChain().map((t) => t.name);
  return {
    ok: true,
    platform: PLATFORM,
    mode: chain[0] || null,
    chain,
    printerIp: PRINTER_IP || null,
    printerPort: PRINTER_IP ? PRINTER_PORT_NET : null,
    printerName: PRINTER_NAME,
    usbPath: PLATFORM === 'linux' ? PRINTER_USB_PATH : null,
  };
}

// =====================================================================
//  4) HTTP SERVER (0 dependency) + CORS
// =====================================================================
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function send(res, code, obj) {
  res.writeHead(code, Object.assign({ 'Content-Type': 'application/json' }, CORS));
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }

  const url = (req.url || '/').split('?')[0];

  if (req.method === 'GET' && url === '/status') {
    return send(res, 200, statusInfo());
  }

  if (req.method === 'POST' && url === '/cut') {
    return printBuffer(CUT_BUF)
      .then((r) => send(res, 200, Object.assign({ ok: true }, r)))
      .catch((e) => send(res, 500, { ok: false, error: e.message }));
  }

  if (req.method === 'POST' && url === '/print') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 2e6) req.destroy(); });
    req.on('end', () => {
      let sale;
      try { sale = JSON.parse(body || '{}'); }
      catch (_) { return send(res, 400, { ok: false, error: 'JSON xato' }); }
      let buf;
      try { buf = buildReceipt(sale); }
      catch (e) { return send(res, 400, { ok: false, error: 'Chek qurishda xato: ' + e.message }); }
      printBuffer(buf)
        .then((r) => send(res, 200, Object.assign({ ok: true }, r)))
        .catch((e) => send(res, 500, { ok: false, error: e.message }));
    });
    return;
  }

  send(res, 404, { ok: false, error: 'Not found' });
});

server.listen(PORT, HOST, () => {
  const s = statusInfo();
  console.log('--------------------------------------------------');
  console.log(` My Santex Print Agent -> http://${HOST}:${PORT}`);
  console.log(` Platform : ${s.platform}`);
  console.log(` Transport: ${s.chain.join('  ->  ')}`);
  if (s.printerIp) console.log(` Network  : ${s.printerIp}:${s.printerPort}`);
  if (s.platform === 'win32' || s.platform === 'darwin') console.log(` Printer  : ${s.printerName}`);
  if (s.platform !== 'win32' && s.platform !== 'darwin') console.log(` USB      : ${s.usbPath}`);
  console.log('--------------------------------------------------');
});
