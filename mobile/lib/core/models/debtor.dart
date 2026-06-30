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
        amount: (j['amount'] as num?)?.toDouble() ?? 0,
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
        totalDebt: (j['totalDebt'] as num?)?.toDouble() ?? 0,
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
        totalDebt: (j['_sum']?['totalDebt'] as num?)?.toDouble() ?? 0,
        totalCount: j['_count']?['id'] ?? 0,
      );
}
