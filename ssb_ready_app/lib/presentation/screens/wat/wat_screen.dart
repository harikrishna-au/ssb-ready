import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';
import 'package:ssb_ready_app/presentation/bloc/wat/wat_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/wat/wat_event.dart';
import 'package:ssb_ready_app/presentation/bloc/wat/wat_state.dart';

class WatScreen extends StatefulWidget {
  const WatScreen({super.key});

  @override
  State<WatScreen> createState() => _WatScreenState();
}

class _WatScreenState extends State<WatScreen> {
  final TextEditingController _controller = TextEditingController();
  final FocusNode _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    context.read<WatBloc>().add(StartWatTest());
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _submitSentence() {
    if (_controller.text.trim().isEmpty) {
      return;
    } // Optional: enforce non-empty? For WAT, empty is a skip.
    context.read<WatBloc>().add(SubmitSentence(_controller.text));
    _controller.clear();
    _focusNode.requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Word Association Test'),
      ),
      body: BlocConsumer<WatBloc, WatState>(
        listenWhen: (previous, current) {
          // Listen for timer reaching 0 to auto-submit
          if (previous.status == WatStatus.inProgress &&
              current.status == WatStatus.inProgress &&
              previous.timeRemaining > 0 &&
              current.timeRemaining == 0) {
            return true;
          }
          // Listen for test completion
          if (current.status == WatStatus.analyzing ||
              current.status == WatStatus.completed) {
            return true;
          }
          return false;
        },
        listener: (context, state) {
          if (state.status == WatStatus.inProgress &&
              state.timeRemaining == 0) {
            // Timer expired, auto-submit what they have
            context.read<WatBloc>().add(SubmitSentence(_controller.text));
            _controller.clear();
            _focusNode.requestFocus();
          } else if (state.status == WatStatus.analyzing ||
              state.status == WatStatus.completed) {
            Navigator.pushReplacementNamed(context, '/wat-result');
          }
        },
        builder: (context, state) {
          if (state.status == WatStatus.initial ||
              state.status == WatStatus.loading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state.status == WatStatus.error) {
            return Center(
                child: Text(state.errorMessage ?? 'An error occurred.'));
          }

          return Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildProgressHeader(state),
                const SizedBox(height: 40),
                _buildWordDisplay(state),
                const SizedBox(height: 40),
                _buildInputField(),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildProgressHeader(WatState state) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          'Word ${state.currentWordIndex + 1} of ${state.words.length}',
          style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w700),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: state.timeRemaining <= 5
                ? AppColors.error.withValues(alpha: 0.12)
                : AppColors.primary.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            children: [
              Icon(
                Icons.timer,
                color: state.timeRemaining <= 5
                    ? AppColors.error
                    : AppColors.primary,
              ),
              const SizedBox(width: 8),
              Text(
                '00:${state.timeRemaining.toString().padLeft(2, '0')}',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: state.timeRemaining <= 5
                      ? AppColors.error
                      : AppColors.primary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildWordDisplay(WatState state) {
    return Expanded(
      child: Center(
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 60),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withValues(alpha: 0.08),
                blurRadius: 18,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Text(
            state.currentWord.toUpperCase(),
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 50,
              fontWeight: FontWeight.w900,
              letterSpacing: 2.0,
              color: AppColors.textPrimary,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInputField() {
    return Column(
      children: [
        TextField(
          controller: _controller,
          focusNode: _focusNode,
          autofocus: true,
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _submitSentence(),
          decoration: InputDecoration(
            hintText: 'Type your sentence here...',
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
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          height: 50,
          child: ElevatedButton(
            onPressed: _submitSentence,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.secondary,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            child: const Text(
              'Submit Sentence',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ),
        ),
      ],
    );
  }
}
