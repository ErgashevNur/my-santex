import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'client.dart';
import '../models/product.dart';

class ProductsApi {
  final Dio _dio;
  ProductsApi(this._dio);

  Future<List<Product>> getAll({String? search, String? categoryId, bool? lowStock}) async {
    final res = await _dio.get('/products', queryParameters: {
      if (search != null && search.isNotEmpty) 'search': search,
      if (categoryId != null && categoryId.isNotEmpty) 'categoryId': categoryId,
      if (lowStock == true) 'lowStock': 'true',
    });
    return (res.data as List).map((e) => Product.fromJson(e)).toList();
  }

  Future<Product> getByBarcode(String barcode) async {
    final res = await _dio.get('/products/barcode/$barcode');
    return Product.fromJson(res.data);
  }

  Future<Product> create(Map<String, dynamic> data) async {
    final res = await _dio.post('/products', data: data);
    return Product.fromJson(res.data);
  }

  Future<Product> update(String id, Map<String, dynamic> data) async {
    final res = await _dio.put('/products/$id', data: data);
    return Product.fromJson(res.data);
  }

  Future<void> addStock(String id, double quantity) async {
    await _dio.patch('/products/$id/stock', data: {'quantity': quantity});
  }

  Future<void> delete(String id) async {
    await _dio.delete('/products/$id');
  }

  Future<List<Category>> getCategories() async {
    final res = await _dio.get('/categories');
    return (res.data as List).map((e) => Category.fromJson(e)).toList();
  }
}

final productsApiProvider = Provider<ProductsApi>((ref) => ProductsApi(ref.watch(dioProvider)));
