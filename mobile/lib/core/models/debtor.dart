double _d(dynamic v, {double def = 0}) {
  if (v == null) return def;
  if (v is num) return v.toDouble();
  return double.tryParse(v.toString()) ?? def;
}

int _i(dynamic v, {int def = 0}) {
  if (v == null) return def;
  if (v is int) return v;
  if (v is num) return v.toInt();
  return int.tryParse(v.toString()) ?? def;
}

class DebtTransaction {
  final String id;
  final String type;
  final double amount;
  final String? note;
  final String createdAt;

  DebtTransaction({
    required this.id,
    required this.type,
    required this.amount,
    this.note,
    required this.createdAt,
  });

  factory DebtTransaction.fromJson(Map<String, dynamic> j) => DebtTransaction(
        id: j['id'] ?? '',
        type: j['type'] ?? 'DEBT',
        amount: _d(j['amount']),
        note: j['note'],
        createdAt: j['createdAt'] ?? DateTime.now().toIso8601String(),
      );

  bool get isDebt => type == 'DEBT';
}

class Debtor {
  final String id;
  final String name;
  final String? phone;
  final double totalDebt;
  final String createdAt;
  final List<DebtTransaction> transactions;

  Debtor({
    required this.id,
    required this.name,
    this.phone,
    required this.totalDebt,
    required this.createdAt,
    this.transactions = const [],
  });

  factory Debtor.fromJson(Map<String, dynamic> j) => Debtor(
        id: j['id'] ?? '',
        name: j['name'] ?? '',
        phone: j['phone'],
        totalDebt: _d(j['totalDebt']),
        createdAt: j['createdAt'] ?? DateTime.now().toIso8601String(),
        transactions: (j['transactions'] as List<dynamic>?)
                ?.map((e) => DebtTransaction.fromJson(e))
                .toList() ??
            [],
      );

  bool get isInDebt => totalDebt > 0;
  String get initials => name.isNotEmpty ? name[0].toUpperCase() : '?';
}

class DebtorSummary {
  final double totalDebt;
  final int totalCount;

  DebtorSummary({required this.totalDebt, required this.totalCount});

  factory DebtorSummary.fromJson(Map<String, dynamic> j) => DebtorSummary(
        totalDebt: _d(j['_sum']?['totalDebt']),
        totalCount: _i(j['_count']?['id']),
      );
}
