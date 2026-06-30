import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/sales_api.dart';
import '../../core/api/products_api.dart';
import '../../core/models/sale.dart';
import '../../core/models/product.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../utils/formatters.dart';
import '../../widgets/shimmer_box.dart';

final _statsProvider = FutureProvider<SalesStats>((ref) => ref.read(salesApiProvider).getStats());
final _recentSalesProvider = FutureProvider<List<Sale>>((ref) => ref.read(salesApiProvider).getAll());
final _lowStockProvider = FutureProvider<List<Product>>(
  (ref) => ref.read(productsApiProvider).getAll(lowStock: true),
);

class DashboardPage extends ConsumerWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final stats = ref.watch(_statsProvider);
    final lowStock = ref.watch(_lowStockProvider);
    final recentSales = ref.watch(_recentSalesProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(_statsProvider);
          ref.invalidate(_lowStockProvider);
          ref.invalidate(_recentSalesProvider);
        },
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              title: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Xush kelibsiz, ${user?.name ?? ''}!',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                  const Text('Bugungi holat',
                      style: TextStyle(fontSize: 12, color: AppColors.slate400, fontWeight: FontWeight.w400)),
                ],
              ),
              floating: true,
              backgroundColor: AppColors.bg,
              elevation: 0,
              actions: [
                IconButton(
                  icon: const Icon(Icons.logout_outlined, color: AppColors.slate400),
                  onPressed: () => ref.read(authProvider.notifier).logout(),
                ),
              ],
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  // Stats 2x2 grid
                  stats.when(
                    data: (s) => _StatsGrid(stats: s, lowStockCount: lowStock.value?.length ?? 0),
                    loading: () => _SkeletonGrid(),
                    error: (e, _) => _ErrorCard(message: e.toString()),
                  ),
                  const SizedBox(height: 16),
                  // Low stock
                  lowStock.when(
                    data: (products) => _LowStockCard(products: products),
                    loading: () => _SkeletonCard(height: 200),
                    error: (e, _) => _ErrorCard(message: e.toString()),
                  ),
                  const SizedBox(height: 16),
                  // Recent sales
                  recentSales.when(
                    data: (sales) => _RecentSalesCard(sales: sales),
                    loading: () => _SkeletonCard(height: 250),
                    error: (e, _) => _ErrorCard(message: e.toString()),
                  ),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatsGrid extends StatelessWidget {
  final SalesStats stats;
  final int lowStockCount;
  const _StatsGrid({required this.stats, required this.lowStockCount});

  @override
  Widget build(BuildContext context) {
    final cards = [
      _StatCard('Bugungi daromad', formatCurrency(stats.todayRevenue), Icons.trending_up,
          AppColors.green, const Color(0xFFF0FDF4), '${stats.todaySalesCount} ta sotuv'),
      _StatCard('Haftalik daromad', formatCurrency(stats.weekRevenue), Icons.shopping_cart_outlined,
          AppColors.primary, AppColors.primaryLight, '${stats.weekSalesCount} ta sotuv'),
      _StatCard("Kam qolgan tovar", lowStockCount.toString(), Icons.warning_amber_outlined,
          AppColors.amber, AppColors.amberLight, "Zaxira to'ldiring"),
      _StatCard('Top mahsulot', stats.topProductName ?? '—', Icons.inventory_2_outlined,
          AppColors.purple, AppColors.purpleLight, 'Bugun eng ko\'p'),
    ];
    return GridView.count(
      crossAxisCount: 2, shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12, mainAxisSpacing: 12,
      childAspectRatio: 1.4,
      children: cards.map((c) => _StatCardWidget(card: c)).toList(),
    );
  }
}

class _StatCard {
  final String title, value, sub;
  final IconData icon;
  final Color color, bg;
  _StatCard(this.title, this.value, this.icon, this.color, this.bg, this.sub);
}

