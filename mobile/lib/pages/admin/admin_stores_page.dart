import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/client.dart';
import '../../core/theme/app_theme.dart';

class _Store {
  final String id, name, subscriptionStatus, storeType;
  final int? userCount;
  _Store({required this.id, required this.name, required this.subscriptionStatus, required this.storeType, this.userCount});
  factory _Store.fromJson(Map<String, dynamic> j) => _Store(
    id: j['id'] ?? '', name: j['name'] ?? '',
    subscriptionStatus: j['subscriptionStatus'] ?? 'ACTIVE',
    storeType: j['storeType'] ?? 'SALES',
    userCount: j['_count']?['users'],
  );
  bool get isActive => subscriptionStatus == 'ACTIVE';
}

final _storesProvider = FutureProvider<List<_Store>>((ref) async {
  final dio = ref.read(dioProvider);
  final res = await dio.get('/stores');
  return (res.data as List).map((e) => _Store.fromJson(e)).toList();
});

class AdminStoresPage extends ConsumerWidget {
  const AdminStoresPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stores = ref.watch(_storesProvider);
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Text("Do'konlar"),
        actions: [
          IconButton(
            icon: const Icon(Icons.add, color: AppColors.primary),
            onPressed: () => _showStoreModal(context, ref),
          ),
        ],
      ),
      body: stores.when(
        data: (list) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(_storesProvider),
          child: list.isEmpty
              ? const Center(child: Text("Do'konlar yo'q", style: TextStyle(color: AppColors.slate400)))
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) => _StoreCard(
                    store: list[i],
                    onEdit: () => _showStoreModal(context, ref, store: list[i]),
                  ),
                ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(extractError(e), style: const TextStyle(color: AppColors.red))),
      ),
    );
  }

  void _showStoreModal(BuildContext context, WidgetRef ref, {_Store? store}) {
    showModalBottomSheet(
      context: context, isScrollControlled: true, backgroundColor: Colors.transparent,
      builder: (_) => _StoreForm(store: store, onSaved: () => ref.invalidate(_storesProvider)),
    );
  }
}

class _StoreCard extends StatelessWidget {
  final _Store store;
  final VoidCallback onEdit;
  const _StoreCard({required this.store, required this.onEdit});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.white, borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.slate100),
      ),
      child: Row(children: [
        Container(
          width: 44, height: 44,
          decoration: BoxDecoration(
            color: store.isActive ? AppColors.primaryLight : AppColors.slate100,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(Icons.store_outlined, color: store.isActive ? AppColors.primary : AppColors.slate400),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(store.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppColors.slate800)),
          const SizedBox(height: 4),
          Row(children: [
            _Badge(store.storeType == 'DEBT' ? 'Qarz' : 'Sotuv', AppColors.purple, AppColors.purpleLight),
            const SizedBox(width: 6),
            _Badge(store.isActive ? 'Faol' : 'Nofaol',
                store.isActive ? AppColors.green : AppColors.red,
                store.isActive ? AppColors.greenLight : AppColors.redLight),
            if (store.userCount != null) ...[
              const SizedBox(width: 6),
              _Badge('${store.userCount} xodim', AppColors.slate500, AppColors.slate100),
            ],
          ]),
        ])),
        IconButton(icon: const Icon(Icons.edit_outlined, color: AppColors.slate400, size: 18), onPressed: onEdit),
      ]),
    );
  }
}

class _Badge extends StatelessWidget {
  final String text; final Color color, bg;
  const _Badge(this.text, this.color, this.bg);
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
    decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(10)),
    child: Text(text, style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w500)),
  );
}

class _StoreForm extends ConsumerStatefulWidget {
  final _Store? store;
  final VoidCallback onSaved;
  const _StoreForm({this.store, required this.onSaved});
  @override
  ConsumerState<_StoreForm> createState() => _StoreFormState();
}

class _StoreFormState extends ConsumerState<_StoreForm> {
  final _nameCtrl = TextEditingController();
  String _type = 'SALES', _status = 'ACTIVE';
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    if (widget.store != null) {
      _nameCtrl.text = widget.store!.name;
      _type = widget.store!.storeType;
      _status = widget.store!.subscriptionStatus;
    }
  }

  @override
  void dispose() { _nameCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.store != null;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        decoration: const BoxDecoration(
          color: AppColors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          child: Column(children: [
            Center(child: Container(width: 40, height: 4, margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(color: AppColors.slate200, borderRadius: BorderRadius.circular(2)))),
            Row(children: [
              Expanded(child: Text(isEdit ? "Do'konni tahrirlash" : "Yangi do'kon",
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700))),
              IconButton(icon: const Icon(Icons.close, color: AppColors.slate400),
                  onPressed: () => Navigator.pop(context)),
            ]),
            const SizedBox(height: 16),
            TextField(controller: _nameCtrl, autofocus: true, decoration: const InputDecoration(labelText: "Do'kon nomi *")),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _type,
              decoration: const InputDecoration(labelText: 'Tur'),
              items: const [
                DropdownMenuItem(value: 'SALES', child: Text('Sotuv')),
                DropdownMenuItem(value: 'DEBT', child: Text('Qarz')),
              ],
              onChanged: (v) => setState(() => _type = v!),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _status,
              decoration: const InputDecoration(labelText: 'Holat'),
              items: const [
                DropdownMenuItem(value: 'ACTIVE', child: Text('Faol')),
                DropdownMenuItem(value: 'INACTIVE', child: Text('Nofaol')),
                DropdownMenuItem(value: 'SUSPENDED', child: Text("To'xtatilgan")),
              ],
              onChanged: (v) => setState(() => _status = v!),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _loading ? null : _save,
                child: _loading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.white))
                    : Text(isEdit ? 'Saqlash' : "Qo'shish"),
              ),
            ),
          ]),
        ),
      ),
    );
  }

  Future<void> _save() async {
    if (_nameCtrl.text.isEmpty) return;
    setState(() => _loading = true);
    try {
      final dio = ref.read(dioProvider);
      final data = {'name': _nameCtrl.text.trim(), 'storeType': _type, 'subscriptionStatus': _status};
      if (widget.store != null) {
        await dio.patch('/stores/${widget.store!.id}', data: data);
      } else {
        await dio.post('/stores', data: data);
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
