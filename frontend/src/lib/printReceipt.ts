const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Naqd pul',
  CARD: 'Plastik karta',
  TRANSFER: "Bank o'tkazma",
  INSTALLMENT: "Muddatli to'lov",
};

const money = (n: number | string) => {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' sum';
};

interface ReceiptItem { product?: { name?: string }; quantity: number; unitPrice: number; totalPrice: number }
interface ReceiptSale {
  receiptNo?: number; createdAt?: string; totalAmount?: number; paymentMethod?: string
  discountAmount?: number; customerName?: string
  items?: ReceiptItem[]
  store?: { name?: string; address?: string; phone?: string }
  user?: { name?: string }
}

export function printReceipt(sale: ReceiptSale) {
  const items: ReceiptItem[] = sale.items || [];
  const store = sale.store || {};
  const user = sale.user || {};

  const dt = new Date(sale.createdAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${pad(dt.getDate())}.${pad(dt.getMonth() + 1)}.${dt.getFullYear()}`;
  const timeStr = `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;

  const subtotal = items.reduce((s: number, i) => s + Number(i.totalPrice), 0);
  const receiptNo = `#${String(sale.receiptNo).padStart(4, '0')}`;
  const discount = Number(sale.discountAmount || 0);

  const itemsHtml = items
    .map(
      (item: ReceiptItem, idx: number) => `
    <div class="sep"></div>
    <div class="item-name">${idx + 1}. ${item.product?.name || ''}</div>
    <div class="row">
      <span>${Number(item.quantity)} x ${money(Number(item.unitPrice))}</span>
      <span class="bold">${money(Number(item.totalPrice))}</span>
    </div>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Chek ${receiptNo}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    width: 302px;
    padding: 6px 4px;
    color: #000;
    background: #fff;
  }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .large { font-size: 15px; line-height: 1.4; }
  .sep { border-top: 1px dashed #000; margin: 4px 0; }
  .row { display: flex; justify-content: space-between; margin: 2px 0; white-space: nowrap; }
  .item-name { font-weight: bold; margin-bottom: 2px; word-break: break-word; }
  .total-row { font-size: 13px; font-weight: bold; margin: 3px 0; }
  .thanks { font-size: 12px; margin-top: 4px; }
  @media print {
    @page { size: 80mm auto; margin: 2mm; }
    body { width: 100%; }
  }
</style>
</head>
<body>
<div class="center bold large">${store.name || "Do'kon"}</div>
${store.address ? `<div class="center">${store.address}</div>` : ''}
${store.phone ? `<div class="center">Tel: ${store.phone}</div>` : ''}
<div class="sep"></div>
<div class="row"><span>Chek  :</span><span class="bold">${receiptNo}</span></div>
<div class="row"><span>Sana  :</span><span>${dateStr} ${timeStr}</span></div>
<div class="row"><span>Kassir:</span><span>${user.name || '—'}</span></div>
${sale.customerName ? `<div class="row"><span>Mijoz :</span><span>${sale.customerName}</span></div>` : ''}
${itemsHtml}
<div class="sep"></div>
<div class="row"><span>Jami:</span><span>${money(subtotal)}</span></div>
${discount > 0 ? `<div class="row"><span>Chegirma:</span><span>-${money(discount)}</span></div><div class="sep"></div>` : ''}
<div class="row total-row"><span>TO'LASH:</span><span>${money(Number(sale.totalAmount))}</span></div>
<div class="row"><span>To'lov:</span><span class="bold">${PAYMENT_LABELS[sale.paymentMethod] || sale.paymentMethod}</span></div>
<div class="sep"></div>
<div class="center bold thanks">Xarid uchun rahmat!</div>
<br><br><br>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=380,height=650,scrollbars=no');
  if (!win) {
    alert("Pop-up bloklandi. Brauzerdagi pop-up ruxsatini yoqing.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
    cutPaper();
  }, 250);
}

export function cutPaper(): void {
  fetch('http://localhost:5555/cut', { method: 'POST' }).catch(() => {});
}
