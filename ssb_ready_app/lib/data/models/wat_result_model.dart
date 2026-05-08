import 'package:cloud_firestore/cloud_firestore.dart';

class WatResultModel {
  final String id;
  final String userId;
  final Map<String, String> responses; // word -> sentence
  final String aiFeedback;
  final DateTime completedAt;

  WatResultModel({
    required this.id,
    required this.userId,
    required this.responses,
    required this.aiFeedback,
    required this.completedAt,
  });

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'responses': responses,
      'aiFeedback': aiFeedback,
      'completedAt': Timestamp.fromDate(completedAt),
    };
  }

  factory WatResultModel.fromJson(Map<String, dynamic> json, String documentId) {
    return WatResultModel(
      id: documentId,
      userId: json['userId'] ?? '',
      responses: Map<String, String>.from(json['responses'] ?? {}),
      aiFeedback: json['aiFeedback'] ?? '',
      completedAt: (json['completedAt'] as Timestamp).toDate(),
    );
  }
}
