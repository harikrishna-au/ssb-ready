import 'package:flutter/material.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';

class InterviewHubScreen extends StatelessWidget {
  const InterviewHubScreen({super.key});

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
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 4),
            sliver: const SliverToBoxAdapter(
              child: _SectionLabel(label: 'PREPARATION MODULES'),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                _ModuleCard(
                  step: '01',
                  title: 'Digital PIQ Form',
                  description:
                      'Fill your Personal Information Questionnaire — the foundation every interviewer reads before entering the room.',
                  icon: Icons.assignment_outlined,
                  color: const Color(0xFF4B7BF5),
                  tag: 'FILL FIRST',
                  tagColor: AppColors.primary,
                  onTap: () => Navigator.pushNamed(context, '/piq-form'),
                ),
                const SizedBox(height: 14),
                _ModuleCard(
                  step: '02',
                  title: 'AI Mock Interview',
                  description:
                      'A realistic IO simulation powered by your PIQ. Get real-time voice or text responses and instant feedback.',
                  icon: Icons.record_voice_over_outlined,
                  color: AppColors.secondary,
                  tag: 'AI POWERED',
                  tagColor: AppColors.secondary,
                  onTap: () =>
                      Navigator.pushNamed(context, '/mock-interview'),
                ),
                const SizedBox(height: 14),
                _ModuleCard(
                  step: '03',
                  title: 'Common Questions Bank',
                  description:
                      'Browse 50+ curated CIQ questions across academics, family, sports, defence knowledge and self-assessment.',
                  icon: Icons.question_answer_outlined,
                  color: AppColors.interviewColor,
                  tag: 'STUDY',
                  tagColor: AppColors.interviewColor,
                  onTap: () =>
                      Navigator.pushNamed(context, '/question-bank'),
                ),
                const SizedBox(height: 24),
                _TipCard(),
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
        'Interview Preparation',
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
          colors: [Color(0xFF160D2A), Color(0xFF0E0A1E)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
            color: AppColors.secondary.withValues(alpha: 0.25), width: 1),
        boxShadow: [
          BoxShadow(
            color: AppColors.secondary.withValues(alpha: 0.08),
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
                  color: AppColors.secondary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                      color: AppColors.secondary.withValues(alpha: 0.3)),
                ),
                child: const Icon(Icons.forum_outlined,
                    color: AppColors.secondary, size: 28),
              ),
              const SizedBox(width: 14),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Interview Mastery',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.3,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Personal Interview · IO Round',
                      style: TextStyle(
                          color: AppColors.secondary, fontSize: 13),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          const Text(
            'The Interviewing Officer looks for clarity, honesty, and quiet confidence. Prepare methodically — start with your PIQ.',
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
            children: [
              _Badge(
                  label: 'PIQ-Based',
                  icon: Icons.assignment_ind_outlined,
                  color: AppColors.primary),
              _Badge(
                  label: 'Voice + Text',
                  icon: Icons.mic_outlined,
                  color: AppColors.secondary),
              _Badge(
                  label: '50+ Questions',
                  icon: Icons.quiz_outlined,
                  color: AppColors.interviewColor),
            ],
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Module Card
// ─────────────────────────────────────────────────────────────────────────────
class _ModuleCard extends StatefulWidget {
  final String step;
  final String title;
  final String description;
  final IconData icon;
  final Color color;
  final String tag;
  final Color tagColor;
  final VoidCallback onTap;

  const _ModuleCard({
    required this.step,
    required this.title,
    required this.description,
    required this.icon,
    required this.color,
    required this.tag,
    required this.tagColor,
    required this.onTap,
  });

  @override
  State<_ModuleCard> createState() => _ModuleCardState();
}

class _ModuleCardState extends State<_ModuleCard> {
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
              color:
                  widget.color.withValues(alpha: _pressed ? 0.45 : 0.20),
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
              // top shimmer
              Positioned(
                top: 0,
                left: 24,
                right: 60,
                child: Container(
                  height: 1,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: [
                      Colors.transparent,
                      widget.color.withValues(alpha: 0.55),
                      Colors.transparent,
                    ]),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Step number + icon column
                    Column(
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
                          child: Icon(widget.icon,
                              color: widget.color, size: 24),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          widget.step,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: widget.color.withValues(alpha: 0.5),
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  widget.title,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: -0.2,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: widget.tagColor
                                      .withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  widget.tag,
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.6,
                                    color: widget.tagColor,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            widget.description,
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 13,
                              height: 1.5,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              Text(
                                'Open',
                                style: TextStyle(
                                  color: widget.color,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(width: 4),
                              Icon(Icons.arrow_forward_rounded,
                                  size: 14, color: widget.color),
                            ],
                          ),
                        ],
                      ),
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

class _TipCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.interviewColor.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
            color: AppColors.interviewColor.withValues(alpha: 0.20)),
      ),
      child: const Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.lightbulb_outline_rounded,
              color: AppColors.interviewColor, size: 20),
          SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Pro Tip',
                  style: TextStyle(
                    color: AppColors.interviewColor,
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'Always fill the PIQ form first. The AI mock interview uses your PIQ to generate personalised questions, just like the actual IO.',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12,
                    height: 1.5,
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

class _Badge extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  const _Badge(
      {required this.label, required this.icon, required this.color});
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
          Text(label,
              style: TextStyle(
                  fontSize: 11, fontWeight: FontWeight.w600, color: color)),
        ],
      ),
    );
  }
}
