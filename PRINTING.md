# My Santex — Chek Chiqarish Tizimi

## Umumiy arxitektura

```
Brauzer (mysantex.uz)
    │
    │  POST http://localhost:5555/print  (JSON: sotuv ma'lumotlari)
    ▼
Print Agent (localhost:5555)
    │
    ├── PRINTER_IP o'rnatilgan → TCP socket → Printer IP:9100
    ├── Windows (PRINTER_IP yo'q) → PowerShell → Windows Spooler → Printer
    └── Linux (PRINTER_IP yo'q) → /dev/usb/lp0 → USB Printer
```

**Muhim:** Printer agent **foydalanuvchining o'z kompyuterida** ishlaydi (`localhost`).  
Backend server (VPS) printer bilan to'g'ridan-to'g'ri bog'lanmaydi.

---

## Printer haqida

| Maydon | Qiymat |
|--------|--------|
| Model | Xprinter XP-80T |
| Interfeys | USB + Network (Ethernet) |
| Qog'oz eni | 80mm (48 belgi) |
| Protokol | ESC/POS |
| Network IP | 192.168.1.38 |
| Network port | 9100 (TCP RAW) |
| Windows nomi | XP-80 |
| Linux USB | /dev/usb/lp0 |

---

## Nima buzilgan edi va qanday tuzatildi

### 1. Reprint → Backend serverga borardi (XATO)

**Muammo:**  
`Sotuvlar tarixi` sahifasidagi printer tugmasi eski kod bilan backend'ga  
`POST /api/printer/reprint/:id` so'rov yuborardi.  
Backend esa VPS serverdagi `/dev/usb/lp0` ni qidirardi — u yerda printer yo'q.

```
Xato: {"success":false,"error":"USB printer topilmadi: /dev/usb/lp0"}
```

**Tuzatish (`SalesPage.tsx`):**
```ts
// ESKI (noto'g'ri) — backend serverga boradi
const reprint = useMutation({ mutationFn: salesApi.reprint })

// YANGI (to'g'ri) — sotuv ma'lumotini olib, local agent'ga yuboradi
const reprint = useMutation({
  mutationFn: (saleId: string) => salesApi.getOne(saleId),
  onSuccess: (sale) => printViaAgent(sale),
})
```

---

### 2. PowerShell here-string buzilishi (Windows muammosi)

**Muammo:**  
Windows'da `sendWindows()` funksiyasi PowerShell skriptni bir qatorga yig'ib:
```
powershell -Command "... '@ $h=[IntPtr]::Zero ..."
```
yuborardi. PowerShell `here-string` (`@'...'@`) sintaksisi esa yopuvchi `'@`  
**alohida qatorda** bo'lishini talab qiladi. Bir qatorga yig'ilganda skript buziladi.

**Tuzatish:**  
Skriptni `.ps1` temp fayliga yozib, `-File` bilan ishga tushirish:
```js
// ESKI (noto'g'ri)
exec(`powershell -Command "${ps.replace(/\n/g, ' ')}"`)

// YANGI (to'g'ri)
fs.writeFile(ps1File, psScript, () => {
  exec(`powershell -ExecutionPolicy Bypass -File "${ps1File}"`)
})
```

---

### 3. Network rejimi qo'shildi

**Sabab:**  
Windows driver muammolari (noto'g'ri nom, ExecutionPolicy, spooler xatolari)  
ni chetlab o'tish uchun printer'ning network portidan foydalanish eng ishonchli yechim.

**`PRINTER_IP` o'rnatilsa:**
```
Print Agent → TCP socket → 192.168.1.38:9100 → Printer
```
Driver kerak emas. Linux'da ham, Windows'da ham bir xil ishlaydi.

**Qo'shilgan `sendNetwork()` funksiyasi (`server.js`):**
```js
function sendNetwork(buf, res) {
  const client = new net.Socket();
  client.connect(PRINTER_PORT_NET, PRINTER_IP, () => {
    client.write(buf, () => {
      client.destroy();
      res.json({ ok: true, host: PRINTER_IP });
    });
  });
}
```

**Ustuvorlik tartibi:**
1. `PRINTER_IP` bor → Network TCP
2. Windows + `PRINTER_IP` yo'q → PowerShell Spooler
3. Linux + `PRINTER_IP` yo'q → `/dev/usb/lpX`

