import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../core/theme/app_theme.dart';

class AppShell extends ConsumerWidget {
  final Widget child;
  const AppShell({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final location = GoRouterState.of(context).matchedLocation;

    final navItems = _buildNavItems(user);
    final currentIndex = _currentIndex(location, navItems);

    return Scaffold(
      body: child,
      bottomNavigationBar: navItems.isEmpty
          ? null
          : Container(
              decoration: const BoxDecoration(
                color: AppColors.white,
                border: Border(top: BorderSide(color: AppColors.slate100)),
              ),
              child: SafeArea(
                child: SizedBox(
                  height: 60,
                  child: Row(
                    children: navItems.asMap().entries.map((entry) {
                      final i = entry.key;
                      final item = entry.value;
                      final isActive = i == currentIndex;
                      return Expanded(
                        child: InkWell(
                          onTap: () => context.go(item.path),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                item.icon,
                                size: 22,
                                color: isActive ? AppColors.primary : AppColors.slate400,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                item.label,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
                                  color: isActive ? AppColors.primary : AppColors.slate400,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
            ),
    );
  }

  List<_NavItem> _buildNavItems(user) {
    if (user == null) return [];
    if (user.isSuperAdmin) {
      return [
        _NavItem('/admin', Icons.dashboard_outlined, 'Asosiy'),
        _NavItem('/admin/stores', Icons.store_outlined, "Do'konlar"),
        _NavItem('/admin/notifications', Icons.notifications_outlined, 'Bildirishnoma'),
      ];
    }
    if (user.isDebtStore) {
      return [_NavItem('/debtors', Icons.account_balance_wallet_outlined, 'Qarzdorlar')];
    }
    return [
      _NavItem('/dashboard', Icons.dashboard_outlined, 'Asosiy'),
      _NavItem('/products', Icons.inventory_2_outlined, 'Tovarlar'),
      _NavItem('/sales', Icons.shopping_cart_outlined, 'Sotuv'),
      if (user.isROP || user.isSuperAdmin)
        _NavItem('/users', Icons.people_outlined, 'Xodimlar'),
    ];
  }

  int _currentIndex(String location, List<_NavItem> items) {
    for (var i = 0; i < items.length; i++) {
      if (location.startsWith(items[i].path)) return i;
    }
    return 0;
  }
}

class _NavItem {
  final String path;
  final IconData icon;
  final String label;
  _NavItem(this.path, this.icon, this.label);
}
