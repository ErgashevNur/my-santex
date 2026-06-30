import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/products_api.dart';
import '../../core/api/client.dart';
import '../../core/models/product.dart';
import '../../core/theme/app_theme.dart';
import '../../utils/formatters.dart';

final _productsProvider = FutureProvider.family<List<Product>, _ProductFilter>(
  (ref, filter) => ref.read(productsApiProvider).getAll(
    search: filter.search, categoryId: filter.categoryId, lowStock: filter.lowStock,
  ),
);

final _categoriesProvider = FutureProvider<List<Category>>(
  (ref) => ref.read(productsApiProvider).getCategories(),
);

class _ProductFilter {
  final String search, categoryId;
  final bool lowStock;
  _ProductFilter({this.search = '', this.categoryId = '', this.lowStock = false});

  @override
  bool operator ==(Object o) =>
      o is _ProductFilter && search == o.search && categoryId == o.categoryId && lowStock == o.lowStock;
  @override
  int get hashCode => Object.hash(search, categoryId, lowStock);
}

class ProductsPage extends ConsumerStatefulWidget {
  const ProductsPage({super.key});
  @override
  ConsumerState<ProductsPage> createState() => _ProductsPageState();
}

class _ProductsPageState extends ConsumerState<ProductsPage> {
  final _searchCtrl = TextEditingController();
  String _search = '';
  String _categoryId = '';
  bool _lowStock = false;

  @override
  void dispose() { _searchCtrl.dispose(); super.dispose(); }

  _ProductFilter get _filter => _ProductFilter(search: _search, categoryId: _categoryId, lowStock: _lowStock);

  void _refresh() => ref.invalidate(_productsProvider(_filter));

