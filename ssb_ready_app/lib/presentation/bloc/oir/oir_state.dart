import 'package:equatable/equatable.dart';
import 'package:ssb_ready_app/domain/entities/oir/question.dart';

enum OirStatus { initial, loading, inProgress, analyzing, finished, error }

const Object _feedbackUnset = Object();

class OirState extends Equatable {
  final OirStatus status;
  final List<Question> questions;
  final int currentQuestionIndex;
  final int score;
  final int timeRemaining; // in seconds
  final String? errorMessage;
  /// Populated after `/api/evaluation/run` (OIR) completes.
  final String? feedbackMarkdown;

  const OirState({
    this.status = OirStatus.initial,
    this.questions = const [],
    this.currentQuestionIndex = 0,
    this.score = 0,
    this.timeRemaining = 600,
    this.errorMessage,
    this.feedbackMarkdown,
  });

  OirState copyWith({
    OirStatus? status,
    List<Question>? questions,
    int? currentQuestionIndex,
    int? score,
    int? timeRemaining,
    String? errorMessage,
    Object? feedbackMarkdown = _feedbackUnset,
  }) {
    return OirState(
      status: status ?? this.status,
      questions: questions ?? this.questions,
      currentQuestionIndex: currentQuestionIndex ?? this.currentQuestionIndex,
      score: score ?? this.score,
      timeRemaining: timeRemaining ?? this.timeRemaining,
      errorMessage: errorMessage ?? this.errorMessage,
      feedbackMarkdown: feedbackMarkdown == _feedbackUnset
          ? this.feedbackMarkdown
          : feedbackMarkdown as String?,
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
        feedbackMarkdown,
      ];
}
