
class SrtResultModel {
  final String id;
  final String userId;
  final Map<String, String> responses; // situation -> reaction
  final String aiFeedback;
  final DateTime completedAt;

  SrtResultModel({
    required this.id,
    required this.userId,
    required this.responses,
    required this.aiFeedback,
    required this.completedAt,
  });

  /// JSON-serializable map for REST API / jsonEncode.
  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'responses': responses,
      'aiFeedback': aiFeedback,
      'completedAt': completedAt.toIso8601String(),
    };
  }

  factory SrtResultModel.fromJson(Map<String, dynamic> json, String documentId) {
    return SrtResultModel(
      id: documentId,
      userId: json['userId'] ?? '',
      responses: Map<String, String>.from(json['responses'] ?? {}),
      aiFeedback: json['aiFeedback'] ?? '',
      completedAt: DateTime.tryParse(json['completedAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}
