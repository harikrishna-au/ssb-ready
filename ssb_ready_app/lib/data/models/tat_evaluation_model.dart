class TatEvaluationModel {
  final String theme;
  final String action;
  final List<String> identifiedOlqs;
  final String feedback;
  final int score;

  TatEvaluationModel({
    required this.theme,
    required this.action,
    required this.identifiedOlqs,
    required this.feedback,
    required this.score,
  });

  factory TatEvaluationModel.fromJson(Map<String, dynamic> json) {
    return TatEvaluationModel(
      theme: json['theme'] ?? '',
      action: json['action'] ?? '',
      identifiedOlqs: List<String>.from(json['identified_olqs'] ?? []),
      feedback: json['feedback'] ?? '',
      score: json['score'] ?? 0,
    );
  }

  String toMarkdown() {
    final buffer = StringBuffer();
    buffer.writeln('### AI Assessment (TAT)');
    buffer.writeln('**Score:** $score/10');
    buffer.writeln();
    buffer.writeln('#### Theme');
    buffer.writeln(theme);
    buffer.writeln();
    buffer.writeln('#### Action Analysis');
    buffer.writeln(action);
    buffer.writeln();
    buffer.writeln('#### Demonstrated OLQs');
    if (identifiedOlqs.isEmpty) {
      buffer.writeln('- None clearly identified.');
    } else {
      for (var olq in identifiedOlqs) {
        buffer.writeln('- $olq');
      }
    }
    buffer.writeln();
    buffer.writeln('#### Feedback');
    buffer.writeln(feedback);
    return buffer.toString();
  }
}
