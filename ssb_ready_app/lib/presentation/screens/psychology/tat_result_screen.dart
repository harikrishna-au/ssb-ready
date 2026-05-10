import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';
import 'package:ssb_ready_app/presentation/bloc/tat/tat_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/tat/tat_event.dart';
import 'package:ssb_ready_app/presentation/bloc/tat/tat_state.dart';

class TatResultScreen extends StatelessWidget {
  const TatResultScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('TAT Assessment'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () {
            Navigator.popUntil(context, ModalRoute.withName('/dashboard'));
          },
        ),
      ),
      body: BlocBuilder<TatBloc, TatState>(
        builder: (context, state) {
          if (state.phase == TatPhase.analyzing) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 24),
                  Text(
                    'AI is analyzing your TAT story…',
                    style: TextStyle(fontSize: 16, color: AppColors.textSecondary),
                  ),
                ],
              ),
            );
          }

          if (state.errorMessage != null) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, color: Colors.red, size: 48),
                    const SizedBox(height: 16),
                    Text(state.errorMessage!, textAlign: TextAlign.center),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () =>
                          Navigator.popUntil(context, ModalRoute.withName('/dashboard')),
                      child: const Text('Back'),
                    ),
                  ],
                ),
              ),
            );
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Card ${state.currentImageIndex + 1} of ${state.totalImages}',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Your story',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Text(
                    state.submittedStory.isEmpty
                        ? '(No story)'
                        : state.submittedStory,
                    style: const TextStyle(fontSize: 15, height: 1.5),
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'AI feedback',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceSoft,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: MarkdownBody(
                    data: state.feedback ?? 'No feedback.',
                    styleSheet: MarkdownStyleSheet(
                      p: const TextStyle(fontSize: 15, height: 1.5),
                      strong: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ),
                if (state.leaderboard.isNotEmpty) ...[
                  const SizedBox(height: 24),
                  const Text(
                    'Top TAT stories (practice board)',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...state.leaderboard.asMap().entries.map(
                    (entry) {
                      final row = entry.value;
                      return Card(
                        child: ListTile(
                          title: Text('Rank #${entry.key + 1}'),
                          subtitle: Text(
                            (row['storyPreview'] ?? '').toString(),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          trailing: Text(
                            'Score ${(row['score'] ?? 0).toString()}',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                      );
                    },
                  ),
                ],
                const SizedBox(height: 24),
                if (state.currentImageIndex < state.totalImages - 1)
                  OutlinedButton(
                    onPressed: () {
                      context.read<TatBloc>().add(StartNextTatPicture());
                      Navigator.pushReplacementNamed(context, '/tat');
                    },
                    child: Text(
                      'Next picture (${state.currentImageIndex + 2}/${state.totalImages})',
                    ),
                  ),
                if (state.currentImageIndex < state.totalImages - 1)
                  const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: () {
                    Navigator.popUntil(context, ModalRoute.withName('/dashboard'));
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.secondary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: const Text('BACK TO DASHBOARD'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
