import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/auth_provider.dart';
import '../../pages/auth/login_page.dart';
import '../../pages/dashboard/dashboard_page.dart';
import '../../pages/products/products_page.dart';
import '../../pages/sales/sales_page.dart';
import '../../pages/debtors/debtors_page.dart';
import '../../pages/debtors/debtor_detail_page.dart';
import '../../pages/users/users_page.dart';
import '../../pages/admin/admin_dashboard_page.dart';
import '../../pages/admin/admin_stores_page.dart';
import '../../pages/admin/admin_notifications_page.dart';
import '../../widgets/app_shell.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authNotifier = ref.watch(authProvider.notifier);

  return GoRouter(
    refreshListenable: GoRouterRefreshStream(ref, authNotifier),
    redirect: (context, state) {
      final authState = ref.read(authProvider);
      final isInitializing = authState.status == AuthStatus.initializing;
      final isAuth = authState.status == AuthStatus.authenticated;
      final isLoginPage = state.matchedLocation == '/login';

      if (isInitializing) return '/splash';
      if (!isAuth && !isLoginPage) return '/login';
      if (isAuth && isLoginPage) {
        final user = authState.user;
        if (user?.isSuperAdmin == true) return '/admin';
        if (user?.isDebtStore == true) return '/debtors';
        return '/dashboard';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const _SplashPage()),
      GoRoute(path: '/login', builder: (_, __) => const LoginPage()),
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(path: '/dashboard', builder: (_, __) => const DashboardPage()),
          GoRoute(path: '/products', builder: (_, __) => const ProductsPage()),
          GoRoute(path: '/sales', builder: (_, __) => const SalesPage()),
          GoRoute(path: '/users', builder: (_, __) => const UsersPage()),
          GoRoute(path: '/debtors', builder: (_, __) => const DebtorsPage()),
          GoRoute(
            path: '/debtors/:id',
            builder: (_, state) => DebtorDetailPage(id: state.pathParameters['id']!),
          ),
          GoRoute(path: '/admin', builder: (_, __) => const AdminDashboardPage()),
          GoRoute(path: '/admin/stores', builder: (_, __) => const AdminStoresPage()),
          GoRoute(path: '/admin/notifications', builder: (_, __) => const AdminNotificationsPage()),
        ],
      ),
    ],
  );
});

class _SplashPage extends StatelessWidget {
  const _SplashPage();
  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }
}

class GoRouterRefreshStream extends ChangeNotifier {
  final Ref _ref;
  final AuthNotifier _notifier;

  GoRouterRefreshStream(this._ref, this._notifier) {
    _ref.listen(authProvider, (_, __) => notifyListeners());
  }
}
