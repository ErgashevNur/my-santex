import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/client.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';

final _adminStatsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final dio = ref.read(dioProvider);
  try {
    final res = await dio.get('/admin/dashboard');
    return res.data as Map<String, dynamic>;
  } catch (_) {
    return {};
  }
});

class AdminDashboardPage extends ConsumerWidget {
  const AdminDashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stats = ref.watch(_adminStatsProvider);
    final user = ref.watch(authProvider).user;

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Text('Admin Panel'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_outlined, color: AppColors.slate400),
            onPressed: () => ref.read(authProvider.notifier).logout(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(_adminStatsProvider),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
          children: [
            // Salom
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Xush kelibsiz, ${user?.name ?? ''}!',
                    style: const TextStyle(color: AppColors.white, fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                const Text('Admin boshqaruv paneli',
                    style: TextStyle(color: Color(0xFFBFDBFE), fontSize: 13)),
              ]),
            ),
            const SizedBox(height: 16),
            // Stats
            stats.when(
              data: (data) {
                final totalStores = data['totalStores'] ?? 0;
                final activeStores = data['activeStores'] ?? 0;
                final totalUsers = data['totalUsers'] ?? 0;
                return GridView.count(
                  crossAxisCount: 2, shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 12, mainAxisSpacing: 12,
                  childAspectRatio: 1.5,
                  children: [
                    _AdminStat("Do'konlar", totalStores.toString(), Icons.store_outlined, AppColors.primary, AppColors.primaryLight),
                    _AdminStat("Faol do'konlar", activeStores.toString(), Icons.check_circle_outline, AppColors.green, AppColors.greenLight),
                    _AdminStat("Foydalanuvchilar", totalUsers.toString(), Icons.people_outlined, AppColors.purple, AppColors.purpleLight),
                    _AdminStat("Bugun aktiv", (data['todayActive'] ?? 0).toString(), Icons.trending_up, AppColors.amber, AppColors.amberLight),
                  ],
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: AppColors.redLight, borderRadius: BorderRadius.circular(12)),
                child: Text('Statistika yuklanmadi: ${extractError(e)}',
                    style: const TextStyle(color: AppColors.red, fontSize: 13)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AdminStat extends StatelessWidget {
  final String label, value;
  final IconData icon;
  final Color color, bg;
  const _AdminStat(this.label, this.value, this.icon, this.color, this.bg);
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(16)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Icon(icon, color: color, size: 22),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: color)),
          Text(label, style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
        ]),
      ]),
    );
  }
}
