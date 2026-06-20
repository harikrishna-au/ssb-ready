import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:ssb_ready_app/core/services/history_service.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';
import 'package:ssb_ready_app/presentation/bloc/auth/auth_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/tat/tat_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/tat/tat_event.dart';
import 'package:ssb_ready_app/presentation/bloc/tat/tat_state.dart';

class TatResultScreen extends StatefulWidget {
  const TatResultScreen({super.key});

  @override
  State<TatResultScreen> createState() => _TatResultScreenState();
}

class _TatResultScreenState extends State<TatResultScreen> {
  static const Color _tatColor = AppColors.primary; // blue
  bool _historySaved = false;

  void _saveHistory(BuildContext context, TatState state) {
    if (_historySaved) return;
    _historySaved = true;
    final authState = context.read<AuthBloc>().state;
    if (authState is! AuthAuthenticated) return;
    final score = _extractScore(state.feedback ?? '');
    HistoryService.save(
      userId: authState.user.id,
      testType: 'TAT',
      score: score,
      answeredCount: state.currentImageIndex + 1,
      totalCount: state.totalImages,
      feedback: state.feedback ?? '',
    );
  }

  int _extractScore(String feedback) {
    final match = RegExp(r'\*\*Score:\*\*\s*(\d+)').firstMatch(feedback);
    return int.tryParse(match?.group(1) ?? '') ?? 0;
  }

