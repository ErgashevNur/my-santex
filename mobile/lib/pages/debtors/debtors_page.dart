import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/debtors_api.dart';
import '../../core/api/client.dart';
import '../../core/models/debtor.dart';
import '../../core/theme/app_theme.dart';
import '../../utils/formatters.dart';

final debtorsProvider = FutureProvider<List<Debtor>>(
  (ref) => ref.read(debtorsApiProvider).getAll(),
);

final debtorSummaryProvider = FutureProvider<DebtorSummary>(
  (ref) => ref.read(debtorsApiProvider).getSummary(),
);

class DebtorsPage extends ConsumerStatefulWidget {
  const DebtorsPage({super.key});
  @override
  ConsumerState<DebtorsPage> createState() => _DebtorsPageState();
}

class _DebtorsPageState extends ConsumerState<DebtorsPage> {
  String _search = '';
  final _searchCtrl = TextEditingController();

  @override
  void dispose() { _searchCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final debtors = ref.watch(debtorsProvider);
    final summary = ref.watch(debtorSummaryProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: RefreshIndicator(
        color: AppColors.red,
        onRefresh: () async {
          ref.invalidate(debtorsProvider);
          ref.invalidate(debtorSummaryProvider);
        },
        child: CustomScrollView(
          slivers: [
            // Red header
            SliverAppBar(
              expandedHeight: 170,
              pinned: true,
              backgroundColor: AppColors.red,
              foregroundColor: AppColors.white,
              title: const Text('Qarzdorlar', style: TextStyle(color: AppColors.white, fontWeight: FontWeight.w700)),
              actions: [
                IconButton(
                  icon: const Icon(Icons.add, color: AppColors.white),
                  onPressed: () => _showAddModal(context),
                ),
              ],
              flexibleSpace: FlexibleSpaceBar(
                background: Container(
                  color: AppColors.red,
                  child: Align(
                    alignment: Alignment.bottomLeft,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      child: summary.maybeWhen(
                        data: (s) => Row(children: [
                          _SummaryChip(
                            label: 'Umumiy qarz',
                            value: formatCurrency(s.totalDebt),
                            icon: Icons.trending_down,
                          ),
                          const SizedBox(width: 12),
                          _SummaryChip(
                            label: 'Qarzdorlar',
                            value: '${s.totalCount} ta',
                            icon: Icons.people_outlined,
                          ),
                        ]),
                        orElse: () => const SizedBox.shrink(),
                      ),
                    ),
                  ),
                ),
              ),
            ),

            // Search bar
            SliverToBoxAdapter(
              child: Container(
                color: AppColors.red,
                child: Container(
                  decoration: const BoxDecoration(
                    color: AppColors.bg,
                    borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                  ),
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: TextField(
                    controller: _searchCtrl,
                    decoration: InputDecoration(
                      hintText: 'Ism yoki telefon...',
                      prefixIcon: const Icon(Icons.search, color: AppColors.slate400, size: 20),
                      suffixIcon: _search.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.close, size: 18),
                              onPressed: () { _searchCtrl.clear(); setState(() => _search = ''); },
                            )
                          : null,
                    ),
                    onChanged: (v) => setState(() => _search = v),
                  ),
                ),
              ),
            ),

            // List
            debtors.when(
              data: (list) {
                final filtered = _search.isEmpty
                    ? list
                    : list.where((d) =>
                        d.name.toLowerCase().contains(_search.toLowerCase()) ||
                        (d.phone ?? '').contains(_search)).toList();

                if (filtered.isEmpty) {
                  return SliverFillRemaining(
                    child: Center(
                      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                        Text(_search.isNotEmpty ? '🔍' : '👤', style: const TextStyle(fontSize: 40)),
                        const SizedBox(height: 8),
                        Text(
                          _search.isNotEmpty ? 'Topilmadi' : "Hali qarzdor yo'q",
                          style: const TextStyle(color: AppColors.slate400),
                        ),
                        if (_search.isEmpty) ...[
                          const SizedBox(height: 12),
                          TextButton(
                            onPressed: () => _showAddModal(context),
                            child: const Text("Birinchi qarzdorni qo'shish",
                                style: TextStyle(color: AppColors.red, fontWeight: FontWeight.w600)),
                          ),
                        ],
                      ]),
                    ),
                  );
                }

                return SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (_, i) {
                        if (i == filtered.length) {
                          if (filtered.length <= 1) return null;
                          final total = filtered.fold(0.0, (s, d) => s + d.totalDebt);
                          return Container(
                            margin: const EdgeInsets.only(top: 8),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            decoration: BoxDecoration(
                              color: AppColors.slate100, borderRadius: BorderRadius.circular(16),
                            ),
                            child: Row(children: [
                              const Expanded(child: Text('Jami qarz',
                                  style: TextStyle(fontWeight: FontWeight.w500, color: AppColors.slate600))),
                              Text(formatCurrency(total),
                                  style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.red)),
                            ]),
                          );
                        }
                        final d = filtered[i];
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8, top: i == 0 ? 8 : 0),
                          child: _DebtorCard(debtor: d,
                            onTap: () => context.push('/debtors/${d.id}'),
                          ),
                        );
                      },
                      childCount: filtered.length + 1,
                    ),
                  ),
                );
              },
              loading: () => SliverFillRemaining(
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: 4,
                  itemBuilder: (_, __) => Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    height: 72,
                    decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              ),
              error: (e, _) => SliverFillRemaining(
                child: Center(child: Text(extractError(e), style: const TextStyle(color: AppColors.red))),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAddModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AddDebtorSheet(onAdded: (id) {
        ref.invalidate(debtorsProvider);
        ref.invalidate(debtorSummaryProvider);
        if (mounted) context.push('/debtors/$id');
      }),
    );
  }
}

