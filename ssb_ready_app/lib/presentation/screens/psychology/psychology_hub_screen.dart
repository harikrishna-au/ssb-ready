import 'package:flutter/material.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';

class PsychologyHubScreen extends StatelessWidget {
  const PsychologyHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Psychology Tests'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: AppColors.brandGradient,
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(22),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.psychology_alt_outlined,
                        color: Colors.white, size: 32),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Psychological Assessment',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Practice the tests used by SSB Psychologists to evaluate your personality.',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.85),
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),
            const Text(
              'Select a Test',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 16),
            _buildTestCard(
              context,
              title: 'Word Association Test (WAT)',
              description:
                  '15 words flashed at 15-second intervals. Write your first thought as a sentence.',
              icon: Icons.text_fields_rounded,
              color: AppColors.accent,
              duration: '~4 min',
              onTap: () => Navigator.pushNamed(context, '/wat'),
            ),
            const SizedBox(height: 12),
            _buildTestCard(
              context,
              title: 'Situation Reaction Test (SRT)',
              description:
                  '10 real-life situations. Write logical, decisive reactions under time pressure.',
              icon: Icons.flash_on_rounded,
              color: AppColors.secondary,
              duration: '~5 min',
              onTap: () => Navigator.pushNamed(context, '/srt'),
            ),
            const SizedBox(height: 12),
            _buildTestCard(
              context,
              title: 'Thematic Apperception Test (TAT)',
              description:
                  'View ambiguous pictures and write stories revealing your personality.',
              icon: Icons.image_search_rounded,
              color: AppColors.primary,
              duration: '~5 min',
              onTap: () => Navigator.pushNamed(context, '/tat'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTestCard(
    BuildContext context, {
    required String title,
    required String description,
    required IconData icon,
    required Color color,
    required String duration,
    required VoidCallback? onTap,
    bool isLocked = false,
  }) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color:
                  isLocked ? Colors.grey[300]! : color.withValues(alpha: 0.15),
            ),
            boxShadow: isLocked
                ? null
                : [
                    BoxShadow(
                      color: color.withValues(alpha: 0.12),
                      blurRadius: 14,
                      offset: const Offset(0, 5),
                    ),
                  ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isLocked
                      ? Colors.grey[200]
                      : color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  isLocked ? Icons.lock_outline : icon,
                  color: isLocked ? Colors.grey[400] : color,
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
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color:
                            isLocked ? Colors.grey[500] : AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      description,
                      style: TextStyle(
                          fontSize: 13,
                          color: isLocked
                              ? Colors.grey[400]
                              : AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isLocked
                      ? Colors.grey[100]
                      : color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  duration,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: isLocked ? Colors.grey[400] : color,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
