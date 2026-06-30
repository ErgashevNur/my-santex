import 'package:intl/intl.dart';

String formatCurrency(num amount) {
  final formatter = NumberFormat('#,##0', 'uz');
  return "${formatter.format(amount).replaceAll(',', ' ')} so'm";
}

String formatDate(String iso) {
  final d = DateTime.parse(iso).toLocal();
  return '${d.day.toString().padLeft(2, '0')}.${d.month.toString().padLeft(2, '0')}.${d.year}';
}

String formatDateTime(String iso) {
  final d = DateTime.parse(iso).toLocal();
  return '${d.day.toString().padLeft(2, '0')}.${d.month.toString().padLeft(2, '0')}.${d.year} '
      '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
}
