import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';

const String kOnboardingDoneKey = 'onboarding_done';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  // Page 2 state
  String? _selectedExam;
  // Page 3 state
  String? _selectedGoal;

  static const List<String> _exams = [
    'NDA (National Defence Academy)',
    'CDS (Combined Defence Services)',
    'AFCAT (Air Force)',
    'TA (Territorial Army)',
    'CAPF (Paramilitary)',
  ];

  static const List<String> _goals = [
    'Crack SSB in the next attempt',
    'Improve my psychology scores',
    'Practise GTO & Interview',
    'Stay updated with current affairs',
    'Just exploring SSB Ready',
  ];

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _finish() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(kOnboardingDoneKey, true);
    if (mounted) {
      Navigator.of(context).pushReplacementNamed('/dashboard');
    }
  }

  void _nextPage() {
    if (_currentPage < 2) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeOutCubic,
      );
    } else {
      _finish();
    }
  }

  bool get _canProceed {
    if (_currentPage == 1) return _selectedExam != null;
    if (_currentPage == 2) return _selectedGoal != null;
    return true;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // Progress bar
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 0),
              child: Row(
                children: List.generate(3, (i) {
                  final active = i <= _currentPage;
                  return Expanded(
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      height: 4,
                      margin: EdgeInsets.only(right: i < 2 ? 6 : 0),
                      decoration: BoxDecoration(
                        color: active ? AppColors.primary : AppColors.border,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  );
                }),
              ),
            ),

            // Skip button (only on first 2 pages)
            Align(
              alignment: Alignment.centerRight,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(0, 8, 20, 0),
                child: _currentPage < 2
                    ? TextButton(
                        onPressed: _finish,
                        child: const Text('Skip',
                            style: TextStyle(
                                color: AppColors.textHint, fontSize: 13)),
                      )
                    : const SizedBox(height: 36),
              ),
            ),

            // Pages
            Expanded(
              child: PageView(
                controller: _pageController,
                physics: const NeverScrollableScrollPhysics(),
                onPageChanged: (i) => setState(() => _currentPage = i),
                children: [
                  _WelcomePage(),
                  _ExamPage(
                    selected: _selectedExam,
                    exams: _exams,
                    onSelected: (e) => setState(() => _selectedExam = e),
                  ),
                  _GoalPage(
                    selected: _selectedGoal,
                    goals: _goals,
                    onSelected: (g) => setState(() => _selectedGoal = g),
                  ),
                ],
              ),
            ),

            // CTA button
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 12, 24, 28),
              child: AnimatedOpacity(
                opacity: _canProceed ? 1.0 : 0.45,
                duration: const Duration(milliseconds: 200),
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 54),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16)),
                    elevation: 0,
                  ),
                  onPressed: _canProceed ? _nextPage : null,
                  child: Text(
                    _currentPage == 2 ? "Let's Start →" : 'Continue',
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 16),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Page 1: Welcome
// ──────────────────────────────────────────────────────────────────────────────
class _WelcomePage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 28),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Hero icon
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppColors.primary.withValues(alpha: 0.15),
                  AppColors.secondary.withValues(alpha: 0.1),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.military_tech_rounded,
                color: AppColors.primary, size: 52),
          ),
          const SizedBox(height: 32),

          const Text(
            'Welcome to SSB Ready',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 28,
              fontWeight: FontWeight.w900,
              height: 1.2,
            ),
          ),
          const SizedBox(height: 14),
          const Text(
            'Your AI-powered SSB preparation partner.\nPractise psychology tests, mock interviews, '
            'GTO tasks, and daily current affairs — all in one app.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppColors.textSecondary,
              fontSize: 15,
              height: 1.6,
            ),
          ),
          const SizedBox(height: 40),

          // Feature pills
          Wrap(
            spacing: 10,
            runSpacing: 10,
            alignment: WrapAlignment.center,
            children: const [
              _FeaturePill(Icons.psychology_rounded, 'Psychology Tests'),
              _FeaturePill(Icons.record_voice_over_rounded, 'Mock Interview'),
              _FeaturePill(Icons.bolt_rounded, 'AI Evaluation'),
              _FeaturePill(Icons.newspaper_rounded, 'Current Affairs'),
            ],
          ),
          const SizedBox(height: 36),

          // Non-affiliation disclaimer (required by Play Impersonation policy)
          const Text(
            'SSB Ready is an independent preparation app for defence '
            'aspirants. It is not affiliated with, endorsed by, or connected '
            'to the Services Selection Board, Indian Armed Forces, or '
            'Government of India.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppColors.textHint,
              fontSize: 11,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _FeaturePill extends StatelessWidget {
  final IconData icon;
  final String label;
  const _FeaturePill(this.icon, this.label);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(50),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, color: AppColors.primary, size: 16),
        const SizedBox(width: 7),
        Text(label,
            style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 12.5,
                fontWeight: FontWeight.w600)),
      ]),
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Page 2: Target Exam
// ──────────────────────────────────────────────────────────────────────────────
class _ExamPage extends StatelessWidget {
  final String? selected;
  final List<String> exams;
  final ValueChanged<String> onSelected;

  const _ExamPage({
    required this.selected,
    required this.exams,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 16),
          const Text('Which exam are\nyou preparing for?',
              style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 26,
                  fontWeight: FontWeight.w900,
                  height: 1.25)),
          const SizedBox(height: 8),
          const Text('We\'ll personalise your experience.',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 14)),
          const SizedBox(height: 28),
          Expanded(
            child: ListView.separated(
              padding: EdgeInsets.zero,
              itemCount: exams.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) {
                final exam = exams[i];
                final isSelected = selected == exam;
                return _SelectionTile(
                  label: exam,
                  isSelected: isSelected,
                  onTap: () => onSelected(exam),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Page 3: Goal
// ──────────────────────────────────────────────────────────────────────────────
class _GoalPage extends StatelessWidget {
  final String? selected;
  final List<String> goals;
  final ValueChanged<String> onSelected;

  const _GoalPage({
    required this.selected,
    required this.goals,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 16),
          const Text('What\'s your\nprimary goal?',
              style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 26,
                  fontWeight: FontWeight.w900,
                  height: 1.25)),
          const SizedBox(height: 8),
          const Text('This helps us show you the right features first.',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 14)),
          const SizedBox(height: 28),
          Expanded(
            child: ListView.separated(
              padding: EdgeInsets.zero,
              itemCount: goals.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) {
                final goal = goals[i];
                final isSelected = selected == goal;
                return _SelectionTile(
                  label: goal,
                  isSelected: isSelected,
                  onTap: () => onSelected(goal),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Shared selection tile
// ──────────────────────────────────────────────────────────────────────────────
class _SelectionTile extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _SelectionTile({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary.withValues(alpha: 0.1)
              : AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.border,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(children: [
          Expanded(
            child: Text(label,
                style: TextStyle(
                    color: isSelected
                        ? AppColors.primary
                        : AppColors.textPrimary,
                    fontSize: 14.5,
                    fontWeight: isSelected
                        ? FontWeight.w700
                        : FontWeight.w500)),
          ),
          AnimatedOpacity(
            opacity: isSelected ? 1 : 0,
            duration: const Duration(milliseconds: 200),
            child: const Icon(Icons.check_circle_rounded,
                color: AppColors.primary, size: 20),
          ),
        ]),
      ),
    );
  }
}
