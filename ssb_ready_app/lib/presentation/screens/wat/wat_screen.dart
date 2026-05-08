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
    if (_controller.text.trim().isEmpty) return; // Optional: enforce non-empty? For WAT, empty is a skip.
    context.read<WatBloc>().add(SubmitSentence(_controller.text));
    _controller.clear();
    _focusNode.requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Word Association Test'),
        backgroundColor: AppColors.primaryGreen,
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
          if (current.status == WatStatus.analyzing || current.status == WatStatus.completed) {
            return true;
          }
          return false;
        },
        listener: (context, state) {
          if (state.status == WatStatus.inProgress && state.timeRemaining == 0) {
            // Timer expired, auto-submit what they have
            context.read<WatBloc>().add(SubmitSentence(_controller.text));
            _controller.clear();
            _focusNode.requestFocus();
          } else if (state.status == WatStatus.analyzing || state.status == WatStatus.completed) {
            Navigator.pushReplacementNamed(context, '/wat-result');
          }
        },
        builder: (context, state) {
          if (state.status == WatStatus.initial || state.status == WatStatus.loading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state.status == WatStatus.error) {
            return Center(child: Text(state.errorMessage ?? 'An error occurred.'));
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
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: state.timeRemaining <= 5 ? Colors.red.withValues(alpha: 0.1) : AppColors.primaryGreen.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            children: [
              Icon(
                Icons.timer,
                color: state.timeRemaining <= 5 ? Colors.red : AppColors.primaryGreen,
              ),
              const SizedBox(width: 8),
              Text(
                '00:${state.timeRemaining.toString().padLeft(2, '0')}',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: state.timeRemaining <= 5 ? Colors.red : AppColors.primaryGreen,
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
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Text(
            state.currentWord.toUpperCase(),
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 48,
              fontWeight: FontWeight.w900,
              letterSpacing: 2.0,
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
              borderRadius: BorderRadius.circular(12),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.primaryGreen, width: 2),
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
              backgroundColor: AppColors.primaryGreen,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
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