  @override
  Widget build(BuildContext context) {
    final products = ref.watch(_productsProvider(_filter));
    final categories = ref.watch(_categoriesProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Text('Tovarlar'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add, color: AppColors.primary),
            onPressed: () => _showProductModal(context),
          ),
        ],
      ),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          child: Column(children: [
            // Search
            TextField(
              controller: _searchCtrl,
              decoration: InputDecoration(
                hintText: 'Tovar nomi yoki barcode...',
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
            const SizedBox(height: 10),
            // Filter chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(children: [
                _FilterChip(
                  label: "Kam qolgan",
                  selected: _lowStock,
                  onTap: () => setState(() => _lowStock = !_lowStock),
                  color: AppColors.amber,
                ),
                ...categories.maybeWhen(
                  data: (cats) => cats.map((c) => Padding(
                    padding: const EdgeInsets.only(left: 8),
                    child: _FilterChip(
                      label: c.name,
                      selected: _categoryId == c.id,
                      onTap: () => setState(() => _categoryId = _categoryId == c.id ? '' : c.id),
                    ),
                  )).toList(),
                  orElse: () => [],
                ),
              ]),
            ),
          ]),
        ),
        Expanded(
          child: products.when(
            data: (list) => list.isEmpty
                ? const Center(child: Text('Tovar topilmadi', style: TextStyle(color: AppColors.slate400)))
                : RefreshIndicator(
                    onRefresh: () async => _refresh(),
                    child: ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                      itemCount: list.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (_, i) => _ProductCard(
                        product: list[i],
                        onEdit: () => _showProductModal(context, product: list[i]),
                        onStock: () => _showStockModal(context, list[i]),
                        onDelete: () => _deleteProduct(list[i]),
                      ),
                    ),
                  ),
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(child: Text(extractError(e), style: const TextStyle(color: AppColors.red))),
          ),
        ),
      ]),
    );
  }

  void _deleteProduct(Product p) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text("O'chirish"),
        content: Text("${p.name} ni o'chirish?"),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Bekor')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text("O'chirish", style: TextStyle(color: AppColors.red)),
          ),
        ],
      ),
    );
    if (confirm == true) {
      try {
        await ref.read(productsApiProvider).delete(p.id);
        _refresh();
      } catch (e) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(extractError(e)), backgroundColor: AppColors.red),
        );
      }
    }
  }

  void _showStockModal(BuildContext context, Product product) {
    final ctrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _BottomSheet(
        title: 'Zaxira qo\'shish',
        child: Column(children: [
          Text(product.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
          const SizedBox(height: 4),
          Text('Hozir: ${product.stock.toInt()} ${unitLabels[product.unit] ?? product.unit}',
              style: const TextStyle(color: AppColors.slate400)),
          const SizedBox(height: 16),
          TextField(
            controller: ctrl,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Qo\'shish miqdori'),
            autofocus: true,
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () async {
                final qty = double.tryParse(ctrl.text);
                if (qty == null || qty <= 0) return;
                try {
                  await ref.read(productsApiProvider).addStock(product.id, qty);
                  _refresh();
                  if (mounted) Navigator.pop(context);
                } catch (e) {
                  if (mounted) ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(extractError(e)), backgroundColor: AppColors.red),
                  );
                }
              },
              child: const Text('Qo\'shish'),
            ),
          ),
        ]),
      ),
    );
  }

  void _showProductModal(BuildContext context, {Product? product}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ProductForm(
        product: product,
        onSaved: _refresh,
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final Color color;
  const _FilterChip({required this.label, required this.selected, required this.onTap, this.color = AppColors.primary});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: selected ? color : AppColors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: selected ? color : AppColors.slate200),
        ),
        child: Text(label,
            style: TextStyle(
              fontSize: 12, fontWeight: FontWeight.w500,
              color: selected ? AppColors.white : AppColors.slate600,
            )),
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  final Product product;
  final VoidCallback onEdit, onStock, onDelete;
  const _ProductCard({required this.product, required this.onEdit, required this.onStock, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.white, borderRadius: BorderRadius.circular(16),
        border: Border.all(color: product.isLowStock ? const Color(0xFFFECACA) : AppColors.slate100),
      ),
      child: Row(children: [
        Container(
          width: 44, height: 44,
          decoration: BoxDecoration(
            color: product.isLowStock ? AppColors.amberLight : AppColors.primaryLight,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(Icons.inventory_2_outlined,
              color: product.isLowStock ? AppColors.amber : AppColors.primary, size: 22),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(product.name,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppColors.slate800))),
            if (product.category != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(10)),
                child: Text(product.category!.name,
                    style: const TextStyle(fontSize: 10, color: AppColors.slate500)),
              ),
          ]),
          const SizedBox(height: 4),
          Row(children: [
            Text(formatCurrency(product.sellPrice),
                style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.primary, fontSize: 13)),
            const Spacer(),
            Text('${product.stock.toInt()} ${unitLabels[product.unit] ?? product.unit}',
                style: TextStyle(
                  fontSize: 12, fontWeight: FontWeight.w500,
                  color: product.isLowStock ? AppColors.red : AppColors.green,
                )),
          ]),
        ])),
        PopupMenuButton<String>(
          icon: const Icon(Icons.more_vert, color: AppColors.slate400, size: 20),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          onSelected: (v) {
            if (v == 'edit') onEdit();
            if (v == 'stock') onStock();
            if (v == 'delete') onDelete();
          },
          itemBuilder: (_) => const [
            PopupMenuItem(value: 'edit', child: Text('Tahrirlash')),
            PopupMenuItem(value: 'stock', child: Text("Zaxira qo'shish")),
            PopupMenuItem(value: 'delete', child: Text("O'chirish", style: TextStyle(color: AppColors.red))),
          ],
        ),
      ]),
    );
  }
}

class _ProductForm extends ConsumerStatefulWidget {
  final Product? product;
  final VoidCallback onSaved;
  const _ProductForm({this.product, required this.onSaved});

  @override
  ConsumerState<_ProductForm> createState() => _ProductFormState();
}

