import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';
import 'package:ssb_ready_app/presentation/bloc/sdt/sdt_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/sdt/sdt_event.dart';
import 'package:ssb_ready_app/presentation/bloc/sdt/sdt_state.dart';

class SdtScreen extends StatefulWidget {
  const SdtScreen({super.key});

  @override
  State<SdtScreen> createState() => _SdtScreenState();
}

class _SdtScreenState extends State<SdtScreen> {
  final TextEditingController _controller = TextEditingController();
  final FocusNode _focusNode = FocusNode();

  static const Color _sdtColor = Color(0xFF10B981); // emerald

  @override
  void initState() {
    super.initState();
    context.read<SdtBloc>().add(const StartSdtTest());
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _onNext(SdtState state) {
    final bloc = context.read<SdtBloc>();
    if (state.isLastPerspective) {
      bloc.add(SdtSubmitAll(_controller.text.trim()));
    } else {
      bloc.add(SdtNextPerspective(_controller.text.trim()));
      _controller.clear();
      _focusNode.requestFocus();
    }
  }

  String _formatTime(int seconds) {
    final m = (seconds ~/ 60).toString().padLeft(2, '0');
    final s = (seconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<SdtBloc, SdtState>(
      listenWhen: (prev, curr) {
        if (prev.timeRemaining > 0 && curr.timeRemaining == 0) { return true; }
        if (curr.status == SdtStatus.analyzing ||
            curr.status == SdtStatus.completed ||
            curr.status == SdtStatus.error) { return true; }
        return false;
      },
      listener: (context, state) {
        if (state.timeRemaining == 0 &&
            state.status == SdtStatus.inProgress) {
          final partial = _controller.text.trim();
          _controller.clear();
          if (state.isLastPerspective) {
            context.read<SdtBloc>().add(SdtSubmitAll(partial));
          } else {
            context
                .read<SdtBloc>()
                .add(SdtTimeExpired(partial));
            _focusNode.requestFocus();
          }
        }
        if (state.status == SdtStatus.analyzing ||
            state.status == SdtStatus.completed ||
            state.status == SdtStatus.error) {
          Navigator.pushReplacementNamed(context, '/sdt-result');
        }
      },
      child: Scaffold(
        backgroundColor: AppColors.background,
        resizeToAvoidBottomInset: true,
        body: BlocBuilder<SdtBloc, SdtState>(
          builder: (context, state) {
            if (state.status == SdtStatus.initial) {
              return const Center(child: CircularProgressIndicator());
            }
            return SafeArea(
              child: Column(
                children: [
                  _buildTopBar(context, state),
                  _buildProgressBar(state),
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildPerspectiveCard(state),
                          const SizedBox(height: 20),
                          _buildInputArea(state),
                          const SizedBox(height: 16),
                          _buildTips(state),
                          const SizedBox(height: 20),
                        ],
                      ),
                    ),
                  ),
                  _buildBottomBar(state),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildTopBar(BuildContext context, SdtState state) {
    final timeIsLow = state.timeRemaining < 120;
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 8, 16, 4),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.close_rounded,
                color: AppColors.textSecondary, size: 22),
            onPressed: () => _showExitDialog(context),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Self Description Test',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                Text(
                  'Perspective ${state.currentIndex + 1} of ${kSdtPerspectives.length}',
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          // Timer
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: timeIsLow
                  ? AppColors.error.withValues(alpha: 0.15)
                  : _sdtColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: timeIsLow
                    ? AppColors.error.withValues(alpha: 0.4)
                    : _sdtColor.withValues(alpha: 0.3),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.timer_outlined,
                  size: 14,
                  color: timeIsLow ? AppColors.error : _sdtColor,
                ),
                const SizedBox(width: 5),
                Text(
                  _formatTime(state.timeRemaining),
                  style: TextStyle(
                    color: timeIsLow ? AppColors.error : _sdtColor,
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProgressBar(SdtState state) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: List.generate(kSdtPerspectives.length, (i) {
          final isDone = i < state.currentIndex;
          final isCurrent = i == state.currentIndex;
          return Expanded(
            child: Container(
              margin: EdgeInsets.only(right: i < kSdtPerspectives.length - 1 ? 4 : 0),
              height: 4,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(4),
                color: isDone
                    ? _sdtColor
                    : isCurrent
                        ? _sdtColor.withValues(alpha: 0.5)
                        : AppColors.surfaceHigh,
              ),
            ),
          );
        }),
      ),
    );
  }

  Widget _buildPerspectiveCard(SdtState state) {
    final p = state.currentPerspective;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            _sdtColor.withValues(alpha: 0.10),
            _sdtColor.withValues(alpha: 0.04),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _sdtColor.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(p['icon']!, style: const TextStyle(fontSize: 28)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: _sdtColor.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(5),
                      ),
                      child: Text(
                        'SDT · PERSPECTIVE ${state.currentIndex + 1}',
                        style: TextStyle(
                          color: _sdtColor,
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      p['title']!,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.2,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            p['prompt']!,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 13.5,
              height: 1.55,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInputArea(SdtState state) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Text(
              'Your Response',
              style: TextStyle(
                color: AppColors.textPrimary,
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
            const Spacer(),
            ValueListenableBuilder<TextEditingValue>(
              valueListenable: _controller,
              builder: (_, value, __) => Text(
                '${value.text.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty).length} words',
                style: const TextStyle(
                  color: AppColors.textHint,
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: _sdtColor.withValues(alpha: 0.22)),
          ),
          child: TextField(
            controller: _controller,
            focusNode: _focusNode,
            autofocus: true,
            maxLines: 8,
            minLines: 6,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 14.5,
              height: 1.6,
            ),
            decoration: InputDecoration(
              hintText:
                  'Write in full sentences. Be honest and specific. Mention qualities, habits, and examples...',
              hintStyle: TextStyle(
                color: AppColors.textHint.withValues(alpha: 0.7),
                fontSize: 13.5,
                height: 1.55,
              ),
              contentPadding: const EdgeInsets.all(16),
              border: InputBorder.none,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTips(SdtState state) {
    final tips = _tipsFor(state.currentIndex);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceSoft.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.lightbulb_outline_rounded,
              size: 15, color: AppColors.accent),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              tips,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 12,
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomBar(SdtState state) {
    final isLast = state.isLastPerspective;
    return Container(
      padding: EdgeInsets.fromLTRB(
          20, 12, 20, MediaQuery.of(context).padding.bottom + 12),
      decoration: BoxDecoration(
        color: AppColors.background,
        border: Border(
            top: BorderSide(color: AppColors.border.withValues(alpha: 0.5))),
      ),
      child: Row(
        children: [
          if (state.currentIndex > 0) ...[
            _buildSkipButton(state),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: _sdtColor,
                foregroundColor: Colors.white,
                minimumSize: const Size(0, 52),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
                elevation: 0,
              ),
              onPressed: () => _onNext(state),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    isLast ? 'Submit & Analyse' : 'Next Perspective',
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 15),
                  ),
                  const SizedBox(width: 6),
                  Icon(
                    isLast
                        ? Icons.auto_awesome_rounded
                        : Icons.arrow_forward_rounded,
                    size: 18,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSkipButton(SdtState state) {
    return OutlinedButton(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(0, 52),
        side: BorderSide(color: AppColors.border),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        foregroundColor: AppColors.textSecondary,
      ),
      onPressed: () {
        final bloc = context.read<SdtBloc>();
        bloc.add(SdtNextPerspective(_controller.text.trim()));
        _controller.clear();
        _focusNode.requestFocus();
      },
      child: const Text('Skip', style: TextStyle(fontSize: 14)),
    );
  }

  void _showExitDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surfaceHigh,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Exit SDT?',
            style: TextStyle(color: AppColors.textPrimary)),
        content: const Text(
          'Your progress will be lost. Are you sure you want to exit?',
          style: TextStyle(color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Stay'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context);
            },
            child: const Text('Exit',
                style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
  }

  String _tipsFor(int index) {
    const tips = [
      'Mention 3–5 qualities your parents often praise. Include a habit or behavior they appreciate and something they want you to work on.',
      'Focus on academic/professional performance, discipline, and how you handle responsibilities and feedback from seniors.',
      'Describe your role in a friend group — are you the planner, mediator, motivator? Include social strengths and how you handle conflict.',
      'Think about any time you led a team, group project, or sports team. How did people respond to your leadership style?',
      'Be honest — list 3 genuine strengths and 2 areas you are actively working on. Avoid over-glorifying yourself.',
    ];
    return tips[index];
  }
}
