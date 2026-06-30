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

      if (isInitializing && !isLoginPage) return '/login';
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
      GoRoute(path: '/splash', pageBuilder: (_, s) => _fade(s, const _SplashPage())),
      GoRoute(path: '/login', pageBuilder: (_, s) => _fade(s, const LoginPage())),
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(path: '/dashboard', pageBuilder: (_, s) => _fade(s, const DashboardPage())),
          GoRoute(path: '/products', pageBuilder: (_, s) => _fade(s, const ProductsPage())),
          GoRoute(path: '/sales', pageBuilder: (_, s) => _fade(s, const SalesPage())),
          GoRoute(path: '/users', pageBuilder: (_, s) => _fade(s, const UsersPage())),
          GoRoute(path: '/debtors', pageBuilder: (_, s) => _fade(s, const DebtorsPage())),
          GoRoute(
            path: '/debtors/:id',
            pageBuilder: (_, s) => _slide(s, DebtorDetailPage(id: s.pathParameters['id']!)),
          ),
          GoRoute(path: '/admin', pageBuilder: (_, s) => _fade(s, const AdminDashboardPage())),
          GoRoute(path: '/admin/stores', pageBuilder: (_, s) => _fade(s, const AdminStoresPage())),
          GoRoute(path: '/admin/notifications', pageBuilder: (_, s) => _fade(s, const AdminNotificationsPage())),
        ],
      ),
    ],
  );
});

CustomTransitionPage<void> _fade(GoRouterState s, Widget child) =>
    CustomTransitionPage<void>(
      key: s.pageKey,
      child: child,
      transitionDuration: const Duration(milliseconds: 220),
      transitionsBuilder: (_, animation, _, child) => FadeTransition(
        opacity: CurvedAnimation(parent: animation, curve: Curves.easeOut),
        child: child,
      ),
    );

CustomTransitionPage<void> _slide(GoRouterState s, Widget child) =>
    CustomTransitionPage<void>(
      key: s.pageKey,
      child: child,
      transitionDuration: const Duration(milliseconds: 280),
      transitionsBuilder: (_, animation, secondary, child) {
        final tween = Tween(begin: const Offset(1.0, 0.0), end: Offset.zero)
            .chain(CurveTween(curve: Curves.easeOutCubic));
        return SlideTransition(
          position: animation.drive(tween),
          child: FadeTransition(
            opacity: CurvedAnimation(parent: animation, curve: Curves.easeOut),
            child: child,
          ),
        );
      },
    );

class _SplashPage extends StatelessWidget {
  const _SplashPage();
  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Color(0xFF2563EB),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.store_outlined, size: 72, color: Colors.white),
            SizedBox(height: 16),
            Text(
              'My Santex',
              style: TextStyle(
                color: Colors.white,
                fontSize: 28,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.5,
              ),
            ),
            SizedBox(height: 8),
            Text(
              'Sotuv va Ombor Tizimi',
              style: TextStyle(color: Color(0xFFBFDBFE), fontSize: 14),
            ),
            SizedBox(height: 48),
            SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white70),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class GoRouterRefreshStream extends ChangeNotifier {
  final Ref _ref;

  GoRouterRefreshStream(this._ref, AuthNotifier _) {
    _ref.listen(authProvider, (_, _) => notifyListeners());
  }
}