class _StatCardWidget extends StatelessWidget {
  final _StatCard card;
  const _StatCardWidget({required this.card});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: card.bg, borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(card.icon, color: card.color, size: 20),
          const Spacer(),
          Text(card.title, style: const TextStyle(fontSize: 11, color: AppColors.slate500)),
          const SizedBox(height: 2),
          Text(card.value,
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: card.color),
              maxLines: 1, overflow: TextOverflow.ellipsis),
          Text(card.sub, style: const TextStyle(fontSize: 11, color: AppColors.slate400)),
        ],
      ),
    );
  }
}

class _LowStockCard extends StatelessWidget {
  final List<Product> products;
  const _LowStockCard({required this.products});
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.slate100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                const Icon(Icons.warning_amber_outlined, color: AppColors.amber, size: 18),
                const SizedBox(width: 8),
                const Expanded(child: Text('Kam qolgan tovarlar',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.slate800))),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(color: AppColors.amberLight, borderRadius: BorderRadius.circular(20)),
                  child: Text('${products.length} ta',
                      style: const TextStyle(fontSize: 11, color: AppColors.amber, fontWeight: FontWeight.w600)),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.slate100),
          if (products.isEmpty)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: Text('Barcha tovarlar yetarli ✓',
                  style: TextStyle(color: AppColors.slate400, fontSize: 13))),
            )
          else
            ...products.take(6).map((p) => _ProductRow(product: p)),
        ],
      ),
    );
  }
}

class _ProductRow extends StatelessWidget {
  final Product product;
  const _ProductRow({required this.product});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AppColors.slate100)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(product.name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.slate700)),
              if (product.category != null)
                Text(product.category!.name, style: const TextStyle(fontSize: 11, color: AppColors.slate400)),
            ]),
          ),
          RichText(text: TextSpan(children: [
            TextSpan(text: product.stock.toStringAsFixed(product.stock == product.stock.truncateToDouble() ? 0 : 1),
                style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.red, fontSize: 14)),
            TextSpan(text: ' / ${product.minStock.toInt()}',
                style: const TextStyle(color: AppColors.slate400, fontSize: 12)),
          ])),
        ],
      ),
    );
  }
}

class _RecentSalesCard extends StatelessWidget {
  final List<Sale> sales;
  const _RecentSalesCard({required this.sales});
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.slate100),
      ),
      child: Column(children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(children: [
            const Icon(Icons.shopping_cart_outlined, color: AppColors.primary, size: 18),
            const SizedBox(width: 8),
            const Text("So'nggi sotuvlar",
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.slate800)),
          ]),
        ),
        const Divider(height: 1, color: AppColors.slate100),
        if (sales.isEmpty)
          const Padding(
            padding: EdgeInsets.all(24),
            child: Center(child: Text('Sotuvlar mavjud emas',
                style: TextStyle(color: AppColors.slate400, fontSize: 13))),
          )
        else
          ...sales.take(8).map((s) => Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.slate100))),
            child: Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(s.customerName ?? "Noma'lum mijoz",
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.slate700)),
                Text(formatDate(s.createdAt),
                    style: const TextStyle(fontSize: 11, color: AppColors.slate400)),
              ])),
              Text(formatCurrency(s.totalAmount),
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.green)),
            ]),
          )),
      ]),
    );
  }
}

class _SkeletonGrid extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2, shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12, mainAxisSpacing: 12,
      childAspectRatio: 1.4,
      children: List.generate(4, (_) => ShimmerBox(height: 90, radius: 16)),
    );
  }
}

class _SkeletonCard extends StatelessWidget {
  final double height;
  const _SkeletonCard({required this.height});
  @override
  Widget build(BuildContext context) => ShimmerBox(height: height, radius: 16);
}

class _ErrorCard extends StatelessWidget {
  final String message;
  const _ErrorCard({required this.message});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppColors.redLight, borderRadius: BorderRadius.circular(16)),
      child: Text(message, style: const TextStyle(color: AppColors.red, fontSize: 13)),
    );
  }
}

