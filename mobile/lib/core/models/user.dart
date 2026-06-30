class AppStore {
  final String id;
  final String name;
  final String subscriptionStatus;
  final String storeType;

  AppStore({
    required this.id,
    required this.name,
    required this.subscriptionStatus,
    required this.storeType,
  });

  factory AppStore.fromJson(Map<String, dynamic> j) => AppStore(
        id: j['id'] ?? '',
        name: j['name'] ?? '',
        subscriptionStatus: j['subscriptionStatus'] ?? '',
        storeType: j['storeType'] ?? 'SALES',
      );

  bool get isDebtStore => storeType == 'DEBT';
}

class User {
  final String id;
  final String name;
  final String? email;
  final String role;
  final String? storeId;
  final AppStore? store;

  User({
    required this.id,
    required this.name,
    this.email,
    required this.role,
    this.storeId,
    this.store,
  });

  factory User.fromJson(Map<String, dynamic> j) => User(
        id: j['id'] ?? '',
        name: j['name'] ?? '',
        email: j['email'],
        role: j['role'] ?? 'SALES_MANAGER',
        storeId: j['storeId'],
        store: j['store'] != null ? AppStore.fromJson(j['store']) : null,
      );

  bool get isSuperAdmin => role == 'SUPER_ADMIN';
  bool get isROP => role == 'ROP';
  bool get isDebtStore => store?.isDebtStore ?? false;
}
