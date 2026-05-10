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

  @override
  void initState() {
    super.initState();
    _emailController = TextEditingController();
    _passwordController = TextEditingController();
    _emailFocusNode = FocusNode();
    _passwordFocusNode = FocusNode();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _emailFocusNode.dispose();
    _passwordFocusNode.dispose();
    super.dispose();
  }

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

  void _handleLogin() {
    _validateEmail();
    _validatePassword();

    if (_emailError == null && _passwordError == null) {
      context.read<AuthBloc>().add(
            SignInEvent(
              email: _emailController.text.trim(),
              password: _passwordController.text,
            ),
          );
    }
  }

  void _handleGoogleLogin() {
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
                    final email = emailController.text.trim();
                    final validationError = Validators.validateEmail(email);
                    if (validationError != null) {
                      setDialogState(() {
                        localError = validationError;
                      });
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

    if (shouldSend != true || !mounted) {
      return;
    }

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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: BlocListener<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is AuthFailureState) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.failure.message),
                backgroundColor: Colors.red,
                duration: const Duration(seconds: 5),
              ),
            );
          }
        },
        child: BlocBuilder<AuthBloc, AuthState>(
          builder: (context, state) {
            final isLoading = state is AuthLoading;
            return Stack(
              children: [
                Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Color(0xFF0E3F36),
                        Color(0xFF255B90),
                        AppColors.background
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
                                color: Colors.white,
                              ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Sign in to continue your SSB journey',
                          style:
                              Theme.of(context).textTheme.bodyLarge?.copyWith(
                                    color: Colors.white.withValues(alpha: 0.88),
                                  ),
                        ),
                        const SizedBox(height: 30),
                        Container(
                          padding: const EdgeInsets.all(18),
                          decoration: BoxDecoration(
                            color: AppColors.glass,
                            borderRadius: BorderRadius.circular(24),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.4),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: 12),
                              CustomTextField(
                                label: 'Email',
                                hint: 'Enter your email',
                                keyboardType: TextInputType.emailAddress,
                                controller: _emailController,
                                focusNode: _emailFocusNode,
                                errorText: _emailError,
                                onChanged: (_) {
                                  if (_emailError != null) _validateEmail();
                                },
                                onEditingComplete: _validateEmail,
                              ),
                              const SizedBox(height: 24),
                              CustomTextField(
                                label: 'Password',
                                hint: 'Enter your password',
                                controller: _passwordController,
                                focusNode: _passwordFocusNode,
                                errorText: _passwordError,
                                isPassword: true,
                                onChanged: (_) {
                                  if (_passwordError != null) {
                                    _validatePassword();
                                  }
                                },
                                onEditingComplete: _validatePassword,
                              ),
                              const SizedBox(height: 16),
                              Align(
                                alignment: Alignment.centerRight,
                                child: TextButton(
                                  onPressed: _handleForgotPassword,
                                  child: Text(
                                    'Forgot Password?',
                                    style: Theme.of(context)
                                        .textTheme
                                        .labelMedium
                                        ?.copyWith(
                                          color: AppColors.primaryGreen,
                                          fontWeight: FontWeight.w600,
                                        ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 32),
                              SizedBox(
                                width: double.infinity,
                                height: 56,
                                child: ElevatedButton(
                                  onPressed: isLoading ? null : _handleLogin,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.secondary,
                                    disabledBackgroundColor: AppColors.textHint,
                                  ),
                                  child: isLoading
                                      ? const SizedBox(
                                          height: 24,
                                          width: 24,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                            valueColor:
                                                AlwaysStoppedAnimation<Color>(
                                              Colors.white,
                                            ),
                                          ),
                                        )
                                      : const Text('Sign In'),
                                ),
                              ),
                              const SizedBox(height: 24),
                              Row(
                                children: [
                                  Expanded(
                                      child: Divider(
                                          color: Colors.grey[300],
                                          thickness: 1)),
                                  Padding(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 16),
                                    child: Text(
                                      'OR',
                                      style: Theme.of(context)
                                          .textTheme
                                          .labelSmall
                                          ?.copyWith(
                                            color: Colors.grey[600],
                                          ),
                                    ),
                                  ),
                                  Expanded(
                                      child: Divider(
                                          color: Colors.grey[300],
                                          thickness: 1)),
                                ],
                              ),
                              const SizedBox(height: 24),
                              SizedBox(
                                width: double.infinity,
                                height: 56,
                                child: OutlinedButton.icon(
                                  onPressed:
                                      isLoading ? null : _handleGoogleLogin,
                                  style: OutlinedButton.styleFrom(
                                    backgroundColor: Colors.white,
                                  ),
                                  icon: const Icon(Icons.g_mobiledata_rounded,
                                      size: 26),
                                  label: const Text('Sign in with Google'),
                                ),
                              ),
                              const SizedBox(height: 32),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    "Don't have an account? ",
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodySmall
                                        ?.copyWith(
                                          color: Colors.grey[600],
                                        ),
                                  ),
                                  GestureDetector(
                                    onTap: () => Navigator.of(context)
                                        .pushNamed('/signup'),
                                    child: Text(
                                      'Sign Up',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall
                                          ?.copyWith(
                                            color: AppColors.primaryGreen,
                                            fontWeight: FontWeight.bold,
                                          ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
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
