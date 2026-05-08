import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';
import 'package:ssb_ready_app/presentation/bloc/ppdt/ppdt_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/ppdt/ppdt_event.dart';
import 'package:ssb_ready_app/presentation/bloc/ppdt/ppdt_state.dart';

class PpdtScreen extends StatefulWidget {
  const PpdtScreen({super.key});

  @override
  State<PpdtScreen> createState() => _PpdtScreenState();
}

class _PpdtScreenState extends State<PpdtScreen> {
  final TextEditingController _storyController = TextEditingController();

  @override
  void dispose() {
    _storyController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('PPDT Practice'),
        centerTitle: true,
      ),
      body: BlocConsumer<PpdtBloc, PpdtState>(
        listener: (context, state) {
          if (state.phase == PpdtPhase.writing && state.writingTimeRemaining == 0) {
            context.read<PpdtBloc>().add(SubmitStory(_storyController.text));
          } else if (state.phase == PpdtPhase.analyzing || state.phase == PpdtPhase.completed) {
            Navigator.pushReplacementNamed(context, '/ppdt-result');
          }
        },
        builder: (context, state) {
          if (state.phase == PpdtPhase.initial) {
            return _buildInitialView(context);
          } else if (state.phase == PpdtPhase.observing) {
            return _buildObservingView(context, state);
          } else if (state.phase == PpdtPhase.writing) {
            return _buildWritingView(context, state);
          }
          return const Center(child: CircularProgressIndicator());
        },
      ),
    );
  }

  Widget _buildInitialView(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.visibility, size: 80, color: AppColors.primaryGreen),
            const SizedBox(height: 24),
            const Text(
              'Picture Perception Test',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            const Text(
              '1. You will be shown a hazy picture for exactly 30 seconds.\n\n'
              '2. After 30 seconds, the picture will disappear.\n\n'
              '3. You will then have 4 minutes to write a story about what led to the situation, what is currently happening, and what the final outcome will be.',
              style: TextStyle(fontSize: 16, height: 1.5),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 40),
            ElevatedButton(
              onPressed: () => context.read<PpdtBloc>().add(StartObservation()),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryGreen,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 16),
              ),
              child: const Text('BEGIN OBSERVATION', style: TextStyle(fontSize: 16)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildObservingView(BuildContext context, PpdtState state) {
    return Center(
      child: Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            color: Colors.red[50],
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.timer, color: Colors.red),
                const SizedBox(width: 8),
                Text(
                  '00:${state.observationTimeRemaining.toString().padLeft(2, '0')}',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.red,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.network(
                  state.imageUrl,
                  fit: BoxFit.contain,
                  loadingBuilder: (context, child, loadingProgress) {
                    if (loadingProgress == null) return child;
                    return const Center(child: CircularProgressIndicator());
                  },
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWritingView(BuildContext context, PpdtState state) {
    final minutes = (state.writingTimeRemaining / 60).floor();
    final seconds = (state.writingTimeRemaining % 60).toString().padLeft(2, '0');

    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Write your story',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              Chip(
                avatar: const Icon(Icons.timer, size: 16),
                label: Text(
                  '$minutes:$seconds',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                backgroundColor: state.writingTimeRemaining < 60 ? Colors.red[50] : Colors.blue[50],
              ),
            ],
          ),
          const SizedBox(height: 16),
          Expanded(
            child: TextField(
              controller: _storyController,
              maxLines: null,
              expands: true,
              textAlignVertical: TextAlignVertical.top,
              decoration: InputDecoration(
                hintText: 'Describe what led up to the situation, what is currently happening, and what the outcome will be...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                filled: true,
                fillColor: Colors.grey[50],
              ),
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () {
              context.read<PpdtBloc>().add(SubmitStory(_storyController.text));
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryGreen,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
            child: const Text('SUBMIT STORY', style: TextStyle(fontSize: 16)),
          ),
        ],
      ),
    );
  }
}
