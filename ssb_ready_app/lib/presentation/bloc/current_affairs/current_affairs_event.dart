part of 'current_affairs_bloc.dart';

abstract class CurrentAffairsEvent {}

/// Load today's quiz (checks if already done today).
class LoadDailyQuiz extends CurrentAffairsEvent {}

/// User selects an answer for the current question.
class AnswerQuestion extends CurrentAffairsEvent {
  final int selectedIndex;
  AnswerQuestion(this.selectedIndex);
}

/// Advance to next question after answer shown.
class NextQuestion extends CurrentAffairsEvent {}
