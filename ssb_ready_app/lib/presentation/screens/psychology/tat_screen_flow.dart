part of 'package:ssb_ready_app/presentation/screens/psychology/tat_screen.dart';

extension _TatScreenFlow on _TatScreenState {
  Widget _buildInitialView(BuildContext context, TatState state) {
    const lines = [
      'Each card shows an approved image for 30 seconds.',
      'Then you capture quick perceptions before writing your story.',
      'You have 4 minutes to write — hero, feelings, and outcome matter.',
    ];
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Card ${state.currentImageIndex + 1} of ${state.totalImages}',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 16),
            const Text(
              'Thematic Apperception Test',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 16),
            AnimatedInstructionList(
              key: ValueKey('tat-intro-$_animationSeed'),
              lines: lines,
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: () {
                _restartIntroAnimation();
                context.read<TatBloc>().add(BeginTatFlow());
              },
              child: const Text('BEGIN THIS CARD'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildConsentView(BuildContext context) {
    const lines = [
      'Ready to view the card image for 30 seconds?',
      'Focus on characters, tension, and relationships.',
      'The scene disappears when the timer ends.',
    ];
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AnimatedInstructionList(
            key: ValueKey('tat-consent-$_animationSeed'),
            lines: lines,
            titleStyle: const TextStyle(fontSize: 15, height: 1.45),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () =>
                context.read<TatBloc>().add(AcceptPictureViewing()),
            child: const Text('YES, SHOW SCENE'),
          ),
        ],
      ),
    );
  }

  Widget _buildModeView(BuildContext context) {
    const lines = [
      'Choose how you will write your TAT story.',
      'Paper: write longhand, then photo + automatic text extraction.',
      'Typing: compose directly in the app.',
    ];
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AnimatedInstructionList(
            key: ValueKey('tat-mode-$_animationSeed'),
            lines: lines,
            titleStyle: const TextStyle(fontSize: 15, height: 1.45),
          ),
          const SizedBox(height: 20),
          ListTile(
            tileColor: Colors.white,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            title: const Text('Type in app'),
            onTap: () => context
                .read<TatBloc>()
                .add(const SelectStoryMode(StoryInputMode.typing)),
          ),
          const SizedBox(height: 12),
          ListTile(
            tileColor: Colors.white,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            title: const Text('Write on paper'),
            onTap: () => context
                .read<TatBloc>()
                .add(const SelectStoryMode(StoryInputMode.paper)),
          ),
        ],
      ),
    );
  }

  Widget _buildPrepView(TatState state) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.hourglass_top, size: 48, color: AppColors.accent),
          const SizedBox(height: 12),
          Text(
            'Prep: 00:${state.prepTimeRemaining.toString().padLeft(2, '0')}',
            style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            state.storyInputMode == StoryInputMode.paper
                ? 'Prepare paper and pen'
                : 'Prepare to type',
          ),
          const SizedBox(height: 20),
          OutlinedButton(
            onPressed: () => context.read<TatBloc>().add(SkipPrep()),
            child: const Text('SKIP PREP'),
          ),
        ],
      ),
    );
  }

  Widget _buildObservingView(BuildContext context, TatState state) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Card ${state.currentImageIndex + 1} / ${state.totalImages}',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              Text(
                '00:${state.observationTimeRemaining.toString().padLeft(2, '0')}',
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: AppColors.accent,
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: Container(
                width: double.infinity,
                color: Colors.white,
                child: Image.network(
                  state.currentImageUrl,
                  fit: BoxFit.contain,
                  loadingBuilder: (context, child, loadingProgress) {
                    if (loadingProgress == null) return child;
                    return const Center(child: CircularProgressIndicator());
                  },
                  errorBuilder: (context, error, stackTrace) {
                    return const Center(
                      child: Text('Image unavailable',
                          textAlign: TextAlign.center),
                    );
                  },
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
