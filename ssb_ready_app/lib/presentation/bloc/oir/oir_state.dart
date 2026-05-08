import 'package:equatable/equatable.dart';
import 'package:ssb_ready_app/domain/entities/oir/question.dart';

enum OirStatus { initial, loading, inProgress, finished, error }

class OirState extends Equatable {
  final OirStatus status;
  final List<Question> questions;
  final int currentQuestionIndex;
  final int score;
  final int timeRemaining; // in seconds
  final String? errorMessage;

  const OirState({
    this.status = OirStatus.initial,
    this.questions = const [],
    this.currentQuestionIndex = 0,
    this.score = 0,
    this.timeRemaining = 600, // 10 minutes default
    this.errorMessage,
  });

  OirState copyWith({
    OirStatus? status,
    List<Question>? questions,
    int? currentQuestionIndex,
    int? score,
    int? timeRemaining,
    String? errorMessage,
  }) {
    return OirState(
      status: status ?? this.status,
      questions: questions ?? this.questions,
      currentQuestionIndex: currentQuestionIndex ?? this.currentQuestionIndex,
      score: score ?? this.score,
      timeRemaining: timeRemaining ?? this.timeRemaining,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  @override
  List<Object?> get props => [
        status,
        questions,
        currentQuestionIndex,
        score,
        timeRemaining,
        errorMessage,
      ];
}
