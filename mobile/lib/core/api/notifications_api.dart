import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'client.dart';

class AppNotification {
  final String id;
  final String title;
  final String body;
  final bool isRead;
  final String createdAt;
  final String? target;

  AppNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.isRead,
    required this.createdAt,
    this.target,
  });

  factory AppNotification.fromJson(Map<String, dynamic> j) => AppNotification(
        id: j['id'] ?? '',
        title: j['title'] ?? '',
        body: j['body'] ?? '',
        isRead: j['isRead'] ?? false,
        createdAt: j['createdAt'] ?? DateTime.now().toIso8601String(),
        target: j['target'],
      );
}

class NotificationsApi {
  final Dio _dio;
  NotificationsApi(this._dio);

  Future<List<AppNotification>> getAll() async {
    final res = await _dio.get('/notifications');
    return (res.data as List).map((e) => AppNotification.fromJson(e)).toList();
  }

  Future<int> getUnreadCount() async {
    final res = await _dio.get('/notifications/unread-count');
    return res.data['count'] ?? 0;
  }

  Future<List<AppNotification>> getAllForAdmin() async {
    final res = await _dio.get('/notifications/admin');
    return (res.data as List).map((e) => AppNotification.fromJson(e)).toList();
  }

  Future<void> create({required String title, required String body, required String target}) async {
    await _dio.post('/notifications', data: {'title': title, 'body': body, 'target': target});
  }

  Future<void> markRead(String id) async {
    await _dio.patch('/notifications/$id/read');
  }

  Future<void> markAllRead() async {
    await _dio.patch('/notifications/read-all/mark');
  }

  Future<void> delete(String id) async {
    await _dio.delete('/notifications/$id');
  }
}

final notificationsApiProvider =
    Provider<NotificationsApi>((ref) => NotificationsApi(ref.watch(dioProvider)));
