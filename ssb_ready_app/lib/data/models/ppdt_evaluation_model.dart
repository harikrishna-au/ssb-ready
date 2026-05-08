class PpdtEvaluationModel {
  final String theme;
  final String action;
  final List<String> identifiedOlqs;
  final String feedback;
  final double score; // 1 to 10

  PpdtEvaluationModel({
    required this.theme,
    required this.action,
    required this.identifiedOlqs,
    required this.feedback,
    required this.score,
  });

  factory PpdtEvaluationModel.fromJson(Map<String, dynamic> json) {
    return PpdtEvaluationModel(
      theme: json['theme'] as String? ?? 'Neutral',
      action: json['action'] as String? ?? 'No action defined.',
      identifiedOlqs: (json['identified_olqs'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      feedback: json['feedback'] as String? ?? 'No feedback provided.',
      score: (json['score'] as num?)?.toDouble() ?? 5.0,
    );
  }

  /// Converts the evaluation into a nice Markdown string for the UI
  String toMarkdown() {
    final olqList = identifiedOlqs.isNotEmpty 
        ? identifiedOlqs.map((olq) => '- $olq').join('\n')
        : '- None clearly identified.';
        
    return '''
### Story Analysis
**Theme**: $theme
**Action Taken**: $action

### Identified Officer Like Qualities (OLQs)
$olqList

### Detailed Feedback
$feedback

**Overall Score**: ${score.toStringAsFixed(1)}/10
''';
  }
}
