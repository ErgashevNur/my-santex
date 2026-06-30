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

const Map<String, String> paymentLabels = {
  'CASH': 'Naqd',
  'CARD': 'Karta',
  'TRANSFER': "O'tkazma",
  'INSTALLMENT': 'Muddatli',
};

class SaleItem {
  final String id;
  final String productId;
  final String productName;
  final double quantity;
  final double unitPrice;
  final double totalPrice;

  SaleItem({
    required this.id,
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.unitPrice,
    required this.totalPrice,
  });

  factory SaleItem.fromJson(Map<String, dynamic> j) => SaleItem(
        id: j['id'] ?? '',
        productId: j['productId'] ?? '',
        productName: j['product']?['name'] ?? j['productName'] ?? '',
        quantity: _d(j['quantity']),
        unitPrice: _d(j['unitPrice']),
        totalPrice: _d(j['totalPrice']),
      );
}

class Sale {
  final String id;
  final int receiptNo;
  final double totalAmount;
  final String paymentMethod;
  final String? customerName;
  final String createdAt;
  final double discountAmount;
  final Map<String, dynamic>? user;
  final List<SaleItem> items;

  Sale({
    required this.id,
    required this.receiptNo,
    required this.totalAmount,
    required this.paymentMethod,
    this.customerName,
    required this.createdAt,
    this.discountAmount = 0,
    this.user,
    this.items = const [],
  });

  factory Sale.fromJson(Map<String, dynamic> j) => Sale(
        id: j['id'] ?? '',
        receiptNo: _i(j['receiptNo']),
        totalAmount: _d(j['totalAmount']),
        paymentMethod: j['paymentMethod'] ?? 'CASH',
        customerName: j['customerName'],
        createdAt: j['createdAt'] ?? DateTime.now().toIso8601String(),
        discountAmount: _d(j['discountAmount']),
        user: j['user'],
        items: (j['items'] as List<dynamic>?)
                ?.map((e) => SaleItem.fromJson(e))
                .toList() ??
            [],
      );
}

class SalesStats {
  final double todayRevenue;
  final int todaySalesCount;
  final double weekRevenue;
  final int weekSalesCount;
  final String? topProductName;

  SalesStats({
    required this.todayRevenue,
    required this.todaySalesCount,
    required this.weekRevenue,
    required this.weekSalesCount,
    this.topProductName,
  });

  factory SalesStats.fromJson(Map<String, dynamic> j) => SalesStats(
        todayRevenue: _d(j['today']?['revenue']),
        todaySalesCount: _i(j['today']?['salesCount']),
        weekRevenue: _d(j['week']?['revenue']),
        weekSalesCount: _i(j['week']?['salesCount']),
        topProductName: (() {
          final list = j['topProducts'] as List?;
          if (list == null || list.isEmpty) return null;
          final prod = list[0]['product'];
          if (prod == null) return null;
          return prod['name'] as String?;
        })(),
      );
}
