class WatEvaluationModel {
  final List<String> identifiedOlqs;
  final String overallFeedback;
  final int score;

  WatEvaluationModel({
    required this.identifiedOlqs,
    required this.overallFeedback,
    required this.score,
  });

  factory WatEvaluationModel.fromJson(Map<String, dynamic> json) {
    return WatEvaluationModel(
      identifiedOlqs: List<String>.from(json['identified_olqs'] ?? []),
      overallFeedback: json['feedback'] ?? '',
      score: json['score'] ?? 0,
    );
  }

  String toMarkdown() {
    final buffer = StringBuffer();
    buffer.writeln('### AI Assessment (WAT)');
    buffer.writeln('**Score:** $score/10');
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
    buffer.writeln(overallFeedback);
    return buffer.toString();
  }
}
