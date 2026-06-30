import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/auth_provider.dart';
import '../../core/api/client.dart';
import '../../core/theme/app_theme.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});
  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage>
    with SingleTickerProviderStateMixin {
  String _pin = '';
  String _error = '';
  late AnimationController _shakeController;
  late Animation<double> _shakeAnim;

  @override
  void initState() {
    super.initState();
    _shakeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _shakeAnim = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _shakeController, curve: Curves.elasticIn),
    );
  }

  @override
  void dispose() {
    _shakeController.dispose();
    super.dispose();
  }

  void _handleKey(String key) {
    final isLoading = ref.read(authProvider).isLoading;
    if (isLoading) return;

    if (key == '⌫') {
      if (_pin.isNotEmpty) setState(() { _pin = _pin.substring(0, _pin.length - 1); _error = ''; });
      return;
    }
    if (_pin.length >= 8) return;

    setState(() { _pin += key; _error = ''; });
    if (_pin.length == 8) _doLogin();
  }

  Future<void> _doLogin() async {
    if (_pin.length != 8) return;
    try {
      final result = await ref.read(authProvider.notifier).loginWithPin(_pin);
      if (!mounted) return;
      if (result.requireFaceVerification || result.requireSetup) {
        setState(() { _pin = ''; });
        showDialog(
          context: context,
          builder: (_) => AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: const Text("Yuz tekshiruvi"),
            content: const Text(
              "Yuz tekshiruvi faqat veb saytda mavjud.\nmysantex.uz saytiga kiring va u yerda sozlang.",
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('OK'),
              )
            ],
          ),
        );
        return;
      }
      final user = ref.read(authProvider).user;
      if (user?.isSuperAdmin == true) {
        context.go('/admin');
      } else if (user?.isDebtStore == true) {
        context.go('/debtors');
      } else {
        context.go('/dashboard');
      }
    } catch (e) {
      setState(() {
        _error = extractError(e);
        _pin = '';
      });
      _shakeController.forward(from: 0);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final isLoading = authState.isLoading;
    final isInitializing = authState.status == AuthStatus.initializing;
    final size = MediaQuery.of(context).size;

    return Scaffold(
      body: Stack(
        children: [
          // Gradient background
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFFEEF6FF), Color(0xFFF0F9F4)],
              ),
            ),
          ),
          // Blob decorations
          Positioned(
            top: -80, left: -60,
            child: _Blob(size: 300, color: const Color(0xFF2563EB).withOpacity(0.12)),
          ),
          Positioned(
            bottom: -60, right: -40,
            child: _Blob(size: 260, color: const Color(0xFF10B981).withOpacity(0.1)),
          ),
          Positioned(
            top: size.height * 0.3, left: size.width * 0.2,
            child: _Blob(size: 200, color: const Color(0xFF8B5CF6).withOpacity(0.08)),
          ),
          // Initializing banner
          if (isInitializing)
            Positioned(
              top: 0, left: 0, right: 0,
              child: SafeArea(
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  color: AppColors.primary.withOpacity(0.15),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SizedBox(
                        width: 12, height: 12,
                        child: CircularProgressIndicator(strokeWidth: 1.5, color: AppColors.primary),
                      ),
                      SizedBox(width: 8),
                      Text('Sessiya tekshirilmoqda...', style: TextStyle(fontSize: 12, color: AppColors.primary)),
                    ],
                  ),
                ),
              ),
            ),
          // Content
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 28),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Logo
                    Container(
                      width: 64, height: 64,
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFDBEAFE)),
                        boxShadow: [
                          BoxShadow(color: AppColors.primary.withOpacity(0.12), blurRadius: 12, offset: const Offset(0, 4)),
                        ],
                      ),
                      child: const Icon(Icons.shopping_bag_outlined, color: AppColors.primary, size: 32),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'My Santex',
                      style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.slate800, letterSpacing: -0.5),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'PIN kodingizni kiriting',
                      style: TextStyle(fontSize: 14, color: AppColors.slate400),
                    ),
                    const SizedBox(height: 32),
                    // PIN dots
                    AnimatedBuilder(
                      animation: _shakeAnim,
                      builder: (_, child) {
                        final offset = _shakeController.isAnimating
                            ? (8 * (0.5 - (_shakeAnim.value % 1)).abs() * (_shakeAnim.value < 0.5 ? -1 : 1))
                            : 0.0;
                        return Transform.translate(
                          offset: Offset(offset * 10, 0),
                          child: child,
                        );
                      },
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(8, (i) {
                          final filled = i < _pin.length;
                          final isError = _error.isNotEmpty;
                          return AnimatedContainer(
                            duration: const Duration(milliseconds: 150),
                            margin: const EdgeInsets.symmetric(horizontal: 5),
                            width: filled ? 16 : 14,
                            height: filled ? 16 : 14,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: isError
                                  ? const Color(0xFFFCA5A5)
                                  : filled
                                      ? AppColors.primary
                                      : AppColors.slate200,
                              boxShadow: filled && !isError
                                  ? [BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 6)]
                                  : null,
                            ),
                          );
                        }),
                      ),
                    ),
                    // Error
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      height: _error.isNotEmpty ? 48 : 0,
                      child: _error.isNotEmpty
                          ? Container(
                              margin: const EdgeInsets.only(top: 12),
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF2F2),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFFFECACA)),
                              ),
                              child: Text(_error, style: const TextStyle(color: Color(0xFFDC2626), fontSize: 13), textAlign: TextAlign.center),
                            )
                          : null,
                    ),
                    const SizedBox(height: 28),
                    // Keypad
                    _PinKeypad(onKey: _handleKey, isLoading: isLoading, pinLength: _pin.length),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Blob extends StatelessWidget {
  final double size;
  final Color color;
  const _Blob({required this.size, required this.color});
  @override
  Widget build(BuildContext context) {
    return Container(
      width: size, height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color,
      ),
    );
  }
}

class _PinKeypad extends StatelessWidget {
  final void Function(String) onKey;
  final bool isLoading;
  final int pinLength;

  const _PinKeypad({required this.onKey, required this.isLoading, required this.pinLength});

  @override
  Widget build(BuildContext context) {
    const keys = ['1','2','3','4','5','6','7','8','9','⌫','0','✓'];
    return GridView.count(
      crossAxisCount: 3,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
      childAspectRatio: 1.5,
      children: keys.map((key) {
        final isDel = key == '⌫';
        final isOk = key == '✓';
        final canOk = pinLength == 8 && !isLoading;

        return Material(
          color: isOk
              ? (canOk ? AppColors.primary : AppColors.slate100)
              : AppColors.white,
          borderRadius: BorderRadius.circular(14),
          elevation: isOk && canOk ? 3 : 0,
          shadowColor: AppColors.primary.withOpacity(0.3),
          child: InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: isLoading ? null : () => onKey(key),
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                border: isOk
                    ? null
                    : Border.all(color: AppColors.slate100),
              ),
              alignment: Alignment.center,
              child: isOk && isLoading
                  ? const SizedBox(
                      width: 20, height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.white),
                    )
                  : Text(
                      isOk ? '→' : key,
                      style: TextStyle(
                        fontSize: isOk ? 22 : (isDel ? 20 : 22),
                        fontWeight: FontWeight.w600,
                        color: isOk
                            ? (canOk ? AppColors.white : AppColors.slate300)
                            : isDel
                                ? AppColors.slate500
                                : AppColors.slate800,
                      ),
                    ),
            ),
          ),
        );
      }).toList(),
    );
  }
}
