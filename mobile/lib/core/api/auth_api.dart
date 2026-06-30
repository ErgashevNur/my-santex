import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'client.dart';
import '../models/user.dart';

class AuthResult {
  final String? token;
  final User? user;
  final bool requireFaceVerification;
  final bool requireSetup;
  final String? userId;

  AuthResult({
    this.token,
    this.user,
    this.requireFaceVerification = false,
    this.requireSetup = false,
    this.userId,
  });
}

class AuthApi {
  final Dio _dio;
  AuthApi(this._dio);

  Future<AuthResult> loginWithPin(String pin) async {
    final res = await _dio.post('/auth/login', data: {'pin': pin});
    final data = res.data as Map<String, dynamic>;
    if (data['requireSetup'] == true) {
      return AuthResult(requireSetup: true, userId: data['userId']);
    }
    if (data['requireFaceVerification'] == true) {
      return AuthResult(requireFaceVerification: true, userId: data['userId']);
    }
    return AuthResult(
      token: data['token'],
      user: User.fromJson(data['user']),
    );
  }

  Future<User> getProfile() async {
    final res = await _dio.get('/auth/profile');
    return User.fromJson(res.data);
  }
}

final authApiProvider = Provider<AuthApi>((ref) => AuthApi(ref.watch(dioProvider)));
