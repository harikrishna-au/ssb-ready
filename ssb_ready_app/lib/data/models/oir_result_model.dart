import 'package:cloud_firestore/cloud_firestore.dart';

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

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'score': score,
      'totalQuestions': totalQuestions,
      'completedAt': Timestamp.fromDate(completedAt),
    };
  }

  factory OirResultModel.fromJson(Map<String, dynamic> json, String documentId) {
    return OirResultModel(
      id: documentId,
      userId: json['userId'] ?? '',
      score: json['score'] ?? 0,
      totalQuestions: json['totalQuestions'] ?? 0,
      completedAt: (json['completedAt'] as Timestamp).toDate(),
    );
  }
}
