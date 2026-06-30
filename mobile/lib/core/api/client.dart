import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

const String kBaseUrl = 'https://mysantex.uz/api';
const _storage = FlutterSecureStorage();

Dio buildDio() {
  final dio = Dio(BaseOptions(
    baseUrl: kBaseUrl,
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 15),
    headers: {'Content-Type': 'application/json'},
  ));

  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) async {
      final token = await _storage.read(key: 'token');
      if (token != null) {
        options.headers['Authorization'] = 'Bearer $token';
      }
      handler.next(options);
    },
    onError: (error, handler) async {
      if (error.response?.statusCode == 401) {
        final hadToken = error.requestOptions.headers.containsKey('Authorization');
        if (hadToken) {
          await _storage.delete(key: 'token');
        }
      }
      handler.next(error);
    },
  ));

  return dio;
}

final dioProvider = Provider<Dio>((ref) => buildDio());

Future<String?> getToken() => _storage.read(key: 'token');
Future<void> saveToken(String token) => _storage.write(key: 'token', value: token);
Future<void> deleteToken() => _storage.delete(key: 'token');

String extractError(dynamic e) {
  if (e is DioException) {
    final data = e.response?.data;
    if (data is Map && data['message'] != null) {
      final msg = data['message'];
      if (msg is List) return msg.join(', ');
      return msg.toString();
    }
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout) {
      return 'Server bilan aloqa yo\'q';
    }
  }
  return 'Xatolik yuz berdi';
}
