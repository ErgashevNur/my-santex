import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'client.dart';

class StoreUser {
  final String id;
  final String name;
  final String? email;
  final String role;
  final String pin;
  final bool isActive;

  StoreUser({
    required this.id,
    required this.name,
    this.email,
    required this.role,
    required this.pin,
    required this.isActive,
  });

  factory StoreUser.fromJson(Map<String, dynamic> j) => StoreUser(
        id: j['id'] ?? '',
        name: j['name'] ?? '',
        email: j['email'],
        role: j['role'] ?? 'SALES_MANAGER',
        pin: j['pin'] ?? '',
        isActive: j['isActive'] ?? true,
      );
}

const Map<String, String> roleLabels = {
  'SUPER_ADMIN': 'Super Admin',
  'ROP': 'ROP',
  'SALES_MANAGER': 'Sotuv menejer',
};

class UsersApi {
  final Dio _dio;
  UsersApi(this._dio);

  Future<List<StoreUser>> getAll() async {
    final res = await _dio.get('/users');
    return (res.data as List).map((e) => StoreUser.fromJson(e)).toList();
  }

  Future<StoreUser> create(Map<String, dynamic> data) async {
    final res = await _dio.post('/users', data: data);
    return StoreUser.fromJson(res.data);
  }

  Future<StoreUser> update(String id, Map<String, dynamic> data) async {
    final res = await _dio.patch('/users/$id', data: data);
    return StoreUser.fromJson(res.data);
  }

  Future<void> toggleActive(String id) async {
    await _dio.patch('/users/$id/toggle-active');
  }
}

final usersApiProvider = Provider<UsersApi>((ref) => UsersApi(ref.watch(dioProvider)));
