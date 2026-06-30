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
        quantity: (j['quantity'] as num?)?.toDouble() ?? 0,
        unitPrice: (j['unitPrice'] as num?)?.toDouble() ?? 0,
        totalPrice: (j['totalPrice'] as num?)?.toDouble() ?? 0,
      );
}

class Sale {
  final String id;
  final int receiptNo;
  final double totalAmount;
  final String paymentMethod;
  final String? customerName;
  final String createdAt;
  final Map<String, dynamic>? user;
  final List<SaleItem> items;

  Sale({
    required this.id,
    required this.receiptNo,
    required this.totalAmount,
    required this.paymentMethod,
    this.customerName,
    required this.createdAt,
    this.user,
    this.items = const [],
  });

  factory Sale.fromJson(Map<String, dynamic> j) => Sale(
        id: j['id'] ?? '',
        receiptNo: j['receiptNo'] ?? 0,
        totalAmount: (j['totalAmount'] as num?)?.toDouble() ?? 0,
        paymentMethod: j['paymentMethod'] ?? 'CASH',
        customerName: j['customerName'],
        createdAt: j['createdAt'] ?? DateTime.now().toIso8601String(),
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
        todayRevenue: (j['today']?['revenue'] as num?)?.toDouble() ?? 0,
        todaySalesCount: j['today']?['salesCount'] ?? 0,
        weekRevenue: (j['week']?['revenue'] as num?)?.toDouble() ?? 0,
        weekSalesCount: j['week']?['salesCount'] ?? 0,
        topProductName: (j['topProducts'] as List?)?.isNotEmpty == true
            ? j['topProducts'][0]['product']?['name']
            : null,
      );
}
