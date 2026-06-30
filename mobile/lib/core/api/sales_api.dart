import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'client.dart';
import '../models/sale.dart';

class SalesApi {
  final Dio _dio;
  SalesApi(this._dio);

  Future<List<Sale>> getAll({String? date, String? userId, String? receiptNo, String? paymentMethod}) async {
    final res = await _dio.get('/sales', queryParameters: {
      if (date != null && date.isNotEmpty) 'date': date,
      if (userId != null && userId.isNotEmpty) 'userId': userId,
      if (receiptNo != null && receiptNo.isNotEmpty) 'receiptNo': receiptNo,
      if (paymentMethod != null && paymentMethod.isNotEmpty) 'paymentMethod': paymentMethod,
    });
    return (res.data as List).map((e) => Sale.fromJson(e)).toList();
  }

  Future<SalesStats> getStats() async {
    final res = await _dio.get('/sales/stats');
    return SalesStats.fromJson(res.data);
  }

  Future<Sale> getOne(String id) async {
    final res = await _dio.get('/sales/$id');
    return Sale.fromJson(res.data);
  }

  Future<Sale> create({
    required List<Map<String, dynamic>> items,
    required String paymentMethod,
    String? customerName,
  }) async {
    final res = await _dio.post('/sales', data: {
      'items': items,
      'paymentMethod': paymentMethod,
      if (customerName != null && customerName.isNotEmpty) 'customerName': customerName,
    });
    return Sale.fromJson(res.data);
  }
}

final salesApiProvider = Provider<SalesApi>((ref) => SalesApi(ref.watch(dioProvider)));
