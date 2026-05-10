import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';
import 'package:ssb_ready_app/presentation/bloc/ppdt/ppdt_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/ppdt/ppdt_state.dart';

class PpdtResultScreen extends StatelessWidget {
  const PpdtResultScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('AI Analysis Result'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () {
            Navigator.popUntil(context, ModalRoute.withName('/dashboard'));
          },
        ),
      ),
      body: BlocBuilder<PpdtBloc, PpdtState>(
        builder: (context, state) {
          if (state.phase == PpdtPhase.analyzing) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 24),
                  Text(
                    'AI is analyzing your story for OLQs...',
                    style:
                        TextStyle(fontSize: 16, color: AppColors.textSecondary),
                  ),
                ],
              ),
            );
          }

          if (state.errorMessage != null) {
            return Center(child: Text(state.errorMessage!));
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Your Story',
                  style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary),
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
                        ? '(No story submitted)'
                        : state.submittedStory,
                    style: const TextStyle(fontSize: 15, height: 1.5),
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'AI Feedback',
                  style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary),
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
                    data: state.feedback ?? 'No feedback available.',
                    styleSheet: MarkdownStyleSheet(
                      p: const TextStyle(fontSize: 15, height: 1.5),
                      strong: const TextStyle(
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary),
                    ),
                  ),
                ),
                if (state.leaderboard.isNotEmpty) ...[
                  const SizedBox(height: 24),
                  const Text(
                    'Top 10 Stories',
                    style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary),
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
                  )
                ],
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: () {
                    Navigator.popUntil(
                        context, ModalRoute.withName('/dashboard'));
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.secondary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: const Text('BACK TO DASHBOARD',
                      style: TextStyle(fontSize: 16)),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
