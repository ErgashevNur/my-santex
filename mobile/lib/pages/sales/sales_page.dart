import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pdf/pdf.dart';
import 'package:printing/printing.dart';
import '../../providers/auth_provider.dart';
import '../../core/api/sales_api.dart';
import '../../core/api/products_api.dart';
import '../../core/api/client.dart';
import '../../core/models/sale.dart';
import '../../core/models/product.dart';
import '../../core/theme/app_theme.dart';
import '../../utils/formatters.dart';
import '../../utils/receipt_pdf.dart';

// Cart item model
class CartItem {
  final String productId;
  final String name;
  int quantity;
  final double unitPrice;

  CartItem({required this.productId, required this.name, required this.quantity, required this.unitPrice});

  double get total => quantity * unitPrice;
}

final _productSearchProvider = FutureProvider.family<List<Product>, String>(
  (ref, search) => ref.read(productsApiProvider).getAll(search: search),
);

final _historyProvider = FutureProvider.family<List<Sale>, _HistoryFilter>(
  (ref, f) => ref.read(salesApiProvider).getAll(
    date: f.date, receiptNo: f.receiptNo, paymentMethod: f.paymentMethod,
  ),
);

class _HistoryFilter {
  final String date, receiptNo, paymentMethod;
  _HistoryFilter({this.date = '', this.receiptNo = '', this.paymentMethod = ''});

  @override
  bool operator ==(Object o) =>
      o is _HistoryFilter && date == o.date && receiptNo == o.receiptNo && paymentMethod == o.paymentMethod;
  @override
  int get hashCode => Object.hash(date, receiptNo, paymentMethod);
}

class SalesPage extends ConsumerStatefulWidget {
  const SalesPage({super.key});
  @override
  ConsumerState<SalesPage> createState() => _SalesPageState();
}

class _SalesPageState extends ConsumerState<SalesPage> with SingleTickerProviderStateMixin {
  late TabController _tabs;
  // POS state
  final List<CartItem> _cart = [];
  final _searchCtrl = TextEditingController();
  String _search = '';
  String _paymentMethod = 'CASH';
  bool _processing = false;

  // History state
  String _date = '', _receiptNo = '', _paymentFilter = '';

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  void _addToCart(Product p) {
    setState(() {
      final idx = _cart.indexWhere((c) => c.productId == p.id);
      if (idx >= 0) {
        _cart[idx].quantity++;
      } else {
        _cart.add(CartItem(productId: p.id, name: p.name, quantity: 1, unitPrice: p.sellPrice));
      }
    });
  }

  void _updateQty(String productId, int qty) {
    setState(() {
      if (qty <= 0) {
        _cart.removeWhere((c) => c.productId == productId);
      } else {
        final idx = _cart.indexWhere((c) => c.productId == productId);
        if (idx >= 0) _cart[idx].quantity = qty;
      }
    });
  }

  double get _total => _cart.fold(0, (s, c) => s + c.total);

