import 'dart:io';
import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

const String kBaseUrl = 'https://mysantex.uz/api';
// encryptedSharedPreferences: false — Samsung Keystore slowness fix
const _storage = FlutterSecureStorage(
  aOptions: AndroidOptions(encryptedSharedPreferences: false),
);

Dio buildDio() {
  final dio = Dio(BaseOptions(
    baseUrl: kBaseUrl,
    connectTimeout: const Duration(seconds: 20),
    receiveTimeout: const Duration(seconds: 20),
    headers: {'Content-Type': 'application/json'},
  ));

  // SSL sertifikat muammolarini hal qilish (VPS self-signed yoki zanjir xatosi)
  (dio.httpClientAdapter as IOHttpClientAdapter).createHttpClient = () {
    final client = HttpClient();
    client.badCertificateCallback = (cert, host, port) => true;
    return client;
  };

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
    // Server javob bergan xato
    final data = e.response?.data;
    if (data is Map && data['message'] != null) {
      final msg = data['message'];
      if (msg is List) return msg.join(', ');
      return msg.toString();
    }
    // Timeout
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout) {
      return 'Server bilan aloqa yo\'q (timeout)';
    }
    // Connection error
    if (e.type == DioExceptionType.connectionError) {
      return 'Internet aloqa yo\'q yoki server ishlamayapti';
    }
    // SSL / boshqa
    if (e.error != null) {
      return 'Xatolik: ${e.error.runtimeType} — ${e.message}';
    }
    if (e.response?.statusCode != null) {
      return 'Server xatosi: ${e.response?.statusCode}';
    }
  }
  return 'Xatolik: ${e.runtimeType} — $e';
}
