import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:ssb_ready_app/core/services/history_service.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';
import 'package:ssb_ready_app/presentation/bloc/auth/auth_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/wat/wat_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/wat/wat_state.dart';

class WatResultScreen extends StatefulWidget {
  const WatResultScreen({super.key});

  @override
  State<WatResultScreen> createState() => _WatResultScreenState();
}

class _WatResultScreenState extends State<WatResultScreen> {
  static const Color _watColor = AppColors.accent;
  bool _historySaved = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('WAT Assessment'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () => Navigator.of(context).popUntil((r) => r.isFirst),
        ),
      ),
      body: BlocBuilder<WatBloc, WatState>(
        builder: (context, state) {
          if (state.status == WatStatus.analyzing) {
            return _buildAnalyzing();
          }
          if (state.status == WatStatus.error) {
            return _buildError(context, state.errorMessage);
          }
          if (state.status == WatStatus.completed) {
            _saveHistory(context, state);
            return _buildResults(context, state);
          }
          return const SizedBox.shrink();
        },
      ),
    );
  }

  void _saveHistory(BuildContext context, WatState state) {
    if (_historySaved) return;
    _historySaved = true;
    final authState = context.read<AuthBloc>().state;
    if (authState is! AuthAuthenticated) return;
    final score = _extractScore(state.feedback ?? '');
    HistoryService.save(
      userId: authState.user.id,
      testType: 'WAT',
      score: score,
      answeredCount:
          state.responses.values.where((v) => v.trim().isNotEmpty).length,
      totalCount: state.responses.length,
      feedback: state.feedback ?? '',
    );
  }

  int _extractScore(String feedback) {
    final match = RegExp(r'\*\*Score:\*\*\s*(\d+)').firstMatch(feedback);
    return int.tryParse(match?.group(1) ?? '') ?? 0;
  }

  Widget _buildAnalyzing() => Center(
        child: Padding(
          padding: const EdgeInsets.all(40),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                    color: _watColor.withValues(alpha: 0.12),
                    shape: BoxShape.circle),
                child: const Icon(Icons.text_fields_rounded,
                    color: _watColor, size: 36),
              ),
              const SizedBox(height: 24),
              const Text(
                'Psychologist AI is analysing\nyour WAT responses...',
                textAlign: TextAlign.center,
                style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    height: 1.4),
              ),
              const SizedBox(height: 10),
              const Text(
                'Evaluating OLQ indicators across all sentences',
                textAlign: TextAlign.center,
                style:
                    TextStyle(color: AppColors.textSecondary, fontSize: 13),
              ),
              const SizedBox(height: 32),
              CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation(_watColor)),
            ],
          ),
        ),
      );

  Widget _buildError(BuildContext context, String? msg) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline_rounded,
                  color: AppColors.error, size: 56),
              const SizedBox(height: 16),
              Text(msg ?? 'Something went wrong.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      color: AppColors.textSecondary, fontSize: 14)),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () =>
                    Navigator.of(context).popUntil((r) => r.isFirst),
                child: const Text('Return to Dashboard'),
              ),
            ],
          ),
        ),
      );

  Widget _buildResults(BuildContext context, WatState state) {
    final answered =
        state.responses.values.where((v) => v.trim().isNotEmpty).length;
    final total = state.responses.length;

    return CustomScrollView(
      physics: const BouncingScrollPhysics(),
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
          sliver: SliverToBoxAdapter(
              child: _buildScoreCard(answered, total)),
        ),
        _sectionLabel('YOUR RESPONSES'),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
          sliver: SliverToBoxAdapter(
              child: _buildResponsesCard(state.responses)),
        ),
        if (state.feedback != null) ...[
          _sectionLabel('AI ASSESSMENT'),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
            sliver: SliverToBoxAdapter(
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                      color: _watColor.withValues(alpha: 0.2)),
                ),
                child: MarkdownBody(
                    data: state.feedback!, styleSheet: _mdStyle()),
              ),
            ),
          ),
        ],
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 40),
          sliver: SliverToBoxAdapter(
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: _watColor,
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 52),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
                elevation: 0,
              ),
              onPressed: () =>
                  Navigator.of(context).popUntil((r) => r.isFirst),
              child: const Text('Back to Dashboard',
                  style: TextStyle(
                      fontWeight: FontWeight.w700, fontSize: 15)),
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

  Widget _buildScoreCard(int answered, int total) => Container(
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: [
            _watColor.withValues(alpha: 0.15),
            _watColor.withValues(alpha: 0.05),
          ], begin: Alignment.topLeft, end: Alignment.bottomRight),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: _watColor.withValues(alpha: 0.3)),
        ),
        child: Row(children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
                color: _watColor.withValues(alpha: 0.15),
                shape: BoxShape.circle),
            child: const Icon(Icons.check_circle_rounded,
                color: _watColor, size: 28),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('WAT Completed',
                  style: TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 18,
                      fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              Text('$answered of $total sentences written',
                  style: const TextStyle(
                      color: AppColors.textSecondary, fontSize: 13)),
            ]),
          ),
          Column(children: [
            Text('$answered',
                style: TextStyle(
                    color: _watColor,
                    fontSize: 32,
                    fontWeight: FontWeight.w900)),
            Text('of $total',
                style: TextStyle(
                    color: _watColor.withValues(alpha: 0.6), fontSize: 11)),
          ]),
        ]),
      );

  Widget _buildResponsesCard(Map<String, String> responses) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: responses.entries.toList().asMap().entries.map((e) {
            final i = e.key;
            final word = e.value.key;
            final sentence = e.value.value;
            final skipped = sentence.trim().isEmpty;
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (i > 0)
                  const Divider(color: AppColors.border, height: 20),
                Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: _watColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(5),
                    ),
                    child: Text(word.toUpperCase(),
                        style: TextStyle(
                            color: _watColor,
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.5)),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      skipped ? 'Skipped' : sentence,
                      style: TextStyle(
                        color: skipped
                            ? AppColors.textHint
                            : AppColors.textSecondary,
                        fontSize: 13.5,
                        height: 1.5,
                        fontStyle: skipped
                            ? FontStyle.italic
                            : FontStyle.normal,
                      ),
                    ),
                  ),
                ]),
              ],
            );
          }).toList(),
        ),
      );

  MarkdownStyleSheet _mdStyle() => MarkdownStyleSheet(
        p: const TextStyle(
            color: AppColors.textSecondary, fontSize: 13.5, height: 1.6),
        h2: const TextStyle(
            color: AppColors.textPrimary,
            fontSize: 15,
            fontWeight: FontWeight.w800),
        h3: const TextStyle(
            color: AppColors.textPrimary,
            fontSize: 14,
            fontWeight: FontWeight.w700),
        strong: const TextStyle(
            color: AppColors.textPrimary, fontWeight: FontWeight.w700),
        listBullet: const TextStyle(
            color: AppColors.textSecondary, fontSize: 13.5),
      );
}
