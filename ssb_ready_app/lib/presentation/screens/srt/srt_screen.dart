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
      appBar: AppBar(
        title: const Text('Situation Reaction Test'),
        backgroundColor: AppColors.primaryGreen,
        foregroundColor: Colors.white,
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
          if (state.status == SrtStatus.inProgress && state.globalTimeRemaining == 0) {
            // Time's up — submit current text and force finish
            context.read<SrtBloc>().add(SubmitReaction(_controller.text));
            _controller.clear();
            // Force through remaining situations
            context.read<SrtBloc>().add(NextSituation());
          } else if (state.status == SrtStatus.analyzing ||
              state.status == SrtStatus.completed ||
              state.status == SrtStatus.error) {
            Navigator.pushReplacementNamed(context, '/srt-result');
          }
        },
        builder: (context, state) {
          if (state.status == SrtStatus.initial || state.status == SrtStatus.loading) {
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
            color: Colors.indigo.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            'Situation ${state.currentSituationIndex + 1} / ${state.situations.length}',
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: Colors.indigo,
            ),
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: isLowTime
                ? Colors.red.withValues(alpha: 0.1)
                : AppColors.primaryGreen.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            children: [
              Icon(
                Icons.timer,
                size: 18,
                color: isLowTime ? Colors.red : AppColors.primaryGreen,
              ),
              const SizedBox(width: 6),
              Text(
                state.formattedTime,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isLowTime ? Colors.red : AppColors.primaryGreen,
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
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.indigo.withValues(alpha: 0.2)),
          boxShadow: [
            BoxShadow(
              color: Colors.indigo.withValues(alpha: 0.08),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.indigo.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                'SITUATION',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: Colors.indigo,
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
                    fontSize: 18,
                    fontWeight: FontWeight.w500,
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
                  borderRadius: BorderRadius.circular(12),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.primaryGreen, width: 2),
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
                state.isLastSituation ? Icons.check_circle : Icons.arrow_forward,
              ),
              label: Text(
                state.isLastSituation ? 'Finish Test' : 'Next Situation',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: state.isLastSituation ? Colors.indigo : AppColors.primaryGreen,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
