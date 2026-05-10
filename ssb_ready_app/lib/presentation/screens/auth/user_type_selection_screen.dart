import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';
import 'package:ssb_ready_app/presentation/bloc/auth/auth_bloc.dart';

/// Route wrapper: Fresher/Repeater is only shown after Firebase auth.
class UserTypeSelectionGate extends StatelessWidget {
  const UserTypeSelectionGate({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        if (state is AuthAuthenticated) {
          final fromRoute =
              ModalRoute.of(context)?.settings.arguments as String?;
          final email = (fromRoute != null && fromRoute.isNotEmpty)
              ? fromRoute
              : state.user.email;
          return UserTypeSelectionScreen(
            userEmail: email.isEmpty ? state.user.email : email,
          );
        }
        return const _MustSignInFirstRedirect();
      },
    );
  }
}

class _MustSignInFirstRedirect extends StatefulWidget {
  const _MustSignInFirstRedirect();

  @override
  State<_MustSignInFirstRedirect> createState() =>
      _MustSignInFirstRedirectState();
}

class _MustSignInFirstRedirectState extends State<_MustSignInFirstRedirect> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }
      Navigator.of(context).pushNamedAndRemoveUntil('/login', (_) => false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: CircularProgressIndicator(
          color: AppColors.primary.withValues(alpha: 0.7),
        ),
      ),
    );
  }
}

class UserTypeSelectionScreen extends StatefulWidget {
  final String userEmail;

  const UserTypeSelectionScreen({
    super.key,
    required this.userEmail,
  });

  @override
  State<UserTypeSelectionScreen> createState() =>
      _UserTypeSelectionScreenState();
}

class _UserTypeSelectionScreenState extends State<UserTypeSelectionScreen> {
  String? _selectedUserType;

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<AuthBloc, AuthState>(
      listener: (context, state) {
        // `/dashboard` routing is handled by the root [BlocListener] in [App]
        // when [UpdateUserTypeEvent] completes and userType is set.
        if (state is AuthFailureState) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.failure.message),
              backgroundColor: Colors.red,
            ),
          );
        }
      },
      builder: (context, state) {
        final isLoading = state is AuthLoading;
        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            leading: IconButton(
              icon: const Icon(Icons.arrow_back),
              tooltip: 'Sign out',
              onPressed: () {
                FocusScope.of(context).unfocus();
                context.read<AuthBloc>().add(const SignOutEvent());
              },
            ),
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 20),
                Text(
                  'Join SSBReady',
                  style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Which category best describes you?',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Finish this step after signing in or creating an account — '
                  'we use it to personalize your prep.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.textHint,
                      ),
                ),
                const SizedBox(height: 40),
                // Fresher Card (stored as first_timer)
                _buildUserTypeCard(
                  context,
                  title: 'Fresher',
                  description:
                      'First SSB attempt — I want clear, step‑by‑step guidance.',
                  icon: Icons.explore,
                  value: 'first_timer',
                ),
                const SizedBox(height: 24),
                // Repeater Card
                _buildUserTypeCard(
                  context,
                  title: 'Repeater',
                  description:
                      'I\'ve attempted SSB before. I want to practice and improve.',
                  icon: Icons.trending_up,
                  value: 'repeater',
                ),
                const SizedBox(height: 48),
                // Continue Button
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _selectedUserType == null || isLoading
                        ? null
                        : _handleContinue,
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
                                  AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          )
                        : Text(
                            'Continue',
                            style: Theme.of(context)
                                .textTheme
                                .labelLarge
                                ?.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildUserTypeCard(
    BuildContext context, {
    required String title,
    required String description,
    required IconData icon,
    required String value,
  }) {
    final isSelected = _selectedUserType == value;
    const radius = 18.0;

    void select() {
      FocusScope.of(context).unfocus();
      setState(() => _selectedUserType = value);
    }

    // One InkWell for the whole card (no nested Radio gestures). Wide hit target:
    // `SizedBox(width: infinity)` avoids narrow intrinsic-width rows on some layouts.
    // Selection stays enabled during AuthBloc loading — only "Continue" is disabled,
    // so radios are never unintentionally greyed out.
    return SizedBox(
      width: double.infinity,
      child: Material(
        color: isSelected
            ? AppColors.secondary.withValues(alpha: 0.07)
            : Colors.white,
        elevation: isSelected ? 2 : 0,
        shadowColor: AppColors.secondary.withValues(alpha: 0.18),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radius),
          side: BorderSide(
            color: isSelected ? AppColors.secondary : AppColors.border,
            width: isSelected ? 2 : 1,
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: select,
          borderRadius: BorderRadius.circular(radius),
          splashColor: AppColors.secondary.withValues(alpha: 0.12),
          highlightColor: AppColors.secondary.withValues(alpha: 0.06),
          child: Padding(
            padding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppColors.secondary
                        : AppColors.surfaceSoft,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    icon,
                    color: isSelected ? Colors.white : AppColors.textSecondary,
                    size: 28,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        description,
                        style:
                            Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: AppColors.textSecondary,
                                ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Icon(
                  isSelected
                      ? Icons.radio_button_checked
                      : Icons.radio_button_off,
                  color: isSelected ? AppColors.secondary : AppColors.border,
                  size: 28,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _handleContinue() async {
    if (_selectedUserType == null) return;

    try {
      final authState = context.read<AuthBloc>().state;
      if (authState is! AuthAuthenticated) {
        throw Exception('Please sign in again to continue.');
      }

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('user_type', _selectedUserType!);
      await prefs.setString('user_email', widget.userEmail);
      if (!mounted) return;
      context.read<AuthBloc>().add(
            UpdateUserTypeEvent(
              userId: authState.user.id,
              userType: _selectedUserType!,
            ),
          );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }
}
