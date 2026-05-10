import 'package:equatable/equatable.dart';
import 'package:ssb_ready_app/core/enums/story_input_mode.dart';

enum PpdtPhase {
  initial,
  waitingPictureConsent,
  modeSelection,
  prep,
  observing,
  perceptionCapture,
  writing,
  analyzing,
  completed
}

class PpdtState extends Equatable {
  final PpdtPhase phase;
  final StoryInputMode storyInputMode;
  final int prepTimeRemaining; // 30 seconds
  final int observationTimeRemaining; // 30 seconds
  final int writingTimeRemaining; // 3 minutes (180 seconds)
  final String imageUrl;
  final String situationSummary;
  final int positiveCharacters;
  final int negativeCharacters;
  final int neutralCharacters;
  final String sketchNotes;
  final String submittedStory;
  final String? feedback;
  final List<Map<String, dynamic>> leaderboard;
  final String? errorMessage;

  const PpdtState({
    this.phase = PpdtPhase.initial,
    this.storyInputMode = StoryInputMode.typing,
    this.prepTimeRemaining = 30,
    this.observationTimeRemaining = 30,
    this.writingTimeRemaining = 180,
    this.imageUrl = 'https://picsum.photos/800/600?grayscale&blur=2', // Placeholder hazy image
    this.situationSummary = '',
    this.positiveCharacters = 0,
    this.negativeCharacters = 0,
    this.neutralCharacters = 0,
    this.sketchNotes = '',
    this.submittedStory = '',
    this.feedback,
    this.leaderboard = const [],
    this.errorMessage,
  });

  PpdtState copyWith({
    PpdtPhase? phase,
    StoryInputMode? storyInputMode,
    int? prepTimeRemaining,
    int? observationTimeRemaining,
    int? writingTimeRemaining,
    String? imageUrl,
    String? situationSummary,
    int? positiveCharacters,
    int? negativeCharacters,
    int? neutralCharacters,
    String? sketchNotes,
    String? submittedStory,
    String? feedback,
    List<Map<String, dynamic>>? leaderboard,
    String? errorMessage,
  }) {
    return PpdtState(
      phase: phase ?? this.phase,
      storyInputMode: storyInputMode ?? this.storyInputMode,
      prepTimeRemaining: prepTimeRemaining ?? this.prepTimeRemaining,
      observationTimeRemaining: observationTimeRemaining ?? this.observationTimeRemaining,
      writingTimeRemaining: writingTimeRemaining ?? this.writingTimeRemaining,
      imageUrl: imageUrl ?? this.imageUrl,
      situationSummary: situationSummary ?? this.situationSummary,
      positiveCharacters: positiveCharacters ?? this.positiveCharacters,
      negativeCharacters: negativeCharacters ?? this.negativeCharacters,
      neutralCharacters: neutralCharacters ?? this.neutralCharacters,
      sketchNotes: sketchNotes ?? this.sketchNotes,
      submittedStory: submittedStory ?? this.submittedStory,
      feedback: feedback ?? this.feedback,
      leaderboard: leaderboard ?? this.leaderboard,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  @override
  List<Object?> get props => [
        phase,
        storyInputMode,
        prepTimeRemaining,
        observationTimeRemaining,
        writingTimeRemaining,
        imageUrl,
        situationSummary,
        positiveCharacters,
        negativeCharacters,
        neutralCharacters,
        sketchNotes,
        submittedStory,
        feedback,
        leaderboard,
        errorMessage,
      ];
}
