import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import '../core/models/sale.dart';

class ReceiptItem {
  final String name;
  final int quantity;
  final double unitPrice;
  double get total => quantity * unitPrice;
  const ReceiptItem({required this.name, required this.quantity, required this.unitPrice});
}

// "16 000 sum" — web bilan bir xil format
String _money(double v) {
  final s = v.round().toString().replaceAllMapped(
    RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
    (m) => '${m[1]} ',
  );
  return '$s sum';
}

String _pad(int n, int w) => n.toString().padLeft(w, '0');

const _paymentLabels = {
  'CASH': 'NAQD PUL',
  'CARD': 'PLASTIK KARTA',
  'TRANSFER': "BANK O'TKAZMA",
  'INSTALLMENT': "MUDDATLI TO'LOV",
};

Future<Uint8List> generateReceiptPdf({
  required Sale sale,
  required List<ReceiptItem> items,
  String storeName = 'My Santex',
  String? storeAddress,
  String? storePhone,
  String? cashierName,
  PdfPageFormat? pageFormat,
}) async {
  final pdf = pw.Document();
  final courier    = pw.Font.courier();
  final courierBold = pw.Font.courierBold();
  const fs = 10.0;

  // Printer margin'larini ishonib bo'lmaydi — o'zimiz belgilaymiz
  final paperWidth = pageFormat?.width ?? (80 * PdfPageFormat.mm);
  const fixedMargin = 3 * PdfPageFormat.mm; // 3mm chap + o'ng
  final myFmt = PdfPageFormat(
    paperWidth,
    double.infinity,
    marginLeft:   fixedMargin,
    marginRight:  fixedMargin,
    marginTop:    2 * PdfPageFormat.mm,
    marginBottom: 6 * PdfPageFormat.mm,
  );
  final fmt = myFmt;

  // Courier monospace: har bir belgi = 0.6 × fontSize kenglik
  final charW   = fs * 0.6;
  final nChars  = ((paperWidth - 2 * fixedMargin) / charW).floor();
  final sepEq   = '=' * nChars;   // ═══ ajratuvchi
  final sepDash = '-' * nChars;   // ─── item ajratuvchi

  // --- yordamchi funksiyalar ---

  pw.Widget txt(
    String s, {
    bool bold = false,
    double size = fs,
    pw.TextAlign align = pw.TextAlign.left,
  }) =>
      pw.Text(
        s,
        textAlign: align,
        style: pw.TextStyle(
          font: bold ? courierBold : courier,
          fontSize: size,
          lineSpacing: 0,
        ),
      );

  // Chap-o'ng qatorlar: spaceBetween bilan to'liq kenglikka yoziladi
  pw.Widget kv(
    String left,
    String right, {
    bool bold = false,
    double size = fs,
  }) =>
      pw.Row(
        mainAxisSize: pw.MainAxisSize.max,
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          txt(left, bold: bold, size: size),
          txt(right, bold: bold, size: size),
        ],
      );

  // Sana/vaqt formatlash
  final dt      = DateTime.tryParse(sale.createdAt) ?? DateTime.now();
  final dateStr = '${_pad(dt.day,2)}.${_pad(dt.month,2)}.${dt.year}';
  final timeStr = '${_pad(dt.hour,2)}:${_pad(dt.minute,2)}';
  final rcptNo  = '#${_pad(sale.receiptNo, 6)}';   // #000052 — 6 xonali

  final double subtotal = items.fold(0.0, (s, i) => s + i.total);
  final discount = sale.discountAmount;

  pdf.addPage(pw.Page(
    pageFormat: fmt,
    build: (ctx) => pw.Column(
      mainAxisSize: pw.MainAxisSize.min,
      crossAxisAlignment: pw.CrossAxisAlignment.stretch,
      children: [

        // ══════ SARLAVHA ══════
        txt(sepEq),
        pw.SizedBox(height: 3),
        txt(storeName,
            bold: true, size: fs + 4, align: pw.TextAlign.center),
        if (storeAddress != null && storeAddress.isNotEmpty) ...[
          pw.SizedBox(height: 1),
          txt(storeAddress, align: pw.TextAlign.center, size: fs - 0.5),
        ],
        if (storePhone != null && storePhone.isNotEmpty) ...[
          pw.SizedBox(height: 1),
          txt(storePhone, align: pw.TextAlign.center, size: fs - 0.5),
        ],
        pw.SizedBox(height: 3),
        txt(sepEq),
        pw.SizedBox(height: 3),

        // ══════ META ══════
        kv('Sana    :', '$dateStr $timeStr'),
        pw.SizedBox(height: 1),
        kv('Kassir  :', cashierName ?? '—'),
        pw.SizedBox(height: 1),
        kv('Chek    :', rcptNo),
        if (sale.customerName != null && sale.customerName!.isNotEmpty) ...[
          pw.SizedBox(height: 1),
          kv('Mijoz   :', sale.customerName!),
        ],
        pw.SizedBox(height: 3),
        txt(sepEq),
        pw.SizedBox(height: 3),

        // ══════ USTUN SARLAVHASI ══════
        pw.Row(
          mainAxisSize: pw.MainAxisSize.max,
          children: [
            pw.Expanded(
              child: txt('Mahsulot', bold: true, size: fs - 0.5),
            ),
            txt('Miqdor', bold: true, size: fs - 0.5,
                align: pw.TextAlign.center),
            pw.SizedBox(width: 8),
            pw.SizedBox(
              width: fmt.availableWidth * 0.30,
              child: txt('Jami', bold: true, size: fs - 0.5,
                  align: pw.TextAlign.right),
            ),
          ],
        ),
        pw.SizedBox(height: 2),
        txt(sepDash),

        // ══════ MAHSULOTLAR ══════
        ...items.asMap().entries.expand((e) {
          final idx  = e.key + 1;
          final item = e.value;
          return [
            pw.SizedBox(height: 4),

            // Mahsulot nomi — to'liq qator, qalin
            txt('$idx. ${item.name}', bold: true, size: fs),
            pw.SizedBox(height: 2),

            // Miqdor × narx | Jami — chap/o'ng
            pw.Row(
              mainAxisSize: pw.MainAxisSize.max,
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                txt('${item.quantity} x ${_money(item.unitPrice)}',
                    size: fs - 0.5),
                txt(_money(item.total),
                    bold: true, size: fs - 0.5),
              ],
            ),
            pw.SizedBox(height: 4),
            txt(sepDash),
          ];
        }),

        pw.SizedBox(height: 3),
        txt(sepEq),
        pw.SizedBox(height: 3),

        // ══════ JAMI ══════
        kv('Jami:', _money(subtotal), size: fs),
        if (discount > 0) ...[
          pw.SizedBox(height: 1),
          kv('Chegirma:', '-${_money(discount)}'),
        ],
        pw.SizedBox(height: 3),
        txt(sepEq),
        pw.SizedBox(height: 3),

        // ══════ TO'LOV ══════
        kv("To'lov turi:",
            _paymentLabels[sale.paymentMethod] ?? sale.paymentMethod,
            bold: true, size: fs),
        pw.SizedBox(height: 3),
        txt(sepEq),
        pw.SizedBox(height: 5),

        // ══════ FOOTER ══════
        txt('Xarid uchun rahmat!',
            bold: true, align: pw.TextAlign.center, size: fs),
        pw.SizedBox(height: 2),
        txt('Qaytib kelishingizni kutib qolamiz!',
            align: pw.TextAlign.center, size: fs - 1),
        pw.SizedBox(height: 4),
        txt(sepEq),
      ],
    ),
  ));

  return pdf.save();
}