class _ProductFormState extends ConsumerState<_ProductForm> {
  final _nameCtrl = TextEditingController();
  final _costCtrl = TextEditingController();
  final _sellCtrl = TextEditingController();
  final _stockCtrl = TextEditingController();
  final _minStockCtrl = TextEditingController();
  String _unit = 'PIECE';
  String _categoryId = '';
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    final p = widget.product;
    if (p != null) {
      _nameCtrl.text = p.name;
      _costCtrl.text = p.costPrice.toStringAsFixed(0);
      _sellCtrl.text = p.sellPrice.toStringAsFixed(0);
      _stockCtrl.text = p.stock.toStringAsFixed(0);
      _minStockCtrl.text = p.minStock.toStringAsFixed(0);
      _unit = p.unit;
      _categoryId = p.categoryId ?? '';
    } else {
      _stockCtrl.text = '0';
      _minStockCtrl.text = '5';
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose(); _costCtrl.dispose(); _sellCtrl.dispose();
    _stockCtrl.dispose(); _minStockCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final categories = ref.watch(_categoriesProvider);
    final isEdit = widget.product != null;

    return _BottomSheet(
      title: isEdit ? 'Tovarni tahrirlash' : 'Yangi tovar',
      child: Column(children: [
        _Field(ctrl: _nameCtrl, label: 'Nomi *'),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: _Field(ctrl: _costCtrl, label: 'Tan narxi', numeric: true)),
          const SizedBox(width: 12),
          Expanded(child: _Field(ctrl: _sellCtrl, label: 'Sotuv narxi *', numeric: true)),
        ]),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: _Field(ctrl: _stockCtrl, label: 'Zaxira', numeric: true)),
          const SizedBox(width: 12),
          Expanded(child: _Field(ctrl: _minStockCtrl, label: 'Min zaxira', numeric: true)),
        ]),
        const SizedBox(height: 12),
        // Unit dropdown
        DropdownButtonFormField<String>(
          value: _unit,
          decoration: const InputDecoration(labelText: 'O\'lchov birligi'),
          items: unitLabels.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
          onChanged: (v) => setState(() => _unit = v!),
        ),
        const SizedBox(height: 12),
        // Category
        categories.maybeWhen(
          data: (cats) => DropdownButtonFormField<String>(
            value: _categoryId.isEmpty ? null : _categoryId,
            decoration: const InputDecoration(labelText: 'Kategoriya'),
            items: cats.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))).toList(),
            onChanged: (v) => setState(() => _categoryId = v ?? ''),
          ),
          orElse: () => const SizedBox.shrink(),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _loading ? null : _save,
            child: _loading
                ? const SizedBox(width: 20, height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.white))
                : Text(isEdit ? 'Saqlash' : "Qo'shish"),
          ),
        ),
      ]),
    );
  }

  Future<void> _save() async {
    if (_nameCtrl.text.isEmpty || _sellCtrl.text.isEmpty) return;
    setState(() => _loading = true);
    try {
      final data = {
        'name': _nameCtrl.text,
        'costPrice': double.parse(_costCtrl.text.isEmpty ? '0' : _costCtrl.text),
        'sellPrice': double.parse(_sellCtrl.text),
        'stock': double.parse(_stockCtrl.text.isEmpty ? '0' : _stockCtrl.text),
        'minStock': double.parse(_minStockCtrl.text.isEmpty ? '5' : _minStockCtrl.text),
        'unit': _unit,
        if (_categoryId.isNotEmpty) 'categoryId': _categoryId,
      };
      final api = ref.read(productsApiProvider);
      if (widget.product != null) {
        await api.update(widget.product!.id, data);
      } else {
        await api.create(data);
      }
      widget.onSaved();
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

class _Field extends StatelessWidget {
  final TextEditingController ctrl;
  final String label;
  final bool numeric;
  const _Field({required this.ctrl, required this.label, this.numeric = false});
  @override
  Widget build(BuildContext context) => TextField(
    controller: ctrl,
    keyboardType: numeric ? TextInputType.number : TextInputType.text,
    decoration: InputDecoration(labelText: label),
  );
}

class _BottomSheet extends StatelessWidget {
  final String title;
  final Widget child;
  const _BottomSheet({required this.title, required this.child});
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
              width: 40, height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(color: AppColors.slate200, borderRadius: BorderRadius.circular(2)),
            )),
            Row(children: [
              Expanded(child: Text(title,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.slate800))),
              IconButton(
                icon: const Icon(Icons.close, color: AppColors.slate400),
                onPressed: () => Navigator.pop(context),
              ),
            ]),
            const SizedBox(height: 16),
            child,
          ]),
        ),
      ),
    );
  }
}
