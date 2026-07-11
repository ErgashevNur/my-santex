import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/sale.dart';
import '../../utils/receipt_pdf.dart' show ReceiptItem;

// Web (frontend/src/lib/printViaAgent.ts) chaqirayotgan xuddi shu print-agent'ga
// LAN orqali ulanadi — ikkalasi ham bir xil buildReceipt() ni ishlatgani uchun
// natija baytma-bayt bir xil bo'ladi (PDF/OS print-dialog emas).
const _storage = FlutterSecureStorage(
  aOptions: AndroidOptions(encryptedSharedPreferences: false),
);
const _kAgentAddressKey = 'printAgentAddress';

Future<String?> getPrintAgentAddress() => _storage.read(key: _kAgentAddressKey);

Future<void> savePrintAgentAddress(String address) =>
    _storage.write(key: _kAgentAddressKey, value: address.trim());

class PrintAgentResult {
  final bool ok;
  final String? error;
  const PrintAgentResult({required this.ok, this.error});
}

Future<PrintAgentResult> printViaAgent({
  required Sale sale,
  required List<ReceiptItem> items,
  required String storeName,
  String? storeAddress,
  String? storePhone,
  String? cashierName,
}) async {
  final address = (await getPrintAgentAddress())?.trim();
  if (address == null || address.isEmpty) {
    return const PrintAgentResult(
      ok: false,
      error: "Printer manzili sozlanmagan. Yuqoridagi printer belgisi orqali sozlang.",
    );
  }

  final dio = Dio(BaseOptions(
    connectTimeout: const Duration(seconds: 4),
    sendTimeout: const Duration(seconds: 4),
    receiveTimeout: const Duration(seconds: 6),
  ));

  final body = {
    'receiptNo': sale.receiptNo,
    'createdAt': sale.createdAt,
    'totalAmount': sale.totalAmount,
    'paymentMethod': sale.paymentMethod,
    'store': {
      'name': storeName,
      'address': ?storeAddress,
      'phone': ?storePhone,
    },
    'user': {'name': cashierName ?? ''},
    'items': items
        .map((it) => {
              'product': {'name': it.name},
              'quantity': it.quantity,
              'unitPrice': it.unitPrice,
              'totalPrice': it.total,
            })
        .toList(),
  };

  try {
    final res = await dio.post('http://$address/print', data: body);
    final data = res.data;
    if (data is Map && data['ok'] == false) {
      return PrintAgentResult(ok: false, error: data['error']?.toString() ?? "Noma'lum xato");
    }
    return const PrintAgentResult(ok: true);
  } on DioException catch (e) {
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout ||
        e.type == DioExceptionType.sendTimeout) {
      return const PrintAgentResult(
        ok: false,
        error: "Printer bilan aloqa vaqti tugadi. Kabel yoki Wi-Fi ulanishini tekshiring.",
      );
    }
    if (e.type == DioExceptionType.connectionError) {
      return const PrintAgentResult(
        ok: false,
        error: "Printerga ulanib bo'lmadi. Print-agent ishga tushirilganini, kabel/tarmoq ulanganini "
            "va telefon bilan bir xil Wi-Fi'da ekaningizni tekshiring.",
      );
    }
    final data = e.response?.data;
    if (data is Map && data['error'] != null) {
      return PrintAgentResult(ok: false, error: data['error'].toString());
    }
    return PrintAgentResult(ok: false, error: 'Xatolik: ${e.message}');
  } catch (e) {
    return PrintAgentResult(ok: false, error: 'Kutilmagan xato: $e');
  }
}
