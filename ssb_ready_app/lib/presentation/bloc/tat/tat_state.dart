import 'package:equatable/equatable.dart';
import 'package:ssb_ready_app/core/enums/story_input_mode.dart';

enum TatPhase {
  initial,
  waitingPictureConsent,
  modeSelection,
  prep,
  observing,
  perceptionCapture,
  writing,
  analyzing,
  completed,
}

class TatState extends Equatable {
  final TatPhase phase;
  final StoryInputMode storyInputMode;
  final int prepTimeRemaining;
  final int currentImageIndex;
  final int totalImages;
  final int observationTimeRemaining;
  final int writingTimeRemaining;
  final String situationSummary;
  final int positiveCharacters;
  final int negativeCharacters;
  final int neutralCharacters;
  final String sketchNotes;
  final String submittedStory;
  final String? feedback;
  final List<Map<String, dynamic>> leaderboard;
  final String? errorMessage;

  const TatState({
    this.phase = TatPhase.initial,
    this.storyInputMode = StoryInputMode.typing,
    this.prepTimeRemaining = 30,
    this.currentImageIndex = 0,
    this.totalImages = 5,
    this.observationTimeRemaining = 30,
    this.writingTimeRemaining = 180,
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

  static const List<String> imageDescriptions = [
    'A group of people are standing near a river bank. One person appears to be pointing towards the water while others look concerned.',
    'A young man sits alone at a desk in a dimly lit room, with papers scattered around him and a clock on the wall showing midnight.',
    'Two people are shaking hands in front of a large building, while a third person watches from a distance with folded arms.',
    'A person in uniform is walking through a forest trail carrying a heavy backpack, with storm clouds gathering overhead.',
    'A family is gathered around a dining table. The elderly person at the head of the table appears to be making an announcement.',
  ];

  String get currentImageDescription =>
      currentImageIndex < imageDescriptions.length
          ? imageDescriptions[currentImageIndex]
          : '';

  TatState copyWith({
    TatPhase? phase,
    StoryInputMode? storyInputMode,
    int? prepTimeRemaining,
    int? currentImageIndex,
    int? totalImages,
    int? observationTimeRemaining,
    int? writingTimeRemaining,
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
    return TatState(
      phase: phase ?? this.phase,
      storyInputMode: storyInputMode ?? this.storyInputMode,
      prepTimeRemaining: prepTimeRemaining ?? this.prepTimeRemaining,
      currentImageIndex: currentImageIndex ?? this.currentImageIndex,
      totalImages: totalImages ?? this.totalImages,
      observationTimeRemaining: observationTimeRemaining ?? this.observationTimeRemaining,
      writingTimeRemaining: writingTimeRemaining ?? this.writingTimeRemaining,
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
        currentImageIndex,
        totalImages,
        observationTimeRemaining,
        writingTimeRemaining,
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
