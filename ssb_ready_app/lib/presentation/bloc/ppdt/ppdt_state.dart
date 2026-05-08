import 'package:equatable/equatable.dart';

enum PpdtPhase { initial, observing, writing, analyzing, completed }

class PpdtState extends Equatable {
  final PpdtPhase phase;
  final int observationTimeRemaining; // 30 seconds
  final int writingTimeRemaining; // 4 minutes (240 seconds)
  final String imageUrl;
  final String submittedStory;
  final String? feedback;
  final String? errorMessage;

  const PpdtState({
    this.phase = PpdtPhase.initial,
    this.observationTimeRemaining = 30,
    this.writingTimeRemaining = 240,
    this.imageUrl = 'https://picsum.photos/800/600?grayscale&blur=2', // Placeholder hazy image
    this.submittedStory = '',
    this.feedback,
    this.errorMessage,
  });

  PpdtState copyWith({
    PpdtPhase? phase,
    int? observationTimeRemaining,
    int? writingTimeRemaining,
    String? imageUrl,
    String? submittedStory,
    String? feedback,
    String? errorMessage,
  }) {
    return PpdtState(
      phase: phase ?? this.phase,
      observationTimeRemaining: observationTimeRemaining ?? this.observationTimeRemaining,
      writingTimeRemaining: writingTimeRemaining ?? this.writingTimeRemaining,
      imageUrl: imageUrl ?? this.imageUrl,
      submittedStory: submittedStory ?? this.submittedStory,
      feedback: feedback ?? this.feedback,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  @override
  List<Object?> get props => [
        phase,
        observationTimeRemaining,
        writingTimeRemaining,
        imageUrl,
        submittedStory,
        feedback,
        errorMessage,
      ];
}
