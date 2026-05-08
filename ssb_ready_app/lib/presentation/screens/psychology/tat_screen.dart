import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';
import 'package:ssb_ready_app/presentation/bloc/tat/tat_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/tat/tat_event.dart';
import 'package:ssb_ready_app/presentation/bloc/tat/tat_state.dart';

class TatScreen extends StatefulWidget {
  const TatScreen({super.key});

  @override
  State<TatScreen> createState() => _TatScreenState();
}

class _TatScreenState extends State<TatScreen> {
  final TextEditingController _storyController = TextEditingController();

  @override
  void initState() {
    super.initState();
    context.read<TatBloc>().add(StartTatTest());
  }

  @override
  void dispose() {
    _storyController.dispose();
    super.dispose();
  }

  void _submitStory() {
    context.read<TatBloc>().add(SubmitStory(_storyController.text));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Thematic Apperception Test'),
        backgroundColor: AppColors.primaryGreen,
        foregroundColor: Colors.white,
      ),
      body: BlocConsumer<TatBloc, TatState>(
        listener: (context, state) {
          if (state.phase == TatPhase.analyzing || state.phase == TatPhase.completed) {
            Navigator.pushReplacementNamed(context, '/tat-result');
          }
        },
        builder: (context, state) {
          if (state.phase == TatPhase.initial) {
            return const Center(child: CircularProgressIndicator());
          }

          return Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildProgressIndicator(state),
                const SizedBox(height: 24),
                if (state.phase == TatPhase.observing) _buildObservationPhase(state),
                if (state.phase == TatPhase.writing) _buildWritingPhase(state),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildProgressIndicator(TatState state) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          'Image ${state.currentImageIndex + 1} of ${state.totalImages}',
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        _buildTimer(state),
      ],
    );
  }

  Widget _buildTimer(TatState state) {
    final int timeRemaining = state.phase == TatPhase.observing
        ? state.observationTimeRemaining
        : state.writingTimeRemaining;
    
    final minutes = (timeRemaining ~/ 60).toString().padLeft(2, '0');
    final seconds = (timeRemaining % 60).toString().padLeft(2, '0');

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.primaryGreen.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: [
          const Icon(Icons.timer, size: 18, color: AppColors.primaryGreen),
          const SizedBox(width: 4),
          Text(
            '$minutes:$seconds',
            style: const TextStyle(
              color: AppColors.primaryGreen,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildObservationPhase(TatState state) {
    return Expanded(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text(
            'Observe the Image Description',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'In the real SSB, you would see an actual image here.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 40),
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey[300]!),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 10,
                ),
              ],
            ),
            child: Text(
              state.currentImageDescription,
              style: const TextStyle(fontSize: 18, height: 1.5),
              textAlign: TextAlign.center,
            ),
          ),
          const Spacer(),
          const Text(
            'Writing phase will start automatically...',
            style: TextStyle(fontStyle: FontStyle.italic, color: Colors.grey),
          ),
        ],
      ),
    );
  }

  Widget _buildWritingPhase(TatState state) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Write your story',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: TextField(
              controller: _storyController,
              maxLines: null,
              expands: true,
              textAlignVertical: TextAlignVertical.top,
              decoration: InputDecoration(
                hintText: 'What led to the situation? What is happening now? What will be the outcome?',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _submitStory,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryGreen,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: const Text('Submit Story', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}
