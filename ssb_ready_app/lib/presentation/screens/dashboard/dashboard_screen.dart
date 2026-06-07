import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';
import 'package:ssb_ready_app/presentation/bloc/auth/auth_bloc.dart';
import 'package:ssb_ready_app/presentation/widgets/dashboard/feature_card.dart';
import 'package:ssb_ready_app/domain/repositories/test_history_repository.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _bgController;

  @override
  void initState() {
    super.initState();
    _bgController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 8),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _bgController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: BlocListener<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is AuthUnauthenticated) {
            Navigator.of(context).pushReplacementNamed('/login');
          } else if (state is AuthFailureState) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.failure.message),
                backgroundColor: AppColors.error,
              ),
            );
          }
        },
        child: BlocBuilder<AuthBloc, AuthState>(
          builder: (context, state) {
            String firstName = 'Aspirant';
            if (state is AuthAuthenticated) {
              final fullName = state.user.fullName;
              firstName = fullName.isNotEmpty
                  ? fullName
                  : (state.user.firstName ?? 'Aspirant');
            }

            return CustomScrollView(
              physics: const BouncingScrollPhysics(),
              slivers: [
                _buildHeroSliver(context, firstName, state),

                // Premium banner — right below hero, only for free users
                if (state is AuthAuthenticated && state.user.isPremium != true)
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                    sliver: SliverToBoxAdapter(
                      child: _buildPremiumBanner(context),
                    ),
                  ),

                // ── Daily Quiz featured banner (full-width, daily action) ──
                SliverPadding(
                  padding: EdgeInsets.fromLTRB(20, state is AuthAuthenticated && state.user.isPremium != true ? 20 : 16, 20, 0),
                  sliver: SliverToBoxAdapter(
                    child: _DailyQuizBanner(
                      onTap: () => Navigator.pushNamed(context, '/current-affairs'),
                    ),
                  ),
                ),

                // ── Training modules 2×2 grid ─────────────────────────────
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                  sliver: SliverToBoxAdapter(
                    child: _SectionLabel(label: 'TRAINING MODULES'),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                  sliver: SliverGrid(
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 14,
                      crossAxisSpacing: 14,
                      childAspectRatio: 0.88,
                    ),
                    delegate: SliverChildListDelegate([
                      FeatureCard(
                        title: 'OIR Practice',
                        description: 'Fast IQ rounds with live scoring.',
                        icon: Icons.psychology_alt_outlined,
                        color: AppColors.oirColor,
                        onTap: () => Navigator.pushNamed(context, '/oir-test'),
                      ),
                      FeatureCard(
                        title: 'PPDT Module',
                        description: 'Story perception & AI feedback.',
                        icon: Icons.image_search_outlined,
                        color: AppColors.ppdtColor,
                        onTap: () => Navigator.pushNamed(context, '/ppdt'),
                      ),
                      FeatureCard(
                        title: 'Psychology',
                        description: 'TAT · WAT · SRT adaptive flow.',
                        icon: Icons.auto_graph_outlined,
                        color: AppColors.psychColor,
                        onTap: () => Navigator.pushNamed(context, '/psychology'),
                      ),
                      FeatureCard(
                        title: 'Interview',
                        description: 'PIQ + AI mock interview.',
                        icon: Icons.forum_outlined,
                        color: AppColors.interviewColor,
                        onTap: () => Navigator.pushNamed(context, '/interview'),
                      ),
                    ]),
                  ),
                ),

                // Momentum / progress section
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
                  sliver: SliverToBoxAdapter(
                    child: _SectionLabel(label: 'MOMENTUM'),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
                  sliver: SliverToBoxAdapter(
                    child: _buildProgressSection(context, state),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildHeroSliver(
      BuildContext context, String firstName, AuthState state) {
    return SliverAppBar(
      expandedHeight: 220,
      floating: false,
      pinned: true,
      backgroundColor: Colors.transparent,
      surfaceTintColor: Colors.transparent,
      forceMaterialTransparency: true,
      flexibleSpace: FlexibleSpaceBar(
        collapseMode: CollapseMode.parallax,
        background: _AnimatedHeroBackground(
          controller: _bgController,
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.only(left: 24, right: 20, bottom: 12, top: 0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Greeting
                  const Text(
                    'Jai Hind,',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 1),
                  Text(
                    '$firstName!',
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 30,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.5,
                      height: 1.1,
                    ),
                  ),

                  const SizedBox(height: 4),

                  Text(
                    'Your mission: Recommend. Train smarter.',
                    style: TextStyle(
                      color: AppColors.textSecondary.withValues(alpha: 0.85),
                      fontSize: 13,
                    ),
                  ),

                  const SizedBox(height: 10),

                  // Quick stats row
                  _buildQuickStats(state),
                ],
              ),
            ),
          ),
        ),
      ),
      // Collapsed app bar — branded logo
      title: const _BrandLogo(),
      actions: [
        IconButton(
          icon: const Icon(Icons.account_circle_outlined,
              color: AppColors.textSecondary),
          onPressed: () => Navigator.pushNamed(context, '/profile'),
        ),
        IconButton(
          icon: const Icon(Icons.logout_rounded,
              color: AppColors.textSecondary, size: 20),
          onPressed: () => _handleLogout(context),
        ),
        const SizedBox(width: 4),
      ],
    );
  }

  Widget _buildQuickStats(AuthState state) {
    if (state is! AuthAuthenticated) return const SizedBox();
    return Row(
      children: [
        _StatPill(
          icon: Icons.workspace_premium_outlined,
          label: state.user.isPremium == true ? 'Premium' : 'Free Plan',
          color: state.user.isPremium == true
              ? AppColors.premiumColor
              : AppColors.textHint,
        ),
        const SizedBox(width: 8),
        _StatPill(
          icon: Icons.military_tech_outlined,
          label: _formatUserType(state.user.userType),
          color: AppColors.psychColor,
        ),
      ],
    );
  }

  Widget _buildProgressSection(BuildContext context, AuthState state) {
    if (state is! AuthAuthenticated) return const SizedBox();
    final userId = state.user.id;

    return FutureBuilder(
      future: context.read<TestHistoryRepository>().getOirHistory(userId),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return _GlassCard(
            child: const Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: CircularProgressIndicator()),
            ),
          );
        }

        final results = snapshot.data ?? [];

        if (results.isEmpty) {
          return _GlassCard(
            accentColor: AppColors.primary,
            child: Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Icon(Icons.trending_up_rounded,
                      color: AppColors.primary),
                ),
                const SizedBox(width: 16),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Start your first OIR attempt',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Complete one test to unlock performance insights.',
                        style: TextStyle(
                            color: AppColors.textSecondary, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        }

        final latest = results.first;
        final pct = latest.totalQuestions > 0
            ? (latest.score / latest.totalQuestions * 100).round()
            : 0;
        final accentColor = pct >= 70
            ? AppColors.success
            : pct >= 50
                ? AppColors.accent
                : AppColors.error;

        return _GlassCard(
          accentColor: accentColor,
          child: Row(
            children: [
              // Score ring
              SizedBox(
                width: 60,
                height: 60,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    CircularProgressIndicator(
                      value: latest.totalQuestions > 0
                          ? latest.score / latest.totalQuestions
                          : 0,
                      strokeWidth: 5,
                      backgroundColor:
                          accentColor.withValues(alpha: 0.15),
                      valueColor:
                          AlwaysStoppedAnimation(accentColor),
                    ),
                    Center(
                      child: Text(
                        '$pct%',
                        style: TextStyle(
                          color: accentColor,
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 18),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Latest OIR Snapshot',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${latest.score} correct out of ${latest.totalQuestions} questions',
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      pct >= 70
                          ? 'Excellent — aim for OIR-1!'
                          : pct >= 50
                              ? 'Good start — push for 70%+'
                              : 'Keep practising daily.',
                      style: TextStyle(
                        color: accentColor,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildPremiumBanner(BuildContext context) {
    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, '/premium'),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF1A1200), Color(0xFF2C1F00)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
              color: AppColors.accent.withValues(alpha: 0.35), width: 1),
          boxShadow: [
            BoxShadow(
              color: AppColors.accent.withValues(alpha: 0.08),
              blurRadius: 20,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.accent.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.workspace_premium_outlined,
                  color: AppColors.accent, size: 24),
            ),
            const SizedBox(width: 14),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Unlock Lifetime Premium — ₹299',
                    style: TextStyle(
                      color: AppColors.accent,
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  SizedBox(height: 3),
                  Text(
                    'Full PPDT image bank, all TAT cards, unlimited practice.',
                    style: TextStyle(
                        color: AppColors.textSecondary, fontSize: 12),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded,
                color: AppColors.accent, size: 20),
          ],
        ),
      ),
    );
  }

  void _handleLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirm Logout'),
        content: const Text('Are you sure you want to log out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel',
                style: TextStyle(color: AppColors.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.read<AuthBloc>().add(const SignOutEvent());
            },
            style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.error),
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Animated hero background with slow-moving radial blobs
// ─────────────────────────────────────────────────────────────────────────────
class _AnimatedHeroBackground extends StatelessWidget {
  final AnimationController controller;
  final Widget child;
  const _AnimatedHeroBackground(
      {required this.controller, required this.child});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        final t = controller.value;
        return Stack(
            children: [
              // Full background fading to transparent at the bottom
              const Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Color(0xFF0D1630), Color(0xFF0D1630), Colors.transparent],
                      stops: [0.0, 0.55, 1.0],
                    ),
                  ),
                ),
              ),
              // Blob 1 — primary blue, fades with container
              Positioned(
                top: -40 + math.sin(t * math.pi * 2) * 20,
                right: -30 + math.cos(t * math.pi) * 15,
                child: _Blob(
                  size: 220,
                  color: AppColors.primary.withValues(alpha: 0.18),
                ),
              ),
              // Blob 2 — violet, positioned to bleed past bottom
              Positioned(
                bottom: -60 + math.cos(t * math.pi * 2) * 15,
                left: -40 + math.sin(t * math.pi) * 10,
                child: _Blob(
                  size: 200,
                  color: AppColors.secondary.withValues(alpha: 0.12),
                ),
              ),
              child,
            ],
        );
      },
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
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(
          colors: [color, color.withValues(alpha: 0)],
          stops: const [0.0, 1.0],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable small widgets
// ─────────────────────────────────────────────────────────────────────────────
class _SectionLabel extends StatelessWidget {
  final String label;
  const _SectionLabel({required this.label});
  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: const TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.4,
        color: AppColors.textHint,
      ),
    );
  }
}

