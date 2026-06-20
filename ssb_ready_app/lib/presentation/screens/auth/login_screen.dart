import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';
import 'package:ssb_ready_app/core/utils/validators.dart';
import 'package:ssb_ready_app/domain/repositories/auth_repository.dart';
import 'package:ssb_ready_app/presentation/bloc/auth/auth_bloc.dart';
import 'package:ssb_ready_app/presentation/widgets/app_brand_logo.dart';
import 'package:ssb_ready_app/presentation/widgets/auth/custom_text_field.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  late TextEditingController _emailController;
  late TextEditingController _passwordController;
  late FocusNode _emailFocusNode;
  late FocusNode _passwordFocusNode;

  String? _emailError;
  String? _passwordError;

  // ─── Lockout state ────────────────────────────────────────────────────────

  /// Non-null while the user is rate-limited. Holds the unlock time.
  DateTime? _lockedUntil;
  Timer?    _lockoutTimer;
  int       _lockoutSecondsRemaining = 0;

  // ─────────────────────────────────────────────────────────────────────────

  @override
  void initState() {
    super.initState();
    _emailController    = TextEditingController();
    _passwordController = TextEditingController();
    _emailFocusNode     = FocusNode();
    _passwordFocusNode  = FocusNode();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _emailFocusNode.dispose();
    _passwordFocusNode.dispose();
    _lockoutTimer?.cancel();
    super.dispose();
  }

  // ─── Lockout helpers ─────────────────────────────────────────────────────

  void _startLockoutCountdown(Duration resetIn) {
    _lockoutTimer?.cancel();
    final until = DateTime.now().add(resetIn);
    setState(() {
      _lockedUntil              = until;
      _lockoutSecondsRemaining  = resetIn.inSeconds.clamp(1, resetIn.inSeconds);
    });

    _lockoutTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) { t.cancel(); return; }
      final remaining = until.difference(DateTime.now()).inSeconds;
      if (remaining <= 0) {
        t.cancel();
        setState(() {
          _lockedUntil             = null;
          _lockoutSecondsRemaining = 0;
        });
      } else {
        setState(() => _lockoutSecondsRemaining = remaining);
      }
    });
  }

  bool get _isLockedOut => _lockedUntil != null && _lockedUntil!.isAfter(DateTime.now());

  String get _lockoutLabel {
    final m = _lockoutSecondsRemaining ~/ 60;
    final s = _lockoutSecondsRemaining % 60;
    return m > 0
        ? 'Try again in ${m}m ${s.toString().padLeft(2, '0')}s'
        : 'Try again in ${_lockoutSecondsRemaining}s';
  }

  // ─── Validation ───────────────────────────────────────────────────────────

  void _validateEmail() {
    setState(() {
      _emailError = Validators.validateEmail(_emailController.text);
    });
  }

  void _validatePassword() {
    setState(() {
      _passwordError = Validators.validatePassword(_passwordController.text);
    });
  }

  // ─── Actions ─────────────────────────────────────────────────────────────

  void _handleLogin() {
    if (_isLockedOut) return;
    _validateEmail();
    _validatePassword();

    if (_emailError == null && _passwordError == null) {
      context.read<AuthBloc>().add(
            SignInEvent(
              email:    _emailController.text.trim(),
              password: _passwordController.text,
            ),
          );
    }
  }

  void _handleGoogleLogin() {
    if (_isLockedOut) return;
    context.read<AuthBloc>().add(const GoogleSignInEvent());
  }

  Future<void> _handleForgotPassword() async {
    final emailController = TextEditingController(
      text: _emailController.text.trim(),
    );
    String? localError;

    final shouldSend = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Reset Password'),
              content: TextField(
                controller: emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: InputDecoration(
                  labelText: 'Email',
                  errorText: localError,
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(dialogContext).pop(false),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: () {
                    final email           = emailController.text.trim();
                    final validationError = Validators.validateEmail(email);
                    if (validationError != null) {
                      setDialogState(() => localError = validationError);
                      return;
                    }
                    Navigator.of(dialogContext).pop(true);
                  },
                  child: const Text('Send'),
                ),
              ],
            );
          },
        );
      },
    );

    if (shouldSend != true || !mounted) return;

    try {
      await context.read<AuthRepository>().resetPassword(
            emailController.text.trim(),
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Password reset link sent. Check your email.'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString()),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  // ─── Build ────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: BlocListener<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is AuthFailureState) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content:         Text(state.failure.message),
                backgroundColor: Colors.red,
                duration:        const Duration(seconds: 5),
              ),
            );
          } else if (state is AuthRateLimited) {
            // Start the on-screen countdown; dismiss any open snackbar.
            ScaffoldMessenger.of(context).hideCurrentSnackBar();
            _startLockoutCountdown(
              state.lockedUntil.difference(DateTime.now()),
            );
          }
        },
        child: BlocBuilder<AuthBloc, AuthState>(
          builder: (context, state) {
            final isLoading   = state is AuthLoading;
            final isBlocked   = _isLockedOut || isLoading;

            return Stack(
              children: [
                // Background gradient
                Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin:  Alignment.topCenter,
                      end:    Alignment.bottomCenter,
                      colors: [
                        Color(0xFF0E3F36),
                        Color(0xFF255B90),
                        AppColors.background,
                      ],
                      stops: [0, 0.28, 0.75],
                    ),
                  ),
                ),

                SafeArea(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 12),
                        const Center(
                          child: AppBrandLogo(size: 88, borderRadius: 22),
                        ),
                        const SizedBox(height: 20),

                        Text(
                          'Welcome Back',
                          style: Theme.of(context)
                              .textTheme
                              .headlineLarge
                              ?.copyWith(
                                fontWeight: FontWeight.w800,
                                color:      Colors.white,
                              ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Sign in to continue your SSB preparation',
                          style: Theme.of(context)
                              .textTheme
                              .bodyMedium
                              ?.copyWith(color: Colors.white70),
                        ),
                        const SizedBox(height: 32),

                        // ── Lockout banner ──────────────────────────────────
                        if (_isLockedOut) ...[
                          _LockoutBanner(label: _lockoutLabel),
                          const SizedBox(height: 16),
                        ],

                        // ── Form card ───────────────────────────────────────
                        Container(
                          padding:      const EdgeInsets.all(24),
                          decoration:   BoxDecoration(
                            color:        AppColors.surface,
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: [
                              BoxShadow(
                                color:      Colors.black.withValues(alpha: 0.08),
                                blurRadius: 20,
                                offset:     const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              IgnorePointer(
                                ignoring: isBlocked,
                                child: Opacity(
                                  opacity: isBlocked ? 0.45 : 1.0,
                                  child: CustomTextField(
                                    controller:      _emailController,
                                    focusNode:       _emailFocusNode,
                                    label:           'Email',
                                    hint:            'you@example.com',
                                    keyboardType:    TextInputType.emailAddress,
                                    errorText:       _emailError,
                                    textInputAction: TextInputAction.next,
                                    onChanged: (_) {
                                      if (_emailError != null) _validateEmail();
                                    },
                                    onEditingComplete: () =>
                                        _passwordFocusNode.requestFocus(),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 16),
                              IgnorePointer(
                                ignoring: isBlocked,
                                child: Opacity(
                                  opacity: isBlocked ? 0.45 : 1.0,
                                  child: CustomTextField(
                                    controller:      _passwordController,
                                    focusNode:       _passwordFocusNode,
                                    label:           'Password',
                                    hint:            '••••••••',
                                    obscureText:     true,
                                    errorText:       _passwordError,
                                    textInputAction: TextInputAction.done,
                                    onChanged: (_) {
                                      if (_passwordError != null) _validatePassword();
                                    },
                                    onEditingComplete: _handleLogin,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 8),

                              // Forgot password
                              Align(
                                alignment: Alignment.centerRight,
                                child: TextButton(
                                  onPressed: isBlocked ? null : _handleForgotPassword,
                                  child: Text(
                                    'Forgot Password?',
                                    style: Theme.of(context)
                                        .textTheme
                                        .labelMedium
                                        ?.copyWith(
                                          color: isBlocked
                                              ? AppColors.textHint
                                              : AppColors.primary,
                                        ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 8),

                              // Sign In button
                              ElevatedButton(
                                onPressed: isBlocked ? null : _handleLogin,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor:         AppColors.secondary,
                                  disabledBackgroundColor: AppColors.textHint,
                                  minimumSize: const Size.fromHeight(52),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(14),
                                  ),
                                ),
                                child: isLoading
                                    ? const SizedBox(
                                        height: 24,
                                        width:  24,
                                        child:  CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      )
                                    : Text(
                                        _isLockedOut ? _lockoutLabel : 'Sign In',
                                        style: const TextStyle(
                                          fontSize:   16,
                                          fontWeight: FontWeight.w700,
                                          color:      Colors.white,
                                        ),
                                      ),
                              ),
                              const SizedBox(height: 16),

                              // Divider
                              Row(children: [
                                const Expanded(child: Divider()),
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 12),
                                  child: Text(
                                    'or',
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodySmall
                                        ?.copyWith(color: AppColors.textHint),
                                  ),
                                ),
                                const Expanded(child: Divider()),
                              ]),
                              const SizedBox(height: 16),

                              // Google Sign-In button
                              OutlinedButton.icon(
                                onPressed: isBlocked ? null : _handleGoogleLogin,
                                style: OutlinedButton.styleFrom(
                                  backgroundColor: AppColors.surface,
                                  foregroundColor: AppColors.textPrimary,
                                  minimumSize: const Size.fromHeight(52),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(14),
                                  ),
                                ),
                                icon:  const Icon(Icons.g_mobiledata_rounded, size: 28),
                                label: const Text(
                                  'Continue with Google',
                                  style: TextStyle(fontWeight: FontWeight.w600),
                                ),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 24),

                        // Sign Up link
                        Center(
                          child: TextButton(
                            onPressed: isBlocked
                                ? null
                                : () => Navigator.of(context)
                                    .pushNamed('/signup'),
                            child: RichText(
                              text: TextSpan(
                                text:  "Don't have an account? ",
                                style: Theme.of(context)
                                    .textTheme
                                    .bodyMedium
                                    ?.copyWith(color: Colors.white70),
                                children: [
                                  TextSpan(
                                    text: 'Sign Up',
                                    style: TextStyle(
                                      color:      isBlocked
                                          ? Colors.white30
                                          : AppColors.secondary,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

// ─── Lockout Banner ───────────────────────────────────────────────────────────

class _LockoutBanner extends StatelessWidget {
  final String label;
  const _LockoutBanner({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color:        const Color(0xFFFFF3CD),
        borderRadius: BorderRadius.circular(12),
        border:       Border.all(color: const Color(0xFFFFCA28), width: 1),
      ),
      child: Row(
        children: [
          const Icon(Icons.lock_clock_rounded,
              color: Color(0xFFF59E0B), size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Account temporarily locked',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color:      Color(0xFF92400E),
                    fontSize:   13,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  label,
                  style: const TextStyle(
                    color:    Color(0xFF92400E),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