class _SummaryChip extends StatelessWidget {
  final String label, value;
  final IconData icon;
  const _SummaryChip({required this.label, required this.value, required this.icon});
  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(16),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Icon(icon, color: Colors.white.withOpacity(0.7), size: 14),
            const SizedBox(width: 6),
            Text(label, style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 11)),
          ]),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(color: AppColors.white, fontWeight: FontWeight.w700, fontSize: 16)),
        ]),
      ),
    );
  }
}

class _DebtorCard extends StatelessWidget {
  final Debtor debtor;
  final VoidCallback onTap;
  const _DebtorCard({required this.debtor, required this.onTap});
  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.white, borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.slate100),
          ),
          child: Row(children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(
                color: debtor.isInDebt ? const Color(0xFFFEE2E2) : AppColors.greenLight,
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: Text(debtor.initials,
                  style: TextStyle(
                    fontWeight: FontWeight.w700, fontSize: 18,
                    color: debtor.isInDebt ? AppColors.red : AppColors.green,
                  )),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(debtor.name,
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppColors.slate800)),
              if (debtor.phone != null)
                Row(children: [
                  const Icon(Icons.phone, size: 10, color: AppColors.slate400),
                  const SizedBox(width: 4),
                  Text(debtor.phone!, style: const TextStyle(fontSize: 11, color: AppColors.slate400)),
                ])
              else
                Text(formatDate(debtor.createdAt),
                    style: const TextStyle(fontSize: 11, color: AppColors.slate300)),
            ])),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text(formatCurrency(debtor.totalDebt),
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13,
                      color: debtor.isInDebt ? AppColors.red : AppColors.green)),
              const SizedBox(width: 4),
              const Icon(Icons.chevron_right, color: AppColors.slate300, size: 18),
            ]),
          ]),
        ),
      ),
    );
  }
}

class _AddDebtorSheet extends ConsumerStatefulWidget {
  final void Function(String id) onAdded;
  const _AddDebtorSheet({required this.onAdded});
  @override
  ConsumerState<_AddDebtorSheet> createState() => _AddDebtorSheetState();
}

class _AddDebtorSheetState extends ConsumerState<_AddDebtorSheet> {
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _amountCtrl = TextEditingController();
  final _noteCtrl = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _nameCtrl.dispose(); _phoneCtrl.dispose();
    _amountCtrl.dispose(); _noteCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        decoration: const BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          child: Column(children: [
            Center(child: Container(
              width: 40, height: 4, margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(color: AppColors.slate200, borderRadius: BorderRadius.circular(2)),
            )),
            Row(children: [
              const Expanded(child: Text('Yangi qarzdor',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700))),
              IconButton(icon: const Icon(Icons.close, color: AppColors.slate400),
                  onPressed: () => Navigator.pop(context)),
            ]),
            const SizedBox(height: 16),
            _Input(ctrl: _nameCtrl, label: 'ISMI *', autofocus: true),
            const SizedBox(height: 12),
            _Input(ctrl: _amountCtrl, label: 'QARZ SUMMASI *', numeric: true),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(child: _Input(ctrl: _phoneCtrl, label: 'TELEFON', phone: true)),
              const SizedBox(width: 12),
              Expanded(child: _Input(ctrl: _noteCtrl, label: 'IZOH')),
            ]),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _loading ? null : _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.red,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: _loading
                    ? const SizedBox(width: 20, height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.white))
                    : const Text('Saqlash', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
              ),
            ),
          ]),
        ),
      ),
    );
  }

  Future<void> _save() async {
    if (_nameCtrl.text.isEmpty || _amountCtrl.text.isEmpty) return;
    final amount = double.tryParse(_amountCtrl.text);
    if (amount == null || amount <= 0) return;
    setState(() => _loading = true);
    try {
      final api = ref.read(debtorsApiProvider);
      final debtor = await api.create(name: _nameCtrl.text.trim(), phone: _phoneCtrl.text.trim());
      await api.addDebt(debtor.id, amount: amount, note: _noteCtrl.text.trim());
      if (mounted) {
        Navigator.pop(context);
        widget.onAdded(debtor.id);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(extractError(e)), backgroundColor: AppColors.red),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
}

class _Input extends StatelessWidget {
  final TextEditingController ctrl;
  final String label;
  final bool numeric, phone, autofocus;
  const _Input({required this.ctrl, required this.label, this.numeric = false, this.phone = false, this.autofocus = false});
  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.slate500)),
      const SizedBox(height: 6),
      TextField(
        controller: ctrl,
        autofocus: autofocus,
        keyboardType: numeric ? TextInputType.number : phone ? TextInputType.phone : TextInputType.text,
        decoration: const InputDecoration(),
      ),
    ]);
  }
}
