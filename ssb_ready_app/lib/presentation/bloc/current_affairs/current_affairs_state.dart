part of 'current_affairs_bloc.dart';

enum CaQuizStatus { loading, inProgress, answered, completed, alreadyDone }

class CaQuestion {
  final String question;
  final List<String> options;
  final int correctIndex;
  final String explanation;

  const CaQuestion({
    required this.question,
    required this.options,
    required this.correctIndex,
    required this.explanation,
  });
}

class CurrentAffairsState {
  final CaQuizStatus status;
  final List<CaQuestion> questions;
  final int currentIndex;
  final int? selectedIndex;
  final int score;
  final String dateLabel; // e.g. "7 Jun 2026"

  const CurrentAffairsState({
    this.status = CaQuizStatus.loading,
    this.questions = const [],
    this.currentIndex = 0,
    this.selectedIndex,
    this.score = 0,
    this.dateLabel = '',
  });

  CaQuestion? get currentQuestion =>
      currentIndex < questions.length ? questions[currentIndex] : null;

  bool get isCorrect =>
      selectedIndex != null &&
      selectedIndex == currentQuestion?.correctIndex;

  CurrentAffairsState copyWith({
    CaQuizStatus? status,
    List<CaQuestion>? questions,
    int? currentIndex,
    int? selectedIndex,
    int? score,
    String? dateLabel,
    bool clearSelected = false,
  }) =>
      CurrentAffairsState(
        status: status ?? this.status,
        questions: questions ?? this.questions,
        currentIndex: currentIndex ?? this.currentIndex,
        selectedIndex: clearSelected ? null : (selectedIndex ?? this.selectedIndex),
        score: score ?? this.score,
        dateLabel: dateLabel ?? this.dateLabel,
      );
}
