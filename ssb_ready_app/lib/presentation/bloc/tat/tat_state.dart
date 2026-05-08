import 'package:equatable/equatable.dart';

enum TatPhase { initial, observing, writing, analyzing, completed }

class TatState extends Equatable {
  final TatPhase phase;
  final int currentImageIndex;
  final int totalImages;
  final int observationTimeRemaining; // 30 seconds
  final int writingTimeRemaining; // 240 seconds (4 min)
  final String submittedStory;
  final String? feedback;
  final String? errorMessage;

  const TatState({
    this.phase = TatPhase.initial,
    this.currentImageIndex = 0,
    this.totalImages = 1,
    this.observationTimeRemaining = 30,
    this.writingTimeRemaining = 240,
    this.submittedStory = '',
    this.feedback,
    this.errorMessage,
  });

  // TAT uses descriptive text prompts instead of actual images
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
    int? currentImageIndex,
    int? totalImages,
    int? observationTimeRemaining,
    int? writingTimeRemaining,
    String? submittedStory,
    String? feedback,
    String? errorMessage,
  }) {
    return TatState(
      phase: phase ?? this.phase,
      currentImageIndex: currentImageIndex ?? this.currentImageIndex,
      totalImages: totalImages ?? this.totalImages,
      observationTimeRemaining: observationTimeRemaining ?? this.observationTimeRemaining,
      writingTimeRemaining: writingTimeRemaining ?? this.writingTimeRemaining,
      submittedStory: submittedStory ?? this.submittedStory,
      feedback: feedback ?? this.feedback,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  @override
  List<Object?> get props => [
        phase,
        currentImageIndex,
        totalImages,
        observationTimeRemaining,
        writingTimeRemaining,
        submittedStory,
        feedback,
        errorMessage,
      ];
}
