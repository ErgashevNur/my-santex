import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'client.dart';
import '../models/debtor.dart';

class DebtorsApi {
  final Dio _dio;
  DebtorsApi(this._dio);

  Future<List<Debtor>> getAll() async {
    final res = await _dio.get('/debtors');
    return (res.data as List).map((e) => Debtor.fromJson(e)).toList();
  }

  Future<DebtorSummary> getSummary() async {
    final res = await _dio.get('/debtors/summary');
    return DebtorSummary.fromJson(res.data);
  }

  Future<Debtor> getOne(String id) async {
    final res = await _dio.get('/debtors/$id');
    return Debtor.fromJson(res.data);
  }

  Future<Debtor> create({required String name, String? phone}) async {
    final res = await _dio.post('/debtors', data: {
      'name': name,
      if (phone != null && phone.isNotEmpty) 'phone': phone,
    });
    return Debtor.fromJson(res.data);
  }

  Future<Debtor> update(String id, {String? name, String? phone}) async {
    final res = await _dio.patch('/debtors/$id', data: {
      if (name != null) 'name': name,
      if (phone != null) 'phone': phone,
    });
    return Debtor.fromJson(res.data);
  }

  Future<void> delete(String id) async {
    await _dio.delete('/debtors/$id');
  }

  Future<void> addDebt(String id, {required double amount, String? note}) async {
    await _dio.post('/debtors/$id/debt', data: {
      'amount': amount,
      if (note != null && note.isNotEmpty) 'note': note,
    });
  }

  Future<void> addPayment(String id, {required double amount, String? note}) async {
    await _dio.post('/debtors/$id/payment', data: {
      'amount': amount,
      if (note != null && note.isNotEmpty) 'note': note,
    });
  }
}

final debtorsApiProvider = Provider<DebtorsApi>((ref) => DebtorsApi(ref.watch(dioProvider)));