  Future<void> _checkout() async {
    if (_cart.isEmpty || _processing) return;
    setState(() => _processing = true);
    final cartSnapshot = _cart.map((c) => ReceiptItem(
      name: c.name, quantity: c.quantity, unitPrice: c.unitPrice,
    )).toList();
    try {
      final sale = await ref.read(salesApiProvider).create(
        items: _cart.map((c) => {
          'productId': c.productId,
          'quantity': c.quantity,
          'unitPrice': c.unitPrice,
        }).toList(),
        paymentMethod: _paymentMethod,
      );
      setState(() { _cart.clear(); _search = ''; _searchCtrl.clear(); });
      ref.invalidate(_productSearchProvider);
      if (mounted) {
        showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          builder: (_) => _ReceiptSheet(sale: sale, items: cartSnapshot),
        );
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(extractError(e)), backgroundColor: AppColors.red),
      );
    } finally {
      if (mounted) setState(() => _processing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Text('Sotuv'),
        bottom: TabBar(
          controller: _tabs,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.slate400,
          indicatorColor: AppColors.primary,
          tabs: const [
            Tab(text: 'POS'),
            Tab(text: 'Tarix'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: [_PosView(page: this), _HistoryView(page: this)],
      ),
    );
  }
}

class _PosView extends StatelessWidget {
  final _SalesPageState page;
  const _PosView({required this.page});

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      // Search bar
      Padding(
        padding: const EdgeInsets.all(12),
        child: TextField(
          controller: page._searchCtrl,
          decoration: InputDecoration(
            hintText: 'Tovar qidirish...',
            prefixIcon: const Icon(Icons.search, color: AppColors.slate400, size: 20),
            suffixIcon: page._search.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.close, size: 18),
                    onPressed: () { page._searchCtrl.clear(); page.setState(() => page._search = ''); },
                  )
                : null,
          ),
          onChanged: (v) => page.setState(() => page._search = v),
        ),
      ),
      Expanded(
        child: Row(children: [
          // Product list
          Expanded(
            flex: 3,
            child: Consumer(builder: (_, ref, __) {
              final products = ref.watch(_productSearchProvider(page._search));
              return products.when(
                data: (list) => ListView.builder(
                  padding: const EdgeInsets.fromLTRB(12, 0, 6, 100),
                  itemCount: list.length,
                  itemBuilder: (_, i) {
                    final p = list[i];
                    final inCart = page._cart.where((c) => c.productId == p.id).isNotEmpty;
                    return GestureDetector(
                      onTap: () => page._addToCart(p),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: inCart ? AppColors.primaryLight : AppColors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: inCart ? AppColors.primary.withOpacity(0.3) : AppColors.slate100),
                        ),
                        child: Row(children: [
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(p.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppColors.slate800)),
                            Text('${p.stock.toInt()} ${unitLabels[p.unit] ?? p.unit}',
                                style: TextStyle(fontSize: 11, color: p.isLowStock ? AppColors.red : AppColors.slate400)),
                          ])),
                          Text(formatCurrency(p.sellPrice),
                              style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.primary, fontSize: 12)),
                        ]),
                      ),
                    );
                  },
                ),
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) => Center(child: Text(extractError(e))),
              );
            }),
          ),
          // Cart
          Container(
            width: 1, color: AppColors.slate100,
          ),
          Expanded(
            flex: 2,
            child: Column(children: [
              Expanded(
                child: page._cart.isEmpty
                    ? const Center(
                        child: Text('Savatcha bo\'sh', style: TextStyle(color: AppColors.slate300, fontSize: 13)),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
                        itemCount: page._cart.length,
                        itemBuilder: (_, i) {
                          final item = page._cart[i];
                          return Container(
                            margin: const EdgeInsets.only(bottom: 6),
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppColors.white,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: AppColors.slate100),
                            ),
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text(item.name,
                                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.slate700),
                                  maxLines: 2),
                              const SizedBox(height: 4),
                              Row(children: [
                                _QtyBtn(icon: Icons.remove, onTap: () => page._updateQty(item.productId, item.quantity - 1)),
                                Expanded(
                                  child: Text('${item.quantity}',
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                                ),
                                _QtyBtn(icon: Icons.add, onTap: () => page._updateQty(item.productId, item.quantity + 1)),
                              ]),
                              Text(formatCurrency(item.total),
                                  style: const TextStyle(fontSize: 11, color: AppColors.primary, fontWeight: FontWeight.w600)),
                            ]),
                          );
                        },
                      ),
              ),
              // Payment method + checkout
              Container(
                padding: const EdgeInsets.fromLTRB(8, 8, 8, 16),
                decoration: const BoxDecoration(
                  color: AppColors.white,
                  border: Border(top: BorderSide(color: AppColors.slate100)),
                ),
                child: Column(children: [
                  DropdownButtonFormField<String>(
                    value: page._paymentMethod,
                    isDense: true,
                    decoration: const InputDecoration(
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      labelText: "To'lov turi",
                    ),
                    items: paymentLabels.entries.map((e) =>
                        DropdownMenuItem(value: e.key, child: Text(e.value, style: const TextStyle(fontSize: 13)))
                    ).toList(),
                    onChanged: (v) => page.setState(() => page._paymentMethod = v!),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: page._cart.isEmpty ? null : page._checkout,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.green,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      child: page._processing
                          ? const SizedBox(width: 18, height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.white))
                          : Text('Hisob-kitob\n${formatCurrency(page._total)}',
                              textAlign: TextAlign.center,
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                    ),
                  ),
                ]),
              ),
              const SizedBox(height: 72), // bottom nav space
            ]),
          ),
        ]),
      ),
    ]);
  }
}

