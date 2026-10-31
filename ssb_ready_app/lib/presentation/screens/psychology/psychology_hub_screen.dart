import 'package:flutter/material.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';

class PsychologyHubScreen extends StatelessWidget {
  const PsychologyHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          _buildAppBar(context),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
            sliver: SliverToBoxAdapter(child: _buildHeaderCard()),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 4),
            sliver: SliverToBoxAdapter(
              child: _SectionLabel(label: 'CHOOSE YOUR TEST'),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                _TestCard(
                  title: 'Word Association Test',
                  shortTitle: 'WAT',
                  description:
                      '60 words flashed one by one. Write a meaningful sentence for each word within 15 seconds.',
                  icon: Icons.text_fields_rounded,
                  color: AppColors.accent,
                  duration: '~15 min',
                  questions: '60 words',
                  difficulty: 'Moderate',
                  onTap: () => Navigator.pushNamed(context, '/wat'),
                ),
                const SizedBox(height: 14),
                _TestCard(
                  title: 'Situation Reaction Test',
                  shortTitle: 'SRT',
                  description:
                      '60 real-life situations. Write your instinctive, logical reaction under timed pressure.',
                  icon: Icons.flash_on_rounded,
                  color: AppColors.secondary,
                  duration: '~20 min',
                  questions: '60 situations',
                  difficulty: 'Challenging',
                  onTap: () => Navigator.pushNamed(context, '/srt'),
                ),
                const SizedBox(height: 14),
                _TestCard(
                  title: 'Thematic Apperception Test',
                  shortTitle: 'TAT',
                  description:
                      'View ambiguous images and write personality-revealing stories that the SSB psychologist analyses.',
                  icon: Icons.image_search_rounded,
                  color: AppColors.primary,
                  duration: '~30 min',
                  questions: '12 images',
                  difficulty: 'Advanced',
                  onTap: () => Navigator.pushNamed(context, '/tat'),
                ),
                const SizedBox(height: 14),
                _TestCard(
                  title: 'Self Description Test',
                  shortTitle: 'SDT',
                  description:
                      'Write 5 paragraphs describing yourself from different perspectives — parents, teachers, friends, juniors, and yourself.',
                  icon: Icons.person_outline_rounded,
                  color: Color(0xFF10B981),
                  duration: '~60 min',
                  questions: '5 perspectives',
                  difficulty: 'Introspective',
                  onTap: () => Navigator.pushNamed(context, '/sdt'),
                ),
                const SizedBox(height: 14),
                _InfoCard(),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  SliverAppBar _buildAppBar(BuildContext context) {
    return SliverAppBar(
      pinned: true,
      backgroundColor: AppColors.background,
      surfaceTintColor: Colors.transparent,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios_new_rounded,
            size: 18, color: AppColors.textPrimary),
        onPressed: () => Navigator.pop(context),
      ),
      title: const Text(
        'Psychology Tests',
        style: TextStyle(
          color: AppColors.textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }

  Widget _buildHeaderCard() {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0D2030), Color(0xFF0A1520)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
            color: AppColors.psychColor.withValues(alpha: 0.25), width: 1),
        boxShadow: [
          BoxShadow(
            color: AppColors.psychColor.withValues(alpha: 0.08),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.psychColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                      color: AppColors.psychColor.withValues(alpha: 0.3)),
                ),
                child: const Icon(Icons.psychology_alt_outlined,
                    color: AppColors.psychColor, size: 28),
              ),
              const SizedBox(width: 14),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Psychological Assessment',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.3,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      '4 tests · AI-powered evaluation',
                      style: TextStyle(
                          color: AppColors.psychColor, fontSize: 13),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          const Text(
            'The SSB psychologist uses these tests to evaluate your Officer-Like Qualities — personality, leadership, and decisiveness.',
            style: TextStyle(
              color: AppColors.textSecondary,
              fontSize: 13,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: const [
              _StatBadge(label: 'OLQ Analysis', icon: Icons.analytics_outlined),
              _StatBadge(label: 'Instant Feedback', icon: Icons.bolt_rounded),
              _StatBadge(label: 'AI Scored', icon: Icons.auto_awesome_outlined),
            ],
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Card — premium dark glass
// ─────────────────────────────────────────────────────────────────────────────
class _TestCard extends StatefulWidget {
  final String title;
  final String shortTitle;
  final String description;
  final IconData icon;
  final Color color;
  final String duration;
  final String questions;
  final String difficulty;
  final VoidCallback onTap;

  const _TestCard({
    required this.title,
    required this.shortTitle,
    required this.description,
    required this.icon,
    required this.color,
    required this.duration,
    required this.questions,
    required this.difficulty,
    required this.onTap,
  });

  @override
  State<_TestCard> createState() => _TestCardState();
}

class _TestCardState extends State<_TestCard> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) {
        setState(() => _pressed = false);
        widget.onTap();
      },
      onTapCancel: () => setState(() => _pressed = false),
      child: AnimatedScale(
        scale: _pressed ? 0.97 : 1.0,
        duration: const Duration(milliseconds: 120),
        curve: Curves.easeOut,
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(
              color: widget.color.withValues(alpha: _pressed ? 0.45 : 0.20),
              width: 1.2,
            ),
            boxShadow: _pressed
                ? []
                : [
                    BoxShadow(
                      color: widget.color.withValues(alpha: 0.10),
                      blurRadius: 18,
                      offset: const Offset(0, 6),
                    ),
                  ],
          ),
          child: Stack(
            children: [
              Positioned(
                top: 0,
                left: 24,
                right: 60,
                child: Container(
                  height: 1,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        Colors.transparent,
                        widget.color.withValues(alpha: 0.55),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 50,
                          height: 50,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                widget.color.withValues(alpha: 0.28),
                                widget.color.withValues(alpha: 0.10),
                              ],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(15),
                            border: Border.all(
                                color: widget.color.withValues(alpha: 0.25)),
                          ),
                          child:
                              Icon(widget.icon, color: widget.color, size: 24),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 7, vertical: 2),
                                decoration: BoxDecoration(
                                  color: widget.color.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(5),
                                ),
                                child: Text(
                                  widget.shortTitle,
                                  style: TextStyle(
                                    color: widget.color,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.8,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                widget.title,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: -0.2,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Icon(Icons.arrow_forward_ios_rounded,
                            size: 14,
                            color: widget.color.withValues(alpha: 0.6)),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Text(
                      widget.description,
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 13,
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 8,
                      children: [
                        _MetaChip(
                            icon: Icons.timer_outlined,
                            label: widget.duration,
                            color: widget.color),
                        _MetaChip(
                            icon: Icons.quiz_outlined,
                            label: widget.questions,
                            color: widget.color),
                        _MetaChip(
                            icon: Icons.bar_chart_rounded,
                            label: widget.difficulty,
                            color: widget.color),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
            color: AppColors.primary.withValues(alpha: 0.18), width: 1),
      ),
      child: const Row(
        children: [
          Icon(Icons.info_outline_rounded, color: AppColors.primary, size: 20),
          SizedBox(width: 12),
          Expanded(
            child: Text(
              'Complete all four tests for a full psychological profile. AI scores each response against SSB OLQ criteria.',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 12,
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String label;
  const _SectionLabel({required this.label});
  @override
  Widget build(BuildContext context) => Text(
        label,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.4,
          color: AppColors.textHint,
        ),
      );
}

class _StatBadge extends StatelessWidget {
  final String label;
  final IconData icon;
  const _StatBadge({required this.label, required this.icon});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: AppColors.psychColor.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: AppColors.psychColor),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: AppColors.psychColor,
            ),
          ),
        ],
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  const _MetaChip(
      {required this.icon, required this.label, required this.color});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
