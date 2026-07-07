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

// Web (print-agent/server.js buildReceipt) bilan bir xil grid — 80mm/Font A, 48 belgi.
// Ustunlar: mahsulot nomi(20) + miqdor(7, markazda) + jami(21, o'ngda) = 48
const int _kCols = 48;
const int _kNameW = 20;
const int _kQtyW = 7;
const int _kTotalW = _kCols - _kNameW - _kQtyW;

// "45,000" — web print-agent bilan bir xil (vergul bilan, probel emas)
String _fmt(num v) {
  final s = v.round().toString().replaceAllMapped(
    RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
    (m) => '${m[1]},',
  );
  return s;
}

String _money(num v) => '${_fmt(v)} sum';

String _pad(int n, int w) => n.toString().padLeft(w, '0');

String _center(String s, int w) {
  final pad = (w - s.length).clamp(0, w);
  final left = pad ~/ 2;
  final right = pad - left;
  return ' ' * left + s + ' ' * right;
}

// Web'dagi row() bilan bir xil: chap+o'ng ustunni WIDTH belgiga tekislaydi
String _row(String left, String right, {int width = _kCols}) {
  var l = left;
  var gap = width - l.length - right.length;
  if (gap < 1) {
    l = l.substring(0, (width - right.length - 1).clamp(0, l.length));
    gap = (width - l.length - right.length).clamp(1, width);
  }
  return l + ' ' * gap + right;
}

// Web (print-agent) bilan bir xil nomlanish — CARD="Karta" (Plastik karta emas),
// TRANSFER="O'tkazma" (Bank o'tkazma emas). INSTALLMENT web'da ham yo'q — xom qiymat
// chiqadi, bu web'dagi mavjud xatti-harakat, mobilda ham shu holat saqlanadi (parity).
const _paymentLabels = {
  'CASH': 'Naqd pul',
  'CARD': 'Karta',
  'TRANSFER': "O'tkazma",
  'DEBT': 'Qarz',
  'MIXED': 'Aralash',
};

String _paymentLabel(String m) =>
    (_paymentLabels[m.toUpperCase()] ?? m).toUpperCase();

Future<Uint8List> generateReceiptPdf({
  required Sale sale,
  required List<ReceiptItem> items,
  String storeName = 'MY SANTEX',
  String? storeAddress,
  String? storePhone,
  String? cashierName,
  PdfPageFormat? pageFormat,
}) async {
  final pdf = pw.Document();
  final courier = pw.Font.courier();
  final courierBold = pw.Font.courierBold();

  // Printer margin'larini ishonib bo'lmaydi — o'zimiz belgilaymiz
  final paperWidth = pageFormat?.width ?? (80 * PdfPageFormat.mm);
  const fixedMargin = 3 * PdfPageFormat.mm; // 3mm chap + o'ng
  final fmt = PdfPageFormat(
    paperWidth,
    double.infinity,
    marginLeft: fixedMargin,
    marginRight: fixedMargin,
    marginTop: 2 * PdfPageFormat.mm,
    marginBottom: 6 * PdfPageFormat.mm,
  );

  // Shrift o'lchami _kCols (48) belgi bir qatorga sig'adigan qilib hisoblanadi —
  // Courier: 1 belgi ≈ 0.6 × fontSize. Shu orqali web'dagi 48-ustunli grid bilan
  // bir xil qator uzunligi/qisqartirish chegarasi ta'minlanadi.
  final availableWidth = paperWidth - 2 * fixedMargin;
  final fs = availableWidth / (_kCols * 0.6);

  pw.Widget line(
    String s, {
    bool bold = false,
    double? size,
    pw.TextAlign align = pw.TextAlign.left,
  }) =>
      pw.Text(
        s,
        textAlign: align,
        style: pw.TextStyle(font: bold ? courierBold : courier, fontSize: size ?? fs, lineSpacing: 0),
      );

  // Bir qatorda ikki xil qalinlikdagi matn (masalan "Chek   : " oddiy + "#000123" qalin)
  pw.Widget line2(String a, String b, {bool aBold = false, bool bBold = false}) => pw.Row(
        mainAxisSize: pw.MainAxisSize.min,
        children: [
          pw.Text(a, style: pw.TextStyle(font: aBold ? courierBold : courier, fontSize: fs)),
          pw.Text(b, style: pw.TextStyle(font: bBold ? courierBold : courier, fontSize: fs)),
        ],
      );

  final sep = ''.padLeft(_kCols, '=');
  final dash = ''.padLeft(_kCols, '-');
  final dotted = (StringBuffer()..write('- ' * ((_kCols / 2).ceil()))).toString().substring(0, _kCols);

  final dt = DateTime.tryParse(sale.createdAt) ?? DateTime.now();
  final dateStr = '${_pad(dt.day, 2)}.${_pad(dt.month, 2)}.${dt.year} ${_pad(dt.hour, 2)}:${_pad(dt.minute, 2)}';
  final receiptId = '#${_pad(sale.receiptNo, 6)}';

  pdf.addPage(pw.Page(
    pageFormat: fmt,
    build: (ctx) => pw.Column(
      mainAxisSize: pw.MainAxisSize.min,
      crossAxisAlignment: pw.CrossAxisAlignment.stretch,
      children: [
        // ══════ SARLAVHA ══════
        line(sep),
        line(storeName, bold: true, size: fs * 1.7, align: pw.TextAlign.center),
        if (storeAddress != null && storeAddress.isNotEmpty) line(storeAddress, align: pw.TextAlign.center),
        if (storePhone != null && storePhone.isNotEmpty) line(storePhone, align: pw.TextAlign.center),
        line(sep),

        // ══════ CHEK MA'LUMOTLARI ══════
        line('Sana   : $dateStr'),
        if (cashierName != null && cashierName.isNotEmpty) line('Kassir : $cashierName'),
        line2('Chek   : ', receiptId, bBold: true),
        line(sep),

        // ══════ JADVAL SARLAVHASI ══════
        line('Mahsulot'.padRight(_kNameW) + _center('Miqdor', _kQtyW) + 'Jami'.padLeft(_kTotalW)),
        line(dash),

        // ══════ MAHSULOTLAR ══════
        ...items.asMap().entries.expand((e) {
          final idx = e.key;
          final item = e.value;
          final nm = item.name.length > _kNameW - 1
              ? '${item.name.substring(0, _kNameW - 3)}..'
              : item.name;
          final totalStr = _money(item.total);
          final rows = <pw.Widget>[
            line(nm.padRight(_kNameW) + _center('${item.quantity}', _kQtyW) + totalStr.padLeft(_kTotalW)),
            line(_money(item.unitPrice)),
          ];
          if (idx < items.length - 1) rows.add(line(dotted));
          return rows;
        }),

        // ══════ JAMI ══════
        line(sep),
        line(_row('Jami:', _money(sale.totalAmount)), bold: true),
        line(sep),

        // ══════ TO'LOV TURI ══════
        line(_row("To'lov turi:", _paymentLabel(sale.paymentMethod))),
        line(sep),

        // ══════ FOOTER ══════
        line('Xarid uchun rahmat!', bold: true, align: pw.TextAlign.center),
        line('Qaytib kelishingizni kutib qolamiz!', align: pw.TextAlign.center),
        line(sep),
        pw.SizedBox(height: fs * 2),
      ],
    ),
  ));

  return pdf.save();
}