String _formatUserType(String? raw) {
  if (raw == null || raw.isEmpty) return 'All Entry';
  return raw
      .split(RegExp(r'[_\s]+'))
      .map((w) => w.isEmpty ? '' : '${w[0].toUpperCase()}${w.substring(1).toLowerCase()}')
      .join(' ');
}

class _StatPill extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  const _StatPill(
      {required this.icon, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.20), width: 0.8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: color.withValues(alpha: 0.85)),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: color.withValues(alpha: 0.9),
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }
}


// ── Brand Logo ────────────────────────────────────────────────────────────────
class _BrandLogo extends StatelessWidget {
  const _BrandLogo();

  @override
  Widget build(BuildContext context) {
    const double iconSize = 16.0;
    const double ssbSize = 16.0;
    const double readySize = 16.0;
    const double badgeSize = 7.5;

    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        // Star shield icon with glow
        Container(
          width: iconSize + 10,
          height: iconSize + 10,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: const LinearGradient(
              colors: AppColors.brandGradient,
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withValues(alpha: 0.5),
                blurRadius: 8,
                spreadRadius: 0,
              ),
            ],
          ),
          child: Icon(Icons.star_rounded, size: iconSize - 2, color: Colors.white),
        ),
        const SizedBox(width: 8),
        // "SSB" — white bold
        Text(
          'SSB',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontSize: ssbSize,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.5,
          ),
        ),
        const SizedBox(width: 3),
        // "READY" — gradient
        ShaderMask(
          shaderCallback: (bounds) => const LinearGradient(
            colors: AppColors.brandGradient,
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
          ).createShader(bounds),
          child: Text(
            'READY',
            style: TextStyle(
              color: Colors.white,
              fontSize: readySize,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.5,
            ),
          ),
        ),
        const SizedBox(width: 5),
        // "2.0" gold badge
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
          decoration: BoxDecoration(
            color: AppColors.premiumColor.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(6),
            border: Border.all(
              color: AppColors.premiumColor.withValues(alpha: 0.5),
              width: 0.8,
            ),
          ),
          child: Text(
            '2.0',
            style: TextStyle(
              color: AppColors.premiumColor,
              fontSize: badgeSize,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.5,
            ),
          ),
        ),
      ],
    );
  }
}

