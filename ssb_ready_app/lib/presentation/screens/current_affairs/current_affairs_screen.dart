import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';
import 'package:ssb_ready_app/presentation/bloc/current_affairs/current_affairs_bloc.dart';

class CurrentAffairsScreen extends StatelessWidget {
  const CurrentAffairsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => CurrentAffairsBloc()..add(LoadDailyQuiz()),
      child: const _CurrentAffairsView(),
    );
  }
}

class _CurrentAffairsView extends StatelessWidget {
  const _CurrentAffairsView();

  static const Color _caColor = Color(0xFFF59E0B);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Daily Quiz'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: BlocBuilder<CurrentAffairsBloc, CurrentAffairsState>(
              builder: (_, state) => state.dateLabel.isEmpty
                  ? const SizedBox.shrink()
                  : Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: _caColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                            color: _caColor.withValues(alpha: 0.3)),
                      ),
                      child: Text(state.dateLabel,
                          style: const TextStyle(
                              color: _caColor,
                              fontSize: 11,
                              fontWeight: FontWeight.w700)),
                    ),
            ),
          ),
        ],
      ),
      body: BlocBuilder<CurrentAffairsBloc, CurrentAffairsState>(
        builder: (context, state) {
          switch (state.status) {
            case CaQuizStatus.loading:
              return const Center(
                  child: CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation(_caColor)));

            case CaQuizStatus.alreadyDone:
              return _buildAlreadyDone(context, state);

            case CaQuizStatus.completed:
              return _buildCompleted(context, state);

            case CaQuizStatus.inProgress:
            case CaQuizStatus.answered:
              return _buildQuestion(context, state);
          }
        },
      ),
    );
  }

  // ── Already done today ──────────────────────────────────────────────────────
  Widget _buildAlreadyDone(BuildContext context, CurrentAffairsState state) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Container(
            width: 88, height: 88,
            decoration: BoxDecoration(
                color: _caColor.withValues(alpha: 0.12),
                shape: BoxShape.circle),
            child: const Icon(Icons.check_circle_outline_rounded,
                color: _caColor, size: 44),
          ),
          const SizedBox(height: 24),
          const Text("You're all caught up!",
              style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 22,
                  fontWeight: FontWeight.w800)),
          const SizedBox(height: 10),
          Text("You've already completed today's quiz (${state.dateLabel}).\nCome back tomorrow for a fresh set!",
              textAlign: TextAlign.center,
              style: const TextStyle(
                  color: AppColors.textSecondary, fontSize: 14, height: 1.5)),
          const SizedBox(height: 32),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: _caColor,
              foregroundColor: Colors.black,
              minimumSize: const Size(200, 48),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
              elevation: 0,
            ),
            onPressed: () => Navigator.pop(context),
            child: const Text('Back to Dashboard',
                style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ]),
      ),
    );
  }

  // ── Completed ───────────────────────────────────────────────────────────────
  Widget _buildCompleted(BuildContext context, CurrentAffairsState state) {
    final score = state.score;
    final total = state.questions.length;
    final pct = total > 0 ? (score / total * 100).round() : 0;

    String message;
    Color msgColor;
    if (pct == 100) {
      message = 'Perfect score! Outstanding preparation! 🎖️';
      msgColor = const Color(0xFF10B981);
    } else if (pct >= 80) {
      message = 'Excellent! You\'re well-informed. 💪';
      msgColor = const Color(0xFF10B981);
    } else if (pct >= 60) {
      message = 'Good effort! Keep reading the news. 📰';
      msgColor = _caColor;
    } else {
      message = 'Keep practising — current affairs are key to SSB! 📚';
      msgColor = AppColors.error;
    }

    return CustomScrollView(
      physics: const BouncingScrollPhysics(),
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(24, 28, 24, 0),
          sliver: SliverToBoxAdapter(
            child: Column(children: [
              // Score card
              Container(
                padding: const EdgeInsets.all(28),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      _caColor.withValues(alpha: 0.15),
                      _caColor.withValues(alpha: 0.05),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: _caColor.withValues(alpha: 0.3)),
                ),
                child: Column(children: [
                  const Icon(Icons.emoji_events_rounded,
                      color: _caColor, size: 52),
                  const SizedBox(height: 16),
                  Text('$score / $total',
                      style: TextStyle(
                          color: _caColor,
                          fontSize: 48,
                          fontWeight: FontWeight.w900)),
                  const SizedBox(height: 4),
                  Text('$pct% correct',
                      style: const TextStyle(
                          color: AppColors.textSecondary, fontSize: 13)),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: msgColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(message,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            color: msgColor,
                            fontSize: 13,
                            fontWeight: FontWeight.w600)),
                  ),
                ]),
              ),
              const SizedBox(height: 24),

              // Review answers
              const Align(
                alignment: Alignment.centerLeft,
                child: Text('REVIEW ANSWERS',
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.4,
                        color: AppColors.textHint)),
              ),
            ]),
          ),
        ),

        // Answer review cards
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(24, 12, 24, 0),
          sliver: SliverList(
            delegate: SliverChildBuilderDelegate(
              (ctx, i) => _ReviewCard(
                  q: state.questions[i], index: i, caColor: _caColor),
              childCount: state.questions.length,
            ),
          ),
        ),

        // Back button
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 40),
          sliver: SliverToBoxAdapter(
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: _caColor,
                foregroundColor: Colors.black,
                minimumSize: const Size(double.infinity, 52),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
                elevation: 0,
              ),
              onPressed: () => Navigator.pop(context),
              child: const Text('Back to Dashboard',
                  style:
                      TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            ),
          ),
        ),
      ],
    );
  }

  // ── Active question ─────────────────────────────────────────────────────────
  Widget _buildQuestion(BuildContext context, CurrentAffairsState state) {
    final q = state.currentQuestion!;
    final answered = state.status == CaQuizStatus.answered;
    final total = state.questions.length;
    final current = state.currentIndex + 1;

    return Column(children: [
      // Progress
      Padding(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
        child: Row(children: [
          Text('$current / $total',
              style: const TextStyle(
                  color: AppColors.textHint,
                  fontSize: 12,
                  fontWeight: FontWeight.w600)),
          const SizedBox(width: 10),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(3),
              child: LinearProgressIndicator(
                value: current / total,
                backgroundColor: AppColors.border,
                valueColor: const AlwaysStoppedAnimation(_caColor),
                minHeight: 5,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Text('${state.score} pts',
              style: const TextStyle(
                  color: _caColor,
                  fontSize: 12,
                  fontWeight: FontWeight.w700)),
        ]),
      ),

      // Question card
      Expanded(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Question number badge
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: _caColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text('Q$current',
                    style: const TextStyle(
                        color: _caColor,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.5)),
              ),
              const SizedBox(height: 14),

              // Question text
              Text(q.question,
                  style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                      height: 1.4)),
              const SizedBox(height: 24),

              // Options
              ...q.options.asMap().entries.map((entry) {
                final idx = entry.key;
                final opt = entry.value;
                return _OptionTile(
                  label: opt,
                  optionIndex: idx,
                  correctIndex: q.correctIndex,
                  selectedIndex: state.selectedIndex,
                  answered: answered,
                  caColor: _caColor,
                  onTap: answered
                      ? null
                      : () => context
                          .read<CurrentAffairsBloc>()
                          .add(AnswerQuestion(idx)),
                );
              }),

              // Explanation (shown after answer)
              if (answered) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(children: [
                        Icon(Icons.lightbulb_outline_rounded,
                            color: _caColor, size: 16),
                        SizedBox(width: 6),
                        Text('Explanation',
                            style: TextStyle(
                                color: _caColor,
                                fontSize: 12,
                                fontWeight: FontWeight.w700)),
                      ]),
                      const SizedBox(height: 8),
                      Text(q.explanation,
                          style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 13,
                              height: 1.5)),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),

      // Next / Submit button
      if (answered)
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 28),
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: _caColor,
              foregroundColor: Colors.black,
              minimumSize: const Size(double.infinity, 52),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
              elevation: 0,
            ),
            onPressed: () =>
                context.read<CurrentAffairsBloc>().add(NextQuestion()),
            child: Text(
              current == total ? 'See Results' : 'Next Question →',
              style: const TextStyle(
                  fontWeight: FontWeight.w700, fontSize: 15),
            ),
          ),
        ),
    ]);
  }
}

