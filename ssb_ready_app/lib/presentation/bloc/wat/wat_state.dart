import 'package:equatable/equatable.dart';

enum WatStatus { initial, loading, inProgress, analyzing, completed, error }

class WatState extends Equatable {
  final WatStatus status;
  final List<String> words;
  final int currentWordIndex;
  final int timeRemaining;
  final Map<String, String> responses;
  final String? feedback;
  final String? errorMessage;

  const WatState({
    this.status = WatStatus.initial,
    this.words = const [],
    this.currentWordIndex = 0,
    this.timeRemaining = 15,
    this.responses = const {},
    this.feedback,
    this.errorMessage,
  });

  String get currentWord => 
      words.isNotEmpty && currentWordIndex < words.length 
          ? words[currentWordIndex] 
          : '';

  WatState copyWith({
    WatStatus? status,
    List<String>? words,
    int? currentWordIndex,
    int? timeRemaining,
    Map<String, String>? responses,
    String? feedback,
    String? errorMessage,
  }) {
    return WatState(
      status: status ?? this.status,
      words: words ?? this.words,
      currentWordIndex: currentWordIndex ?? this.currentWordIndex,
      timeRemaining: timeRemaining ?? this.timeRemaining,
      responses: responses ?? this.responses,
      feedback: feedback ?? this.feedback,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  @override
  List<Object?> get props => [
        status,
        words,
        currentWordIndex,
        timeRemaining,
        responses,
        feedback,
        errorMessage,
      ];
}