  Future<bool> _confirmExit(BuildContext context) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surfaceHigh,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Exit TAT results?',
            style: TextStyle(color: AppColors.textPrimary)),
        content: const Text('Are you sure you want to leave?',
            style: TextStyle(color: AppColors.textSecondary)),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Stay')),
          TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Exit',
                  style: TextStyle(color: AppColors.error))),
        ],
      ),
    );
    return result == true;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('TAT Assessment'),
        leading: IconButton(
          icon: const Icon(Icons.close_rounded, size: 20),
          onPressed: () async {
            if (await _confirmExit(context) && context.mounted) {
              Navigator.popUntil(context, ModalRoute.withName('/dashboard'));
            }
          },
        ),
      ),
      body: BlocBuilder<TatBloc, TatState>(
        builder: (context, state) {
          if (state.phase == TatPhase.analyzing) return _buildAnalyzing();
          if (state.errorMessage != null) return _buildError(context, state.errorMessage!);
          _saveHistory(context, state);
          return _buildResults(context, state);
        },
      ),
    );
  }

  Widget _buildAnalyzing() => Center(
        child: Padding(
          padding: const EdgeInsets.all(40),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Container(
              width: 80, height: 80,
              decoration: BoxDecoration(
                  color: _tatColor.withValues(alpha: 0.12), shape: BoxShape.circle),
              child: const Icon(Icons.image_search_rounded, color: _tatColor, size: 36),
            ),
            const SizedBox(height: 24),
            const Text('AI is analysing your TAT story...',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textPrimary, fontSize: 17,
                    fontWeight: FontWeight.w700, height: 1.4)),
            const SizedBox(height: 10),
            const Text('Evaluating theme, narrative & OLQ indicators',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
            const SizedBox(height: 32),
            CircularProgressIndicator(valueColor: AlwaysStoppedAnimation(_tatColor)),
          ]),
        ),
      );

  Widget _buildError(BuildContext context, String msg) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 56),
            const SizedBox(height: 16),
            Text(msg, textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 14)),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () async {
                if (await _confirmExit(context) && context.mounted) {
                  Navigator.popUntil(context, ModalRoute.withName('/dashboard'));
                }
              },
              child: const Text('Return to Dashboard'),
            ),
          ]),
        ),
      );

  Widget _buildResults(BuildContext context, TatState state) {
    final cardNum = state.currentImageIndex + 1;
    final total = state.totalImages;
    final hasNext = state.currentImageIndex < state.totalImages - 1;

    return CustomScrollView(
      physics: const BouncingScrollPhysics(),
      slivers: [
        // Score card
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
          sliver: SliverToBoxAdapter(
              child: _buildScoreCard(cardNum, total)),
        ),

        // Story
        _sectionLabel('YOUR STORY'),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
          sliver: SliverToBoxAdapter(
            child: Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.border),
              ),
              child: Text(
                state.submittedStory.isEmpty ? '(No story submitted)' : state.submittedStory,
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 14, height: 1.6),
              ),
            ),
          ),
        ),

        // AI Feedback
        _sectionLabel('AI ASSESSMENT'),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
          sliver: SliverToBoxAdapter(
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: _tatColor.withValues(alpha: 0.2)),
              ),
              child: MarkdownBody(
                data: state.feedback ?? 'No feedback available.',
                styleSheet: _mdStyle(),
              ),
            ),
          ),
        ),

        // Leaderboard
        if (state.leaderboard.isNotEmpty) ...[
          _sectionLabel('TOP STORIES'),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
                (ctx, i) {
                  final row = state.leaderboard[i];
                  return Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(children: [
                      Container(
                        width: 32, height: 32,
                        decoration: BoxDecoration(
                            color: _tatColor.withValues(alpha: 0.12), shape: BoxShape.circle),
                        child: Center(child: Text('#${i + 1}',
                            style: TextStyle(color: _tatColor, fontSize: 11, fontWeight: FontWeight.w800))),
                      ),
                      const SizedBox(width: 12),
                      Expanded(child: Text(
                        (row['storyPreview'] ?? '').toString(),
                        maxLines: 2, overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                      )),
                      const SizedBox(width: 8),
                      Text('${row['score'] ?? 0}/10',
                          style: TextStyle(color: _tatColor, fontWeight: FontWeight.w800, fontSize: 13)),
                    ]),
                  );
                },
                childCount: state.leaderboard.length,
              ),
            ),
          ),
        ],

        // Action buttons
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 40),
          sliver: SliverToBoxAdapter(
            child: Column(children: [
              if (hasNext) ...[
                OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(double.infinity, 52),
                    side: BorderSide(color: _tatColor.withValues(alpha: 0.5)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    foregroundColor: _tatColor,
                  ),
                  onPressed: () {
                    context.read<TatBloc>().add(StartNextTatPicture());
                    Navigator.pushReplacementNamed(context, '/tat');
                  },
                  child: Text(
                    'Next Picture (${cardNum + 1}/$total)',
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                  ),
                ),
                const SizedBox(height: 12),
              ],
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: _tatColor,
                  foregroundColor: Colors.white,
                  minimumSize: const Size(double.infinity, 52),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 0,
                ),
                onPressed: () async {
                  if (await _confirmExit(context) && context.mounted) {
                    Navigator.popUntil(context, ModalRoute.withName('/dashboard'));
                  }
                },
                child: Text(
                  hasNext ? 'Back to Dashboard' : 'Finish TAT',
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                ),
              ),
            ]),
          ),
        ),
      ],
    );
  }

  SliverPadding _sectionLabel(String label) => SliverPadding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
        sliver: SliverToBoxAdapter(
          child: Text(label,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700,
                  letterSpacing: 1.4, color: AppColors.textHint)),
        ),
      );

  Widget _buildScoreCard(int cardNum, int total) => Container(
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          gradient: LinearGradient(
              colors: [_tatColor.withValues(alpha: 0.15), _tatColor.withValues(alpha: 0.05)],
              begin: Alignment.topLeft, end: Alignment.bottomRight),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: _tatColor.withValues(alpha: 0.3)),
        ),
        child: Row(children: [
          Container(width: 56, height: 56,
              decoration: BoxDecoration(
                  color: _tatColor.withValues(alpha: 0.15), shape: BoxShape.circle),
              child: const Icon(Icons.check_circle_rounded, color: _tatColor, size: 28)),
          const SizedBox(width: 16),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('TAT Card $cardNum Evaluated',
                style: const TextStyle(color: AppColors.textPrimary, fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text('Card $cardNum of $total · Story evaluated by AI',
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
          ])),
          Column(children: [
            Text('$cardNum',
                style: TextStyle(color: _tatColor, fontSize: 32, fontWeight: FontWeight.w900)),
            Text('of $total',
                style: TextStyle(color: _tatColor.withValues(alpha: 0.6), fontSize: 11)),
          ]),
        ]),
      );

  MarkdownStyleSheet _mdStyle() => MarkdownStyleSheet(
        p: const TextStyle(color: AppColors.textSecondary, fontSize: 13.5, height: 1.6),
        h2: const TextStyle(color: AppColors.textPrimary, fontSize: 15, fontWeight: FontWeight.w800),
        h3: const TextStyle(color: AppColors.textPrimary, fontSize: 14, fontWeight: FontWeight.w700),
        strong: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700),
        listBullet: const TextStyle(color: AppColors.textSecondary, fontSize: 13.5),
      );
}
