import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/api/debtors_api.dart';
import '../../core/api/client.dart';
import '../../core/models/debtor.dart';
import '../../core/theme/app_theme.dart';
import '../../utils/formatters.dart';
import 'debtors_page.dart';

final _debtorDetailProvider = FutureProvider.family<Debtor, String>(
  (ref, id) => ref.read(debtorsApiProvider).getOne(id),
);

class DebtorDetailPage extends ConsumerWidget {
  final String id;
  const DebtorDetailPage({super.key, required this.id});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final debtor = ref.watch(_debtorDetailProvider(id));

    return debtor.when(
      loading: () => const Scaffold(
        backgroundColor: AppColors.red,
        body: Center(child: CircularProgressIndicator(color: AppColors.white)),
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(backgroundColor: AppColors.red, foregroundColor: AppColors.white),
        body: Center(child: Text(extractError(e), style: const TextStyle(color: AppColors.red))),
      ),
      data: (d) => _DebtorDetail(debtor: d, debtorId: id, onRefresh: () => ref.invalidate(_debtorDetailProvider(id))),
    );
  }
}

class _DebtorDetail extends ConsumerWidget {
  final Debtor debtor;
  final String debtorId;
  final VoidCallback onRefresh;
  const _DebtorDetail({required this.debtor, required this.debtorId, required this.onRefresh});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isInDebt = debtor.isInDebt;
    final debtTxCount = debtor.transactions.where((t) => t.isDebt).length;
    final payTxCount = debtor.transactions.where((t) => !t.isDebt).length;

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: RefreshIndicator(
        color: AppColors.red,
        onRefresh: () async => onRefresh(),
        child: CustomScrollView(
          slivers: [
            // Red header
            SliverAppBar(
              expandedHeight: 180,
              pinned: true,
              backgroundColor: AppColors.red,
              foregroundColor: AppColors.white,
              leading: IconButton(
                icon: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.arrow_back, color: AppColors.white, size: 20),
                ),
                onPressed: () => context.pop(),
              ),
              actions: [
                IconButton(
                  icon: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(10)),
                    child: const Icon(Icons.delete_outline, color: AppColors.white, size: 20),
                  ),
                  onPressed: () async {
                    final confirm = await showDialog<bool>(
                      context: context,
                      builder: (dialogCtx) => AlertDialog(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        title: const Text("O'chirish"),
                        content: Text("${debtor.name} ni o'chirish?"),
                        actions: [
                          TextButton(onPressed: () => Navigator.pop(dialogCtx, false), child: const Text('Bekor')),
                          TextButton(
                            onPressed: () => Navigator.pop(dialogCtx, true),
                            child: const Text("O'chirish", style: TextStyle(color: AppColors.red)),
                          ),
                        ],
                      ),
                    );
                    if (confirm == true) {
                      try {
                        await ref.read(debtorsApiProvider).delete(debtorId);
                        ref.invalidate(debtorsProvider);
                        ref.invalidate(debtorSummaryProvider);
                        if (context.mounted) context.pop();
                      } catch (e) {
                        if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(extractError(e)), backgroundColor: AppColors.red),
                        );
                      }
                    }
                  },
                ),
              ],
              flexibleSpace: FlexibleSpaceBar(
                background: Container(
                  color: AppColors.red,
                  alignment: Alignment.bottomLeft,
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                  child: Row(children: [
                    Container(
                      width: 64, height: 64,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white.withOpacity(0.3), width: 2),
                      ),
                      alignment: Alignment.center,
                      child: Text(debtor.initials,
                          style: const TextStyle(color: AppColors.white, fontWeight: FontWeight.w700, fontSize: 26)),
                    ),
                    const SizedBox(width: 16),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
                      Text(debtor.name,
                          style: const TextStyle(color: AppColors.white, fontWeight: FontWeight.w700, fontSize: 20),
                          overflow: TextOverflow.ellipsis),
                      const SizedBox(height: 4),
                      if (debtor.phone != null)
                        GestureDetector(
                          onTap: () => launchUrl(Uri.parse('tel:${debtor.phone}')),
                          child: Row(children: [
                            const Icon(Icons.phone, color: Color(0xFFFECACA), size: 14),
                            const SizedBox(width: 4),
                            Text(debtor.phone!,
                                style: const TextStyle(color: Color(0xFFFECACA), fontSize: 14)),
                          ]),
                        )
                      else
                        const Text("Telefon yo'q",
                            style: TextStyle(color: Color(0xFFFCA5A5), fontSize: 13)),
                    ])),
                  ]),
                ),
              ),
            ),

            SliverToBoxAdapter(
              child: Container(
                color: AppColors.red,
                child: Container(
                  decoration: const BoxDecoration(
                    color: AppColors.bg,
                    borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
                    child: Column(children: [
                      // Debt status card
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: isInDebt ? const Color(0xFFFEF2F2) : AppColors.greenLight,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: isInDebt ? const Color(0xFFFECACA) : const Color(0xFFBBF7D0)),
                        ),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(
                            isInDebt ? 'JORIY QARZ' : "QARZ YO'Q",
                            style: TextStyle(
                              fontSize: 11, fontWeight: FontWeight.w600,
                              color: isInDebt ? AppColors.red : AppColors.green,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(formatCurrency(debtor.totalDebt),
                              style: TextStyle(
                                fontSize: 28, fontWeight: FontWeight.w800,
                                color: isInDebt ? AppColors.red : AppColors.green,
                              )),
                          Divider(
                            height: 24,
                            color: isInDebt ? const Color(0xFFFCA5A5) : const Color(0xFF86EFAC),
                          ),
                          Row(children: [
                            Icon(Icons.trending_down, size: 14, color: isInDebt ? AppColors.red : AppColors.slate400),
                            const SizedBox(width: 6),
                            Text('$debtTxCount ta qarz', style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                            const SizedBox(width: 20),
                            const Icon(Icons.trending_up, size: 14, color: AppColors.green),
                            const SizedBox(width: 6),
                            Text("$payTxCount ta to'lov", style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                          ]),
                        ]),
                      ),
                      const SizedBox(height: 16),

                      // Transactions
                      Row(children: [
                        const Text('Kirdi-chiqdi tarixi',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.slate400, letterSpacing: 0.5)),
                      ]),
                      const SizedBox(height: 10),

                      if (debtor.transactions.isEmpty)
                        Container(
                          padding: const EdgeInsets.all(32),
                          decoration: BoxDecoration(
                            color: AppColors.white, borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppColors.slate100),
                          ),
                          child: const Column(children: [
                            Text('📋', style: TextStyle(fontSize: 36)),
                            SizedBox(height: 8),
                            Text("Hali amal yo'q", style: TextStyle(color: AppColors.slate400)),
                          ]),
                        )
                      else
                        ...debtor.transactions.map((tx) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: _TxCard(tx: tx),
                        )),
                    ]),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),

      // Sticky bottom buttons
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppColors.white,
          border: Border(top: BorderSide(color: AppColors.slate100)),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(children: [
              Expanded(child: ElevatedButton.icon(
                icon: const Icon(Icons.add, size: 18),
                label: const Text("Qarz qo'shish"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.red, padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: () => _showTxModal(context, ref, isDebt: true),
              )),
              const SizedBox(width: 12),
              Expanded(child: ElevatedButton.icon(
                icon: const Icon(Icons.remove, size: 18),
                label: const Text("To'lov qabul"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: debtor.isInDebt ? AppColors.green : AppColors.slate300,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: debtor.isInDebt ? () => _showTxModal(context, ref, isDebt: false) : null,
              )),
            ]),
          ),
        ),
      ),
    );
  }

  void _showTxModal(BuildContext context, WidgetRef ref, {required bool isDebt}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _TxSheet(
        isDebt: isDebt,
        totalDebt: debtor.totalDebt,
        onSave: (amount, note) async {
          final api = ref.read(debtorsApiProvider);
          if (isDebt) {
            await api.addDebt(debtorId, amount: amount, note: note);
          } else {
            await api.addPayment(debtorId, amount: amount, note: note);
          }
          ref.invalidate(_debtorDetailProvider(debtorId));
          ref.invalidate(debtorsProvider);
          ref.invalidate(debtorSummaryProvider);
        },
      ),
    );
  }
}