class _QtyBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _QtyBtn({required this.icon, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      width: 28, height: 28,
      decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(8)),
      child: Icon(icon, size: 16, color: AppColors.slate600),
    ),
  );
}

class _HistoryView extends StatefulWidget {
  final _SalesPageState page;
  const _HistoryView({required this.page});
  @override
  State<_HistoryView> createState() => _HistoryViewState();
}

class _HistoryViewState extends State<_HistoryView> {
  String _date = '', _receiptNo = '', _paymentFilter = '';

  @override
  Widget build(BuildContext context) {
    final filter = _HistoryFilter(date: _date, receiptNo: _receiptNo, paymentMethod: _paymentFilter);
    return Column(children: [
      // Filters
      Padding(
        padding: const EdgeInsets.all(12),
        child: Row(children: [
          Expanded(child: TextField(
            decoration: const InputDecoration(labelText: 'Sana', prefixIcon: Icon(Icons.calendar_today, size: 16)),
            readOnly: true,
            onTap: () async {
              final d = await showDatePicker(context: context, initialDate: DateTime.now(),
                  firstDate: DateTime(2020), lastDate: DateTime.now());
              if (d != null) setState(() => _date = d.toIso8601String().substring(0, 10));
            },
            controller: TextEditingController(text: _date),
          )),
          const SizedBox(width: 8),
          Expanded(child: TextField(
            decoration: const InputDecoration(labelText: 'Chek #'),
            keyboardType: TextInputType.number,
            onChanged: (v) => setState(() => _receiptNo = v),
          )),
        ]),
      ),
      if (_date.isNotEmpty || _receiptNo.isNotEmpty || _paymentFilter.isNotEmpty)
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Row(children: [
            const Spacer(),
            TextButton(
              onPressed: () => setState(() { _date = ''; _receiptNo = ''; _paymentFilter = ''; }),
              child: const Text("Filtrlarni tozalash", style: TextStyle(color: AppColors.red, fontSize: 12)),
            ),
          ]),
        ),
      Expanded(
        child: Consumer(builder: (_, ref, __) {
          final history = ref.watch(_historyProvider(filter));
          return history.when(
            data: (sales) => sales.isEmpty
                ? const Center(child: Text('Sotuvlar topilmadi', style: TextStyle(color: AppColors.slate400)))
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(12, 0, 12, 100),
                    itemCount: sales.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) => _SaleCard(sale: sales[i]),
                  ),
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(child: Text(extractError(e), style: const TextStyle(color: AppColors.red))),
          );
        }),
      ),
    ]);
  }
}

class _SaleCard extends StatelessWidget {
  final Sale sale;
  const _SaleCard({required this.sale});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.white, borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.slate100),
      ),
      child: Row(children: [
        Container(
          width: 40, height: 40,
          decoration: BoxDecoration(color: AppColors.greenLight, borderRadius: BorderRadius.circular(10)),
          child: const Icon(Icons.receipt_outlined, color: AppColors.green, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Chek #${sale.receiptNo}',
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppColors.slate800)),
          Text('${paymentLabels[sale.paymentMethod] ?? sale.paymentMethod} · ${formatDateTime(sale.createdAt)}',
              style: const TextStyle(fontSize: 11, color: AppColors.slate400)),
        ])),
        Text(formatCurrency(sale.totalAmount),
            style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.green, fontSize: 14)),
      ]),
    );
  }
}

