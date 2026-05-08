import 'package:ssb_ready_app/domain/entities/oir/question.dart';

class QuestionModel extends Question {
  const QuestionModel({
    required super.id,
    required super.text,
    required super.options,
    required super.correctAnswerIndex,
    required super.type,
    super.imageUrl,
    super.explanation,
  });

  factory QuestionModel.fromJson(Map<String, dynamic> json) {
    return QuestionModel(
      id: json['id'] as String,
      text: json['text'] as String,
      options: List<String>.from(json['options'] as List),
      correctAnswerIndex: json['correct_answer_index'] as int,
      type: QuestionType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => QuestionType.verbal,
      ),
      imageUrl: json['image_url'] as String?,
      explanation: json['explanation'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'text': text,
      'options': options,
      'correct_answer_index': correctAnswerIndex,
      'type': type.name,
      'image_url': imageUrl,
      'explanation': explanation,
    };
  }
}