class _TxCard extends StatelessWidget {
  final DebtTransaction tx;
  const _TxCard({required this.tx});
  @override
  Widget build(BuildContext context) {
    final isDebt = tx.isDebt;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDebt ? const Color(0xFFFEF2F2) : AppColors.greenLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDebt ? const Color(0xFFFECACA) : const Color(0xFFBBF7D0)),
      ),
      child: Row(children: [
        Container(
          width: 36, height: 36,
          decoration: BoxDecoration(
            color: isDebt ? const Color(0xFFFECACA) : const Color(0xFFBBF7D0),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(isDebt ? Icons.trending_down : Icons.trending_up,
              color: isDebt ? AppColors.red : AppColors.green, size: 18),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(isDebt ? 'Qarz berildi' : "To'lov qilindi",
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600,
                  color: isDebt ? AppColors.red : AppColors.green)),
          if (tx.note != null && tx.note!.isNotEmpty)
            Text(tx.note!, style: const TextStyle(fontSize: 12, color: AppColors.slate600)),
          Text(formatDateTime(tx.createdAt),
              style: const TextStyle(fontSize: 11, color: AppColors.slate400)),
        ])),
        Text(
          '${isDebt ? '+' : '-'}${formatCurrency(tx.amount)}',
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14,
              color: isDebt ? AppColors.red : AppColors.green),
        ),
      ]),
    );
  }
}