// ─── Option tile ──────────────────────────────────────────────────────────────
class _OptionTile extends StatelessWidget {
  final String label;
  final int optionIndex;
  final int correctIndex;
  final int? selectedIndex;
  final bool answered;
  final Color caColor;
  final VoidCallback? onTap;

  const _OptionTile({
    required this.label,
    required this.optionIndex,
    required this.correctIndex,
    required this.selectedIndex,
    required this.answered,
    required this.caColor,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    Color borderColor = AppColors.border;
    Color bgColor = AppColors.surface;
    Color textColor = AppColors.textPrimary;
    Widget? trailing;

    if (answered) {
      if (optionIndex == correctIndex) {
        borderColor = const Color(0xFF10B981);
        bgColor = const Color(0xFF10B981).withValues(alpha: 0.08);
        textColor = const Color(0xFF10B981);
        trailing = const Icon(Icons.check_circle_rounded,
            color: Color(0xFF10B981), size: 20);
      } else if (optionIndex == selectedIndex) {
        borderColor = AppColors.error;
        bgColor = AppColors.error.withValues(alpha: 0.08);
        textColor = AppColors.error;
        trailing = const Icon(Icons.cancel_rounded,
            color: AppColors.error, size: 20);
      } else {
        textColor = AppColors.textHint;
      }
    }

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(13),
          border: Border.all(color: borderColor),
        ),
        child: Row(children: [
          // Option letter
          Container(
            width: 26, height: 26,
            decoration: BoxDecoration(
              color: caColor.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                String.fromCharCode(65 + optionIndex), // A B C D
                style: TextStyle(
                    color: caColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w800),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(label,
                style: TextStyle(
                    color: textColor, fontSize: 14, height: 1.35)),
          ),
          if (trailing != null) ...[
            const SizedBox(width: 8),
            trailing,
          ],
        ]),
      ),
    );
  }
}

