import 'package:equatable/equatable.dart';

enum QuestionType { verbal, nonVerbal }

class Question extends Equatable {
  final String id;
  final String text;
  final List<String> options;
  final int correctAnswerIndex;
  final QuestionType type;
  final String? imageUrl;
  final String? explanation;

  const Question({
    required this.id,
    required this.text,
    required this.options,
    required this.correctAnswerIndex,
    required this.type,
    this.imageUrl,
    this.explanation,
  });

  @override
  List<Object?> get props => [
        id,
        text,
        options,
        correctAnswerIndex,
        type,
        imageUrl,
        explanation,
      ];
}
