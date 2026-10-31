import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:ssb_ready_app/core/services/history_service.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';
import 'package:ssb_ready_app/presentation/bloc/auth/auth_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/sdt/sdt_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/sdt/sdt_state.dart';

class SdtResultScreen extends StatefulWidget {
  const SdtResultScreen({super.key});

  @override
  State<SdtResultScreen> createState() => _SdtResultScreenState();
}

class _SdtResultScreenState extends State<SdtResultScreen> {
  static const Color _sdtColor = Color(0xFF10B981);
  bool _historySaved = false;

  void _saveHistory(BuildContext context, SdtState state) {
    if (_historySaved) return;
    _historySaved = true;
    final authState = context.read<AuthBloc>().state;
    if (authState is! AuthAuthenticated) return;
    final answered = state.responses.values
        .where((v) => v.trim().isNotEmpty)
        .length;
    HistoryService.save(
      userId: authState.user.id,
      testType: 'SDT',
      score: 0, // narrative test — no numeric score
      answeredCount: answered,
      totalCount: state.responses.length,
      feedback: state.aiAnalysis ?? '',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('SDT Assessment'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () =>
              Navigator.of(context).popUntil((r) => r.isFirst),
        ),
      ),
      body: BlocBuilder<SdtBloc, SdtState>(
        builder: (context, state) {
          if (state.status == SdtStatus.analyzing) {
            return _buildAnalyzing();
          }
          if (state.status == SdtStatus.error) {
            return _buildError(context, state);
          }
          if (state.status == SdtStatus.completed) {
            _saveHistory(context, state);
            return _buildResults(context, state);
          }
          return const SizedBox.shrink();
        },
      ),
    );
  }

  Widget _buildAnalyzing() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: _sdtColor.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.psychology_alt_outlined,
                  color: _sdtColor, size: 36),
            ),
            const SizedBox(height: 24),
            const Text(
              'Psychologist AI is analysing\nyour self descriptions...',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppColors.textPrimary,
                fontSize: 17,
                fontWeight: FontWeight.w700,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'Evaluating OLQ indicators across all 5 perspectives',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
            ),
            const SizedBox(height: 32),
            CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation(_sdtColor),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildError(BuildContext context, SdtState state) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline_rounded,
                color: AppColors.error, size: 56),
            const SizedBox(height: 16),
            Text(
              state.errorMessage ?? 'Something went wrong.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                  color: AppColors.textSecondary, fontSize: 14),
            ),
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
  }

  Widget _buildResults(BuildContext context, SdtState state) {
    final filled = state.responses.values
        .where((v) => v.trim().isNotEmpty)
        .length;

    return CustomScrollView(
      physics: const BouncingScrollPhysics(),
      slivers: [
        // Score header
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
          sliver: SliverToBoxAdapter(
            child: _buildScoreCard(filled),
          ),
        ),

        // Responses review
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 4),
          sliver: const SliverToBoxAdapter(
            child: Text(
              'YOUR RESPONSES',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.4,
                color: AppColors.textHint,
              ),
            ),
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
          sliver: SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, i) {
                final p = kSdtPerspectives[i];
                final text = state.responses[p['key']] ?? '';
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _ResponseCard(
                    perspective: p,
                    response: text,
                    sdtColor: _sdtColor,
                  ),
                );
              },
              childCount: kSdtPerspectives.length,
            ),
          ),
        ),

        // AI Analysis
        if (state.aiAnalysis != null) ...[
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 4),
            sliver: const SliverToBoxAdapter(
              child: Text(
                'AI ASSESSMENT',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.4,
                  color: AppColors.textHint,
                ),
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
            sliver: SliverToBoxAdapter(
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                      color: _sdtColor.withValues(alpha: 0.2)),
                ),
                child: MarkdownBody(
                  data: state.aiAnalysis!,
                  styleSheet: MarkdownStyleSheet(
                    p: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 13.5,
                        height: 1.6),
                    h2: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 15,
                        fontWeight: FontWeight.w800),
                    h3: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 14,
                        fontWeight: FontWeight.w700),
                    strong: const TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w700),
                    listBullet: const TextStyle(
                        color: AppColors.textSecondary, fontSize: 13.5),
                  ),
                ),
              ),
            ),
          ),
        ],

        // CTA
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 40),
          sliver: SliverToBoxAdapter(
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: _sdtColor,
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 52),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
                elevation: 0,
              ),
              onPressed: () =>
                  Navigator.of(context).popUntil((r) => r.isFirst),
              child: const Text(
                'Back to Dashboard',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildScoreCard(int filled) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            _sdtColor.withValues(alpha: 0.15),
            _sdtColor.withValues(alpha: 0.05),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: _sdtColor.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: _sdtColor.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.check_circle_rounded,
                color: _sdtColor, size: 28),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'SDT Completed',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '$filled / 5 perspectives written',
                  style:
                      const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                ),
              ],
            ),
          ),
          Column(
            children: [
              Text(
                '$filled',
                style: TextStyle(
                  color: _sdtColor,
                  fontSize: 32,
                  fontWeight: FontWeight.w900,
                ),
              ),
              Text(
                'of 5',
                style: TextStyle(
                    color: _sdtColor.withValues(alpha: 0.6), fontSize: 11),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ResponseCard extends StatefulWidget {
  final Map<String, String> perspective;
  final String response;
  final Color sdtColor;
  const _ResponseCard(
      {required this.perspective,
      required this.response,
      required this.sdtColor});

  @override
  State<_ResponseCard> createState() => _ResponseCardState();
}

class _ResponseCardState extends State<_ResponseCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final isEmpty = widget.response.trim().isEmpty;
    return GestureDetector(
      onTap: () => setState(() => _expanded = !_expanded),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isEmpty
                ? AppColors.border
                : widget.sdtColor.withValues(alpha: 0.22),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(widget.perspective['icon']!,
                    style: const TextStyle(fontSize: 18)),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    widget.perspective['title']!,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                Icon(
                  _expanded
                      ? Icons.keyboard_arrow_up_rounded
                      : Icons.keyboard_arrow_down_rounded,
                  color: AppColors.textHint,
                  size: 20,
                ),
              ],
            ),
            if (_expanded) ...[
              const SizedBox(height: 10),
              const Divider(color: AppColors.border, height: 1),
              const SizedBox(height: 10),
              Text(
                isEmpty ? 'No response written.' : widget.response,
                style: TextStyle(
                  color: isEmpty
                      ? AppColors.textHint
                      : AppColors.textSecondary,
                  fontSize: 13.5,
                  height: 1.6,
                  fontStyle: isEmpty ? FontStyle.italic : FontStyle.normal,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
