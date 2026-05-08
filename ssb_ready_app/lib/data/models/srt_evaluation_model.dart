class SrtEvaluationModel {
  final List<String> identifiedOlqs;
  final String overallFeedback;
  final int score;

  SrtEvaluationModel({
    required this.identifiedOlqs,
    required this.overallFeedback,
    required this.score,
  });

  factory SrtEvaluationModel.fromJson(Map<String, dynamic> json) {
    return SrtEvaluationModel(
      identifiedOlqs: List<String>.from(json['identified_olqs'] ?? []),
      overallFeedback: json['feedback'] ?? '',
      score: json['score'] ?? 0,
    );
  }

  String toMarkdown() {
    final buffer = StringBuffer();
    buffer.writeln('### AI Assessment (SRT)');
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
