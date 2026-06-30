class Category {
  final String id;
  final String name;

  Category({required this.id, required this.name});

  factory Category.fromJson(Map<String, dynamic> j) =>
      Category(id: j['id'] ?? '', name: j['name'] ?? '');
}

class Product {
  final String id;
  final String name;
  final String unit;
  final double costPrice;
  final double sellPrice;
  final double stock;
  final double minStock;
  final String? description;
  final String? categoryId;
  final Category? category;
  final String? barcode;
  final bool isActive;

  Product({
    required this.id,
    required this.name,
    required this.unit,
    required this.costPrice,
    required this.sellPrice,
    required this.stock,
    required this.minStock,
    this.description,
    this.categoryId,
    this.category,
    this.barcode,
    this.isActive = true,
  });

  factory Product.fromJson(Map<String, dynamic> j) => Product(
        id: j['id'] ?? '',
        name: j['name'] ?? '',
        unit: j['unit'] ?? 'PIECE',
        costPrice: (j['costPrice'] as num?)?.toDouble() ?? 0,
        sellPrice: (j['sellPrice'] as num?)?.toDouble() ?? 0,
        stock: (j['stock'] as num?)?.toDouble() ?? 0,
        minStock: (j['minStock'] as num?)?.toDouble() ?? 5,
        description: j['description'],
        categoryId: j['categoryId'],
        category: j['category'] != null ? Category.fromJson(j['category']) : null,
        barcode: j['barcode'],
        isActive: j['isActive'] ?? true,
      );

  bool get isLowStock => stock <= minStock;
}

const Map<String, String> unitLabels = {
  'PIECE': 'dona',
  'KG': 'kg',
  'LITER': 'litr',
  'METER': 'metr',
  'BOX': 'quti',
  'SET': "to'plam",
};
