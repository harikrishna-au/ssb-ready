part of 'package:ssb_ready_app/presentation/screens/ppdt/ppdt_screen.dart';

extension _PpdtScreenFlow on _PpdtScreenState {
  Widget _buildInitialView(BuildContext context) {
    const introLines = [
      'You will be shown a hazy picture for exactly 30 seconds.',
      'After 30 seconds, the picture will disappear.',
      'You will then have 3 minutes to write a meaningful story.',
      'Focus on what led to the situation, what is happening now, and the final outcome.',
    ];

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              height: 90,
              width: 90,
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: AppColors.brandGradient),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Icon(Icons.visibility_outlined,
                  size: 42, color: Colors.white),
            ),
            const SizedBox(height: 24),
            const Text(
              'Picture Perception Test',
              style: TextStyle(fontSize: 25, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 16),
            AnimatedInstructionList(
              key: ValueKey('intro-$_animationSeed'),
              lines: introLines,
            ),
            const SizedBox(height: 40),
            ElevatedButton(
              onPressed: () {
                setState(() => _animationSeed++);
                context.read<PpdtBloc>().add(BeginPpdtFlow());
              },
              style: ElevatedButton.styleFrom(
                padding:
                    const EdgeInsets.symmetric(horizontal: 48, vertical: 16),
              ),
              child: const Text('BEGIN OBSERVATION',
                  style: TextStyle(fontSize: 16)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPictureConsentView(BuildContext context) {
    const consentLines = [
      'Are you ready to view the picture for 30 seconds?',
      'Once started, the image appears only once.',
      'Observe characters, mood, and possible situation quickly.',
    ];

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AnimatedInstructionList(
            key: ValueKey('consent-$_animationSeed'),
            lines: consentLines,
            titleStyle: const TextStyle(fontSize: 21, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () => context.read<PpdtBloc>().add(AcceptPictureViewing()),
            child: const Text('YES, SHOW PICTURE'),
          ),
        ],
      ),
    );
  }

  Widget _buildModeSelectionView(BuildContext context) {
    const modeLines = [
      'Choose how you want to write your PPDT story.',
      'Paper mode lets you write naturally and upload handwritten notes.',
      'Typing mode is quicker for direct practice inside the app.',
    ];

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AnimatedInstructionList(
            key: ValueKey('mode-$_animationSeed'),
            lines: modeLines,
            titleStyle: const TextStyle(fontSize: 21, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 20),
          ListTile(
            tileColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            title: const Text('Type in app'),
            subtitle: const Text('You will type your story directly.'),
            onTap: () => context
                .read<PpdtBloc>()
                .add(const SelectStoryMode(StoryInputMode.typing)),
          ),
          const SizedBox(height: 12),
          ListTile(
            tileColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            title: const Text('Write on paper'),
            subtitle: const Text('Prepare paper and pen, then paste OCR text later.'),
            onTap: () => context
                .read<PpdtBloc>()
                .add(const SelectStoryMode(StoryInputMode.paper)),
          ),
        ],
      ),
    );
  }

  Widget _buildPrepView(PpdtState state) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.hourglass_top, size: 48, color: AppColors.accent),
          const SizedBox(height: 12),
          Text(
            'Prep Time: 00:${state.prepTimeRemaining.toString().padLeft(2, '0')}',
            style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            state.storyInputMode == StoryInputMode.paper
                ? 'Arrange paper and pen'
                : 'Get ready to type your story',
          ),
        ],
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
            color: AppColors.accentSoft,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.timer, color: AppColors.accent),
                const SizedBox(width: 8),
                Text(
                  '00:${state.observationTimeRemaining.toString().padLeft(2, '0')}',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: AppColors.accent,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(20),
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
}