class _TxSheet extends StatefulWidget {
  final bool isDebt;
  final double totalDebt;
  final Future<void> Function(double amount, String? note) onSave;
  const _TxSheet({required this.isDebt, required this.totalDebt, required this.onSave});
  @override
  State<_TxSheet> createState() => _TxSheetState();
}

class _TxSheetState extends State<_TxSheet> {
  final _amountCtrl = TextEditingController();
  final _noteCtrl = TextEditingController();
  bool _loading = false;

  @override
  void dispose() { _amountCtrl.dispose(); _noteCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final color = widget.isDebt ? AppColors.red : AppColors.green;
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
              Expanded(child: Text(
                widget.isDebt ? "Qarz qo'shish" : "To'lov qabul qilish",
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              )),
              IconButton(icon: const Icon(Icons.close, color: AppColors.slate400),
                  onPressed: () => Navigator.pop(context)),
            ]),
            if (!widget.isDebt && widget.totalDebt > 0) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _loading ? null : _payFull,
                  icon: const Icon(Icons.done_all, size: 18),
                  label: Text("To'liq to'lash — ${formatCurrency(widget.totalDebt)}"),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.green,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    side: const BorderSide(color: AppColors.green, width: 1.5),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              ),
              const SizedBox(height: 4),
              const Center(
                child: Text('yoki qo\'lda kiriting:',
                    style: TextStyle(fontSize: 11, color: AppColors.slate400)),
              ),
            ],
            const SizedBox(height: 16),
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('SUMMA (SO\'M) *',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.slate500)),
              const SizedBox(height: 6),
              TextField(
                controller: _amountCtrl,
                keyboardType: TextInputType.number,
                autofocus: true,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                decoration: InputDecoration(
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide(color: color, width: 2),
                  ),
                ),
              ),
            ]),
            const SizedBox(height: 12),
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('IZOH (IXTIYORIY)',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.slate500)),
              const SizedBox(height: 6),
              TextField(controller: _noteCtrl, decoration: const InputDecoration(hintText: 'Nima uchun?')),
            ]),
            const SizedBox(height: 20),
            Row(children: [
              Expanded(child: OutlinedButton(
                onPressed: () => Navigator.pop(context),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  side: const BorderSide(color: AppColors.slate200),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: const Text('Bekor', style: TextStyle(color: AppColors.slate600)),
              )),
              const SizedBox(width: 12),
              Expanded(child: ElevatedButton(
                onPressed: _loading ? null : _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor: color, padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: _loading
                    ? const SizedBox(width: 20, height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.white))
                    : const Text('Saqlash', style: TextStyle(fontWeight: FontWeight.w600)),
              )),
            ]),
          ]),
        ),
      ),
    );
  }

  Future<void> _save() async {
    final amount = double.tryParse(_amountCtrl.text);
    if (amount == null || amount <= 0) return;
    setState(() => _loading = true);
    try {
      await widget.onSave(amount, _noteCtrl.text.trim().isEmpty ? null : _noteCtrl.text.trim());
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(extractError(e)), backgroundColor: AppColors.red),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _payFull() async {
    final confirm = await showDialog<bool>(
      context: context,
      useRootNavigator: false,
      builder: (dialogCtx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text("To'liq to'lash"),
        content: Text(
          "Qarzdorning butun qarzi — ${formatCurrency(widget.totalDebt)} — to'liq to'langan deb belgilanadi. Tasdiqlaysizmi?",
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogCtx, false), child: const Text('Bekor')),
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx, true),
            child: const Text('Tasdiqlash', style: TextStyle(color: AppColors.green)),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    setState(() => _loading = true);
    try {
      await widget.onSave(widget.totalDebt, _noteCtrl.text.trim().isEmpty ? null : _noteCtrl.text.trim());
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(extractError(e)), backgroundColor: AppColors.red),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
}