// ───────── Receipt Bottom Sheet ─────────

class _ReceiptSheet extends ConsumerStatefulWidget {
  final Sale sale;
  final List<ReceiptItem> items;
  const _ReceiptSheet({required this.sale, required this.items});
  @override
  ConsumerState<_ReceiptSheet> createState() => _ReceiptSheetState();
}

class _ReceiptSheetState extends ConsumerState<_ReceiptSheet> {
  bool _loading = false;

  Future<Uint8List> _buildPdf({PdfPageFormat? format}) async {
    final user = ref.read(authProvider).user;
    return generateReceiptPdf(
      sale: widget.sale,
      items: widget.items,
      storeName: user?.store?.name ?? 'MY SANTEX',
      storeAddress: user?.store?.address,
      storePhone: user?.store?.phone,
      cashierName: user?.name,
      pageFormat: format,
    );
  }

  Future<void> _share() async {
    setState(() => _loading = true);
    try {
      final bytes = await _buildPdf();
      await Printing.sharePdf(bytes: bytes, filename: 'chek-${widget.sale.receiptNo}.pdf');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _print() async {
    setState(() => _loading = true);
    try {
      final user = ref.read(authProvider).user;
      await Printing.layoutPdf(
        onLayout: (format) => generateReceiptPdf(
          sale: widget.sale,
          items: widget.items,
          storeName: user?.store?.name ?? 'MY SANTEX',
          storeAddress: user?.store?.address,
          storePhone: user?.store?.phone,
          cashierName: user?.name,
          pageFormat: format,
        ),
        name: 'Chek #${widget.sale.receiptNo}',
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Center(child: Container(
            width: 40, height: 4, margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(color: AppColors.slate200, borderRadius: BorderRadius.circular(2)),
          )),

          // Success icon
          Container(
            width: 56, height: 56,
            decoration: BoxDecoration(color: AppColors.greenLight, shape: BoxShape.circle),
            child: const Icon(Icons.check_circle_outline, color: AppColors.green, size: 30),
          ),
          const SizedBox(height: 12),
          const Text('Sotuv amalga oshirildi!',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.slate800)),
          const SizedBox(height: 4),
          Text('Chek #${widget.sale.receiptNo} · ${formatCurrency(widget.sale.totalAmount)}',
              style: const TextStyle(fontSize: 13, color: AppColors.slate400)),

          const SizedBox(height: 20),
          const Divider(height: 1, color: AppColors.slate100),
          const SizedBox(height: 16),

          // Items summary
          ...widget.items.map((item) => Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Row(children: [
              Expanded(child: Text(item.name,
                  style: const TextStyle(fontSize: 13, color: AppColors.slate700))),
              Text('${item.quantity} x ${formatCurrency(item.unitPrice)}',
                  style: const TextStyle(fontSize: 12, color: AppColors.slate400)),
              const SizedBox(width: 8),
              Text(formatCurrency(item.total),
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.slate800)),
            ]),
          )),

          const SizedBox(height: 8),
          const Divider(height: 1, color: AppColors.slate100),
          const SizedBox(height: 8),
          Row(children: [
            const Text('JAMI:', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
            const Spacer(),
            Text(formatCurrency(widget.sale.totalAmount),
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.green)),
          ]),

          const SizedBox(height: 20),

          if (_loading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: CircularProgressIndicator(),
            )
          else
            Row(children: [
              // Share button
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _share,
                  icon: const Icon(Icons.share_outlined, size: 18),
                  label: const Text('Ulashish'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.primary),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              // Print button
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _print,
                  icon: const Icon(Icons.print_outlined, size: 18),
                  label: const Text('Chop etish'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: AppColors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),
            ]),

          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("Yopish", style: TextStyle(color: AppColors.slate400)),
            ),
          ),
        ],
      ),
    );
  }
}
