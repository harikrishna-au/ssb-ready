import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';
import 'package:ssb_ready_app/presentation/bloc/oir/oir_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/oir/oir_event.dart';
import 'package:ssb_ready_app/presentation/bloc/oir/oir_state.dart';

class OirTestScreen extends StatelessWidget {
  const OirTestScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('OIR Practice Test'),
        centerTitle: true,
        actions: [
          _buildTimer(context),
          const SizedBox(width: 16),
        ],
      ),
      body: BlocConsumer<OirBloc, OirState>(
        listener: (context, state) {
          if (state.status == OirStatus.finished) {
            _showResultsDialog(context, state.score, state.questions.length);
          }
        },
        builder: (context, state) {
          if (state.status == OirStatus.loading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state.status == OirStatus.initial) {
            return _buildStartScreen(context);
          }

          if (state.status == OirStatus.inProgress) {
            return _buildQuizContent(context, state);
          }

          if (state.status == OirStatus.error) {
            return Center(child: Text('Error: ${state.errorMessage}'));
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }

  Widget _buildTimer(BuildContext context) {
    return BlocBuilder<OirBloc, OirState>(
      builder: (context, state) {
        final minutes = (state.timeRemaining / 60).floor();
        final seconds = (state.timeRemaining % 60);
        return Chip(
          avatar: const Icon(Icons.timer_outlined, size: 18),
          label: Text(
            '$minutes:${seconds.toString().padLeft(2, '0')}',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
          backgroundColor: state.timeRemaining < 60 ? Colors.red[50] : Colors.blue[50],
        );
      },
    );
  }

  Widget _buildStartScreen(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.psychology, size: 100, color: AppColors.primaryGreen),
          const SizedBox(height: 24),
          const Text(
            'Ready for OIR Practice?',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 40),
            child: Text(
              'This test contains verbal and non-verbal reasoning questions. You have 10 minutes.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),
          ),
          const SizedBox(height: 40),
          ElevatedButton(
            onPressed: () => context.read<OirBloc>().add(StartOirTest()),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryGreen,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 16),
            ),
            child: const Text('START TEST', style: TextStyle(fontSize: 18)),
          ),
        ],
      ),
    );
  }

  Widget _buildQuizContent(BuildContext context, OirState state) {
    final question = state.questions[state.currentQuestionIndex];

    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LinearProgressIndicator(
            value: (state.currentQuestionIndex + 1) / state.questions.length,
            backgroundColor: Colors.grey[200],
            valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primaryGreen),
          ),
          const SizedBox(height: 32),
          Text(
            'Question ${state.currentQuestionIndex + 1} of ${state.questions.length}',
            style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryGreen),
          ),
          const SizedBox(height: 16),
          Text(
            question.text,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w500, height: 1.4),
          ),
          const SizedBox(height: 32),
          ...question.options.asMap().entries.map((entry) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 16.0),
              child: InkWell(
                onTap: () => context.read<OirBloc>().add(SubmitAnswer(entry.key)),
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey[300]!),
                    borderRadius: BorderRadius.circular(15),
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 14,
                        backgroundColor: AppColors.primaryGreen.withValues(alpha: 0.1),
                        child: Text(
                          String.fromCharCode(65 + entry.key),
                          style: const TextStyle(fontSize: 12, color: AppColors.primaryGreen),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Text(entry.value, style: const TextStyle(fontSize: 16)),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),
          const Spacer(),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              TextButton(
                onPressed: () => context.read<OirBloc>().add(SkipQuestion()),
                child: const Text('SKIP', style: TextStyle(color: Colors.grey)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showResultsDialog(BuildContext context, int score, int total) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Test Completed!'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.stars, color: Colors.orange, size: 60),
            const SizedBox(height: 16),
            Text(
              'Your Score: $score / $total',
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              _getRatingMessage(score, total),
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[600]),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              Navigator.of(context).pop();
            },
            child: const Text('BACK TO DASHBOARD'),
          ),
        ],
      ),
    );
  }

  String _getRatingMessage(int score, int total) {
    final percentage = (score / total) * 100;
    if (percentage >= 80) return 'Outstanding! You are on track for OIR-1.';
    if (percentage >= 60) return 'Good job! Aim for OIR-1 with more practice.';
    return 'Keep practicing! You can do better.';
  }
}
