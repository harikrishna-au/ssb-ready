import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';
import 'package:ssb_ready_app/presentation/bloc/srt/srt_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/srt/srt_event.dart';
import 'package:ssb_ready_app/presentation/bloc/srt/srt_state.dart';

class SrtScreen extends StatefulWidget {
  const SrtScreen({super.key});

  @override
  State<SrtScreen> createState() => _SrtScreenState();
}

class _SrtScreenState extends State<SrtScreen> {
  final TextEditingController _controller = TextEditingController();
  final FocusNode _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    context.read<SrtBloc>().add(StartSrtTest());
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _submitAndNext() {
    final bloc = context.read<SrtBloc>();
    bloc.add(SubmitReaction(_controller.text));
    _controller.clear();
    _focusNode.requestFocus();
    bloc.add(NextSituation());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Situation Reaction Test'),
      ),
      body: BlocConsumer<SrtBloc, SrtState>(
        listenWhen: (previous, current) {
          // Timer expired
          if (previous.status == SrtStatus.inProgress &&
              current.status == SrtStatus.inProgress &&
              previous.globalTimeRemaining > 0 &&
              current.globalTimeRemaining == 0) {
            return true;
          }
          // Test finished (analyzing or completed)
          if (current.status == SrtStatus.analyzing ||
              current.status == SrtStatus.completed ||
              current.status == SrtStatus.error) {
            return true;
          }
          return false;
        },
        listener: (context, state) {
          if (state.status == SrtStatus.inProgress &&
              state.globalTimeRemaining == 0) {
            final partial = _controller.text;
            _controller.clear();
            context.read<SrtBloc>().add(FinishSrtOnTimeout(partial));
          } else if (state.status == SrtStatus.analyzing ||
              state.status == SrtStatus.completed ||
              state.status == SrtStatus.error) {
            Navigator.pushReplacementNamed(context, '/srt-result');
          }
        },
        builder: (context, state) {
          if (state.status == SrtStatus.initial ||
              state.status == SrtStatus.loading) {
            return const Center(child: CircularProgressIndicator());
          }

          return Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildHeader(state),
                const SizedBox(height: 24),
                _buildSituationCard(state),
                const SizedBox(height: 24),
                _buildInputSection(state),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildHeader(SrtState state) {
    final isLowTime = state.globalTimeRemaining <= 60;
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: AppColors.secondary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            'Situation ${state.currentSituationIndex + 1} / ${state.situations.length}',
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.secondary,
            ),
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: isLowTime
                ? AppColors.error.withValues(alpha: 0.1)
                : AppColors.primary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            children: [
              Icon(
                Icons.timer,
                size: 18,
                color: isLowTime ? AppColors.error : AppColors.primary,
              ),
              const SizedBox(width: 6),
              Text(
                state.formattedTime,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isLowTime ? AppColors.error : AppColors.primary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSituationCard(SrtState state) {
    return Expanded(
      flex: 2,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.secondary.withValues(alpha: 0.2)),
          boxShadow: [
            BoxShadow(
              color: AppColors.secondary.withValues(alpha: 0.10),
              blurRadius: 16,
              offset: const Offset(0, 7),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.secondary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                'SITUATION',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: AppColors.secondary,
                  letterSpacing: 1.2,
                ),
              ),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: Center(
                child: Text(
                  state.currentSituation,
                  style: const TextStyle(
                    fontSize: 19,
                    fontWeight: FontWeight.w600,
                    height: 1.5,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInputSection(SrtState state) {
    return Expanded(
      flex: 2,
      child: Column(
        children: [
          Expanded(
            child: TextField(
              controller: _controller,
              focusNode: _focusNode,
              autofocus: true,
              maxLines: null,
              expands: true,
              textAlignVertical: TextAlignVertical.top,
              decoration: InputDecoration(
                hintText: 'Write your reaction...',
                alignLabelWithHint: true,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide:
                      const BorderSide(color: AppColors.primary, width: 1.8),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton.icon(
              onPressed: _submitAndNext,
              icon: Icon(
                state.isLastSituation
                    ? Icons.check_circle
                    : Icons.arrow_forward,
              ),
              label: Text(
                state.isLastSituation ? 'Finish Test' : 'Next Situation',
                style:
                    const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: state.isLastSituation
                    ? AppColors.secondary
                    : AppColors.primary,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
