
class TatResultModel {
  final String id;
  final String userId;
  final int imageIndex;
  final String userStory;
  final String aiFeedback;
  final DateTime completedAt;

  TatResultModel({
    required this.id,
    required this.userId,
    required this.imageIndex,
    required this.userStory,
    required this.aiFeedback,
    required this.completedAt,
  });

  /// JSON-serializable map for REST API / jsonEncode.
  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'imageIndex': imageIndex,
      'userStory': userStory,
      'aiFeedback': aiFeedback,
      'completedAt': completedAt.toIso8601String(),
    };
  }

  factory TatResultModel.fromJson(Map<String, dynamic> json, String documentId) {
    return TatResultModel(
      id: documentId,
      userId: json['userId'] ?? '',
      imageIndex: json['imageIndex'] ?? 0,
      userStory: json['userStory'] ?? '',
      aiFeedback: json['aiFeedback'] ?? '',
      completedAt: DateTime.tryParse(json['completedAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}
