
class OirResultModel {
  final String id;
  final String userId;
  final int score;
  final int totalQuestions;
  final DateTime completedAt;

  OirResultModel({
    required this.id,
    required this.userId,
    required this.score,
    required this.totalQuestions,
    required this.completedAt,
  });

  /// JSON-serializable map for REST API / jsonEncode.
  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'score': score,
      'totalQuestions': totalQuestions,
      'completedAt': completedAt.toIso8601String(),
    };
  }

  factory OirResultModel.fromJson(Map<String, dynamic> json, String documentId) {
    return OirResultModel(
      id: documentId,
      userId: json['userId'] ?? '',
      score: json['score'] ?? 0,
      totalQuestions: json['totalQuestions'] ?? 0,
      completedAt: DateTime.tryParse(json['completedAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}