// ─── Review card (on results screen) ─────────────────────────────────────────
class _ReviewCard extends StatefulWidget {
  final CaQuestion q;
  final int index;
  final Color caColor;
  const _ReviewCard(
      {required this.q, required this.index, required this.caColor});

  @override
  State<_ReviewCard> createState() => _ReviewCardState();
}

class _ReviewCardState extends State<_ReviewCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => setState(() => _expanded = !_expanded),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: widget.caColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text('Q${widget.index + 1}',
                  style: TextStyle(
                      color: widget.caColor,
                      fontSize: 10,
                      fontWeight: FontWeight.w800)),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(widget.q.question,
                  maxLines: _expanded ? null : 2,
                  overflow:
                      _expanded ? TextOverflow.visible : TextOverflow.ellipsis,
                  style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      height: 1.4)),
            ),
            Icon(
                _expanded
                    ? Icons.expand_less_rounded
                    : Icons.expand_more_rounded,
                color: AppColors.textHint,
                size: 20),
          ]),
          if (_expanded) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                    color: const Color(0xFF10B981).withValues(alpha: 0.2)),
              ),
              child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.check_circle_rounded,
                        color: Color(0xFF10B981), size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                          widget.q.options[widget.q.correctIndex],
                          style: const TextStyle(
                              color: Color(0xFF10B981),
                              fontSize: 13,
                              fontWeight: FontWeight.w600)),
                    ),
                  ]),
            ),
            const SizedBox(height: 8),
            Text(widget.q.explanation,
                style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12.5,
                    height: 1.5)),
          ],
        ]),
      ),
    );
  }
}
