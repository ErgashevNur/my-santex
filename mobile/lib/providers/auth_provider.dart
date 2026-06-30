import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/api/auth_api.dart';
import '../core/api/client.dart';
import '../core/models/user.dart';

enum AuthStatus { initializing, unauthenticated, authenticated }

class AuthState {
  final AuthStatus status;
  final User? user;
  final bool isLoading;

  const AuthState({
    this.status = AuthStatus.initializing,
    this.user,
    this.isLoading = false,
  });

  AuthState copyWith({AuthStatus? status, User? user, bool? isLoading, bool clearUser = false}) {
    return AuthState(
      status: status ?? this.status,
      user: clearUser ? null : (user ?? this.user),
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthApi _api;

  AuthNotifier(this._api) : super(const AuthState()) {
    _initialize();
  }

  Future<void> _initialize() async {
    final token = await getToken();
    if (token == null) {
      state = state.copyWith(status: AuthStatus.unauthenticated, clearUser: true);
      return;
    }
    try {
      final user = await _api.getProfile();
      state = state.copyWith(status: AuthStatus.authenticated, user: user);
    } catch (_) {
      state = state.copyWith(status: AuthStatus.unauthenticated, clearUser: true);
    }
  }

  Future<AuthResult> loginWithPin(String pin) async {
    state = state.copyWith(isLoading: true);
    try {
      final result = await _api.loginWithPin(pin);
      if (result.token != null && result.user != null) {
        await saveToken(result.token!);
        state = AuthState(status: AuthStatus.authenticated, user: result.user);
      } else {
        state = state.copyWith(isLoading: false);
      }
      return result;
    } catch (e) {
      state = state.copyWith(isLoading: false);
      rethrow;
    }
  }

  Future<void> logout() async {
    await deleteToken();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(authApiProvider));
});
