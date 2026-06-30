import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/notifications_api.dart';
import '../../core/api/client.dart';
import '../../core/theme/app_theme.dart';
import '../../utils/formatters.dart';

final _adminNotifsProvider = FutureProvider<List<AppNotification>>(
  (ref) => ref.read(notificationsApiProvider).getAllForAdmin(),
);

class AdminNotificationsPage extends ConsumerWidget {
  const AdminNotificationsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifs = ref.watch(_adminNotifsProvider);
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: const Text('Bildirishnomalar'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_alert_outlined, color: AppColors.primary),
            onPressed: () => _showSendModal(context, ref),
          ),
        ],
      ),
      body: notifs.when(
        data: (list) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(_adminNotifsProvider),
          child: list.isEmpty
              ? const Center(child: Text("Bildirishnomalar yo'q", style: TextStyle(color: AppColors.slate400)))
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) => _NotifCard(
                    notif: list[i],
                    onDelete: () async {
                      try {
                        await ref.read(notificationsApiProvider).delete(list[i].id);
                        ref.invalidate(_adminNotifsProvider);
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

  void _showSendModal(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context, isScrollControlled: true, backgroundColor: Colors.transparent,
      builder: (_) => _SendNotifSheet(onSent: () => ref.invalidate(_adminNotifsProvider)),
    );
  }
}

class _NotifCard extends StatelessWidget {
  final AppNotification notif;
  final VoidCallback onDelete;
  const _NotifCard({required this.notif, required this.onDelete});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.white, borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.slate100),
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          width: 40, height: 40,
          decoration: BoxDecoration(color: AppColors.primaryLight, borderRadius: BorderRadius.circular(10)),
          child: const Icon(Icons.notifications_outlined, color: AppColors.primary, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(notif.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppColors.slate800)),
          const SizedBox(height: 2),
          Text(notif.body, style: const TextStyle(fontSize: 13, color: AppColors.slate500)),
          const SizedBox(height: 4),
          Row(children: [
            if (notif.target != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(6)),
                child: Text(notif.target!, style: const TextStyle(fontSize: 10, color: AppColors.slate500)),
              ),
            const Spacer(),
            Text(formatDate(notif.createdAt), style: const TextStyle(fontSize: 11, color: AppColors.slate400)),
          ]),
        ])),
        IconButton(
          icon: const Icon(Icons.delete_outline, color: AppColors.slate300, size: 18),
          onPressed: onDelete,
          padding: EdgeInsets.zero, constraints: const BoxConstraints(),
        ),
      ]),
    );
  }
}

class _SendNotifSheet extends ConsumerStatefulWidget {
  final VoidCallback onSent;
  const _SendNotifSheet({required this.onSent});
  @override
  ConsumerState<_SendNotifSheet> createState() => _SendNotifSheetState();
}

class _SendNotifSheetState extends ConsumerState<_SendNotifSheet> {
  final _titleCtrl = TextEditingController();
  final _bodyCtrl = TextEditingController();
  String _target = 'ALL';
  bool _loading = false;

  @override
  void dispose() { _titleCtrl.dispose(); _bodyCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
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
              const Expanded(child: Text('Bildirishnoma yuborish',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700))),
              IconButton(icon: const Icon(Icons.close, color: AppColors.slate400),
                  onPressed: () => Navigator.pop(context)),
            ]),
            const SizedBox(height: 16),
            TextField(controller: _titleCtrl, autofocus: true, decoration: const InputDecoration(labelText: 'Sarlavha *')),
            const SizedBox(height: 12),
            TextField(controller: _bodyCtrl, maxLines: 3, decoration: const InputDecoration(labelText: 'Matn *')),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _target,
              decoration: const InputDecoration(labelText: 'Kimga'),
              items: const [
                DropdownMenuItem(value: 'ALL', child: Text('Hammaga')),
                DropdownMenuItem(value: 'SALES', child: Text('Sotuv do\'konlari')),
                DropdownMenuItem(value: 'DEBT', child: Text('Qarz do\'konlari')),
              ],
              onChanged: (v) => setState(() => _target = v!),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _loading ? null : _send,
                child: _loading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.white))
                    : const Text('Yuborish'),
              ),
            ),
          ]),
        ),
      ),
    );
  }

  Future<void> _send() async {
    if (_titleCtrl.text.isEmpty || _bodyCtrl.text.isEmpty) return;
    setState(() => _loading = true);
    try {
      await ref.read(notificationsApiProvider).create(
        title: _titleCtrl.text.trim(), body: _bodyCtrl.text.trim(), target: _target,
      );
      widget.onSent();
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
