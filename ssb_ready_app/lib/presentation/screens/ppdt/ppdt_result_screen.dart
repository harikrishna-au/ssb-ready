import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:ssb_ready_app/core/services/history_service.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';
import 'package:ssb_ready_app/presentation/bloc/auth/auth_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/ppdt/ppdt_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/ppdt/ppdt_state.dart';

class PpdtResultScreen extends StatefulWidget {
  const PpdtResultScreen({super.key});

  @override
  State<PpdtResultScreen> createState() => _PpdtResultScreenState();
}

class _PpdtResultScreenState extends State<PpdtResultScreen> {
  static const Color _ppdtColor = AppColors.ppdtColor; // violet
  bool _historySaved = false;

  void _saveHistory(BuildContext context, PpdtState state) {
    if (_historySaved) return;
    _historySaved = true;
    final authState = context.read<AuthBloc>().state;
    if (authState is! AuthAuthenticated) return;
    final score = _extractScore(state.feedback ?? '');
    HistoryService.save(
      userId: authState.user.id,
      testType: 'PPDT',
      score: score,
      answeredCount: 1,
      totalCount: 1,
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
        title: const Text('Exit PPDT results?',
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
        title: const Text('PPDT Assessment'),
        leading: IconButton(
          icon: const Icon(Icons.close_rounded, size: 20),
          onPressed: () async {
            if (await _confirmExit(context) && context.mounted) {
              Navigator.popUntil(context, ModalRoute.withName('/dashboard'));
            }
          },
        ),
      ),
      body: BlocBuilder<PpdtBloc, PpdtState>(
        builder: (context, state) {
          if (state.phase == PpdtPhase.analyzing) {
            return _buildAnalyzing();
          }
          if (state.errorMessage != null) {
            return _buildError(context, state.errorMessage!);
          }
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
                  color: _ppdtColor.withValues(alpha: 0.12), shape: BoxShape.circle),
              child: const Icon(Icons.image_search_rounded, color: _ppdtColor, size: 36),
            ),
            const SizedBox(height: 24),
            const Text('AI is analysing your PPDT story\nfor OLQs...',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textPrimary, fontSize: 17,
                    fontWeight: FontWeight.w700, height: 1.4)),
            const SizedBox(height: 10),
            const Text('Evaluating theme, actions & Officer Like Qualities',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
            const SizedBox(height: 32),
            CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation(_ppdtColor)),
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

  Widget _buildResults(BuildContext context, PpdtState state) {
    return CustomScrollView(
      physics: const BouncingScrollPhysics(),
      slivers: [
        // Score header
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
          sliver: SliverToBoxAdapter(child: _buildScoreCard()),
        ),

        // Story submitted
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
                state.submittedStory.isEmpty
                    ? '(No story submitted)'
                    : state.submittedStory,
                style: const TextStyle(
                    color: AppColors.textSecondary, fontSize: 14, height: 1.6),
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
                border:
                    Border.all(color: _ppdtColor.withValues(alpha: 0.2)),
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
                            color: _ppdtColor.withValues(alpha: 0.12),
                            shape: BoxShape.circle),
                        child: Center(
                          child: Text('#${i + 1}',
                              style: TextStyle(
                                  color: _ppdtColor,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800)),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          (row['storyPreview'] ?? '').toString(),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              color: AppColors.textSecondary, fontSize: 13),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text('${row['score'] ?? 0}/10',
                          style: TextStyle(
                              color: _ppdtColor,
                              fontWeight: FontWeight.w800,
                              fontSize: 13)),
                    ]),
                  );
                },
                childCount: state.leaderboard.length,
              ),
            ),
          ),
        ],

        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 40),
          sliver: SliverToBoxAdapter(
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: _ppdtColor,
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 52),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
                elevation: 0,
              ),
              onPressed: () async {
                if (await _confirmExit(context) && context.mounted) {
                  Navigator.popUntil(
                      context, ModalRoute.withName('/dashboard'));
                }
              },
              child: const Text('Back to Dashboard',
                  style:
                      TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            ),
          ),
        ),
      ],
    );
  }

  SliverPadding _sectionLabel(String label) => SliverPadding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
        sliver: SliverToBoxAdapter(
          child: Text(label,
              style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.4,
                  color: AppColors.textHint)),
        ),
      );

  Widget _buildScoreCard() => Container(
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          gradient: LinearGradient(
              colors: [_ppdtColor.withValues(alpha: 0.15), _ppdtColor.withValues(alpha: 0.05)],
              begin: Alignment.topLeft, end: Alignment.bottomRight),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: _ppdtColor.withValues(alpha: 0.3)),
        ),
        child: Row(children: [
          Container(width: 56, height: 56,
              decoration: BoxDecoration(
                  color: _ppdtColor.withValues(alpha: 0.15), shape: BoxShape.circle),
              child: const Icon(Icons.check_circle_rounded, color: _ppdtColor, size: 28)),
          const SizedBox(width: 16),
          const Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('PPDT Completed',
                  style: TextStyle(color: AppColors.textPrimary, fontSize: 18, fontWeight: FontWeight.w800)),
              SizedBox(height: 4),
              Text('Story submitted & evaluated by AI',
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
            ]),
          ),
          const Icon(Icons.auto_awesome_rounded, color: _ppdtColor, size: 28),
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