// ─── Daily Quiz Banner ────────────────────────────────────────────────────────
/// Full-width featured card for the daily quiz.
/// Shows a "Done today ✓" badge when the user has already completed it.
class _DailyQuizBanner extends StatefulWidget {
  final VoidCallback onTap;
  const _DailyQuizBanner({required this.onTap});

  @override
  State<_DailyQuizBanner> createState() => _DailyQuizBannerState();
}

class _DailyQuizBannerState extends State<_DailyQuizBanner> {
  static const Color _amber = Color(0xFFF59E0B);
  bool _doneTodayChecked = false;
  bool _doneToday = false;

  @override
  void initState() {
    super.initState();
    _checkDone();
  }

  Future<void> _checkDone() async {
    final prefs = await SharedPreferences.getInstance();
    final last = prefs.getString('ca_last_quiz_date') ?? '';
    final today = _todayKey();
    if (mounted) setState(() { _doneToday = last == today; _doneTodayChecked = true; });
  }

  String _todayKey() {
    final d = DateTime.now();
    return '${d.year}-${d.month.toString().padLeft(2,'0')}-${d.day.toString().padLeft(2,'0')}';
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              _amber.withValues(alpha: 0.18),
              _amber.withValues(alpha: 0.06),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: _amber.withValues(alpha: 0.35)),
        ),
        child: Row(children: [
          // Icon
          Container(
            width: 50, height: 50,
            decoration: BoxDecoration(
              color: _amber.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Icons.newspaper_rounded, color: _amber, size: 26),
          ),
          const SizedBox(width: 16),
          // Text
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                const Text('Daily Current Affairs',
                    style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 15,
                        fontWeight: FontWeight.w800)),
                if (_doneTodayChecked && _doneToday) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Row(mainAxisSize: MainAxisSize.min, children: [
                      Icon(Icons.check_rounded, color: Color(0xFF10B981), size: 11),
                      SizedBox(width: 3),
                      Text('Done', style: TextStyle(color: Color(0xFF10B981), fontSize: 10, fontWeight: FontWeight.w700)),
                    ]),
                  ),
                ],
              ]),
              const SizedBox(height: 3),
              Text(
                _doneTodayChecked && _doneToday
                    ? 'Great job! Come back tomorrow for a new set.'
                    : '5 questions · Updates daily · Boost your GK',
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 12.5),
              ),
            ]),
          ),
          const SizedBox(width: 8),
          const Icon(Icons.chevron_right_rounded, color: AppColors.textHint, size: 20),
        ]),
      ),
    );
  }
}

class _GlassCard extends StatelessWidget {
  final Widget child;
  final Color? accentColor;
  const _GlassCard({required this.child, this.accentColor});
  @override
  Widget build(BuildContext context) {
    final accent = accentColor ?? AppColors.primary;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: accent.withValues(alpha: 0.18), width: 1),
        boxShadow: [
          BoxShadow(
            color: accent.withValues(alpha: 0.07),
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: child,
    );
  }
}
