
class PpdtResultModel {
  final String id;
  final String userId;
  final String imageUrl;
  final String userStory;
  final String aiFeedback;
  final DateTime completedAt;

  PpdtResultModel({
    required this.id,
    required this.userId,
    required this.imageUrl,
    required this.userStory,
    required this.aiFeedback,
    required this.completedAt,
  });

  /// JSON-serializable map for REST API / jsonEncode.
  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'imageUrl': imageUrl,
      'userStory': userStory,
      'aiFeedback': aiFeedback,
      'completedAt': completedAt.toIso8601String(),
    };
  }

  factory PpdtResultModel.fromJson(Map<String, dynamic> json, String documentId) {
    return PpdtResultModel(
      id: documentId,
      userId: json['userId'] ?? '',
      imageUrl: json['imageUrl'] ?? '',
      userStory: json['userStory'] ?? '',
      aiFeedback: json['aiFeedback'] ?? '',
      completedAt: DateTime.tryParse(json['completedAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}