---

## Print Agent sozlash

### Linux (USB orqali)

```bash
cd /path/to/my-santex/print-agent
npm install
node server.js
```

Printer `/dev/usb/lp0` da avtomatik topiladi.  
Agar boshqa portda bo'lsa:
```bash
PRINTER_USB_PATH=/dev/usb/lp1 node server.js
```

---

### Linux yoki Windows (Network orqali) — tavsiya etiladi

```bash
PRINTER_IP=192.168.1.38 node server.js
```

Yoki `start.bat` da:
```bat
set PRINTER_IP=192.168.1.38
set PRINTER_PORT=9100
node server.js
```

---

### Windows (USB/Driver orqali) — muqobil

```bat
set PRINTER_NAME=XP-80
node server.js
```

`PRINTER_NAME` — Windows da `wmic printer get name` buyrug'i bilan topiladi.

---

### Autostart (Windows)

```
install-startup.bat → administrator sifatida ikki marta bosing
```

Bu Windows yoqilganda `start-silent.vbs` orqali agentni ko'rinmas holda ishga tushiradi.

---

## Chekni qanday quradi (ESC/POS)

`server.js` dagi `buildReceipt()` funksiyasi sotuv ma'lumotidan ESC/POS bufer hosil qiladi:

```
ESC @          → Printer reset
ESC a 1        → Markazlash
ESC ! 0x10     → Ikki baravari baland shrift
[Do'kon nomi]
ESC ! 0x00     → Normal shrift
[Manzil, Tel]
ESC a 0        → Chapga tekislash
================
Chek   : #0001
Sana   : 29.06.2026 14:30
Kassir : Ali
================
1. [Tovar nomi]
   2 x 15 000 sum        30 000 sum
================
Jami:              30 000 sum
TO'LASH:           30 000 sum
================
To'lov : Naqd pul
================
      Xarid uchun rahmat!

[3 qator LF]
GS V A 0       → Qisman kesish
```

**Encoding:** `Buffer.from(text, 'latin1')` — ESC/POS buyruqlari 0x00–0xFF oralig'ida.

---

## Test qilish

### Agent holati:
```
GET http://localhost:5555/status
```
```json
{ "ok": true, "mode": "network", "host": "192.168.1.38", "port": 9100 }
```

### Qo'lda print:
```bash
curl -X POST http://localhost:5555/print \
  -H "Content-Type: application/json" \
  -d '{"receiptNo":1,"items":[{"product":{"name":"Test"},"quantity":1,"unitPrice":10000,"totalPrice":10000}],"totalAmount":10000,"paymentMethod":"CASH","createdAt":"2026-06-29T10:00:00Z","store":{"name":"Test Do'\''kon"},"user":{"name":"Admin"}}'
```

### Faqat kesish:
```bash
curl -X POST http://localhost:5555/cut
```

---

## Xato holatlari

| Xato | Sabab | Yechim |
|------|-------|--------|
| `ERR_CONNECTION_REFUSED` | Print agent ishlamayapti | `node server.js` ishga tushiring |
| `Network printer xato: ECONNREFUSED` | Printer o'chiq yoki IP noto'g'ri | Printer'ni yoqing, IP'ni tekshiring |
| `USB printer topilmadi` | USB ulanmagan | Kabel tekshiring, `/dev/usb/lp0` bormi |
| `OpenPrinter muvaffaqiyatsiz` | Windows printer nomi noto'g'ri | `wmic printer get name` bilan tekshiring |
| `500` brauzerda, agent ishlab turibdi | Printer ulanmagan | Status endpoint'ni tekshiring |

---

## Fayl tuzilmasi

```
print-agent/
├── server.js          # Asosiy agent (Express, ESC/POS, print logikasi)
├── start.bat          # Windows uchun ishga tushirish (PRINTER_IP o'rnatilgan)
├── start-silent.vbs   # Windows autostart (ko'rinmas oyna)
├── install-startup.bat# Bir martalik o'rnatish (Startup papkasiga shortcut)
└── package.json

frontend/src/lib/
├── printViaAgent.ts   # POST localhost:5555/print ga yuboradi
└── printReceipt.ts    # Brauzer print dialog (zaxira usul, hozir ishlatilmaydi)
```
