import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/users_api.dart';
import '../../core/api/client.dart';
import '../../core/theme/app_theme.dart';

final _usersProvider = FutureProvider<List<StoreUser>>(
  (ref) => ref.read(usersApiProvider).getAll(),
);

class UsersPage extends ConsumerWidget {
  const UsersPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final users = ref.watch(_usersProvider);
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Text('Xodimlar'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_add_outlined, color: AppColors.primary),
            onPressed: () => _showUserModal(context, ref),
          ),
        ],
      ),
      body: users.when(
        data: (list) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(_usersProvider),
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
            itemCount: list.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (_, i) => _UserCard(
              user: list[i],
              onEdit: () => _showUserModal(context, ref, user: list[i]),
              onToggle: () async {
                try {
                  await ref.read(usersApiProvider).toggleActive(list[i].id);
                  ref.invalidate(_usersProvider);
                } catch (e) {
                  if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(extractError(e)), backgroundColor: AppColors.red),
                  );
                }
              },
            ),
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(extractError(e), style: const TextStyle(color: AppColors.red))),
      ),
    );
  }

  void _showUserModal(BuildContext context, WidgetRef ref, {StoreUser? user}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _UserForm(
        user: user,
        onSaved: () => ref.invalidate(_usersProvider),
      ),
    );
  }
}

class _UserCard extends StatelessWidget {
  final StoreUser user;
  final VoidCallback onEdit, onToggle;
  const _UserCard({required this.user, required this.onEdit, required this.onToggle});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.slate100),
      ),
      child: Row(children: [
        Container(
          width: 44, height: 44,
          decoration: BoxDecoration(
            color: user.isActive ? AppColors.primaryLight : AppColors.slate100,
            shape: BoxShape.circle,
          ),
          alignment: Alignment.center,
          child: Text(
            user.name.isNotEmpty ? user.name[0].toUpperCase() : '?',
            style: TextStyle(
              fontWeight: FontWeight.w700, fontSize: 18,
              color: user.isActive ? AppColors.primary : AppColors.slate400,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(user.name,
              style: TextStyle(
                fontWeight: FontWeight.w600, fontSize: 14,
                color: user.isActive ? AppColors.slate800 : AppColors.slate400,
              )),
          Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              margin: const EdgeInsets.only(top: 3),
              decoration: BoxDecoration(
                color: AppColors.slate100, borderRadius: BorderRadius.circular(10),
              ),
              child: Text(roleLabels[user.role] ?? user.role,
                  style: const TextStyle(fontSize: 10, color: AppColors.slate500)),
            ),
            const SizedBox(width: 6),
            if (!user.isActive)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                margin: const EdgeInsets.only(top: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(10),
                ),
                child: const Text("Nofaol", style: TextStyle(fontSize: 10, color: AppColors.red)),
              ),
          ]),
        ])),
        PopupMenuButton<String>(
          icon: const Icon(Icons.more_vert, color: AppColors.slate400, size: 20),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          onSelected: (v) {
            if (v == 'edit') onEdit();
            if (v == 'toggle') onToggle();
          },
          itemBuilder: (_) => [
            const PopupMenuItem(value: 'edit', child: Text('Tahrirlash')),
            PopupMenuItem(value: 'toggle', child: Text(user.isActive ? "Nofaol qilish" : "Faollashtirish")),
          ],
        ),
      ]),
    );
  }
}

class _UserForm extends ConsumerStatefulWidget {
  final StoreUser? user;
  final VoidCallback onSaved;
  const _UserForm({this.user, required this.onSaved});
  @override
  ConsumerState<_UserForm> createState() => _UserFormState();
}

class _UserFormState extends ConsumerState<_UserForm> {
  final _nameCtrl = TextEditingController();
  final _pinCtrl = TextEditingController();
  String _role = 'SALES_MANAGER';
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    if (widget.user != null) {
      _nameCtrl.text = widget.user!.name;
      _pinCtrl.text = widget.user!.pin;
      _role = widget.user!.role;
    }
  }

  @override
  void dispose() { _nameCtrl.dispose(); _pinCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.user != null;
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
              Expanded(child: Text(isEdit ? 'Xodimni tahrirlash' : 'Yangi xodim',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700))),
              IconButton(icon: const Icon(Icons.close, color: AppColors.slate400),
                  onPressed: () => Navigator.pop(context)),
            ]),
            const SizedBox(height: 16),
            TextField(controller: _nameCtrl, autofocus: true,
                decoration: const InputDecoration(labelText: 'Ismi *')),
            const SizedBox(height: 12),
            TextField(controller: _pinCtrl, keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'PIN kod (8 raqam) *')),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _role,
              decoration: const InputDecoration(labelText: 'Lavozim'),
              items: roleLabels.entries
                  .where((e) => e.key != 'SUPER_ADMIN')
                  .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
                  .toList(),
              onChanged: (v) => setState(() => _role = v!),
            ),
            const SizedBox(height: 20),
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
        ),
      ),
    );
  }

  Future<void> _save() async {
    if (_nameCtrl.text.isEmpty || _pinCtrl.text.length < 4) return;
    setState(() => _loading = true);
    try {
      final api = ref.read(usersApiProvider);
      final data = {'name': _nameCtrl.text.trim(), 'pin': _pinCtrl.text, 'role': _role};
      if (widget.user != null) {
        await api.update(widget.user!.id, data);
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
