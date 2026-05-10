import 'package:cloud_firestore/cloud_firestore.dart';

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

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'responses': responses,
      'aiFeedback': aiFeedback,
      'completedAt': Timestamp.fromDate(completedAt),
    };
  }

  factory SrtResultModel.fromJson(Map<String, dynamic> json, String documentId) {
    final completedAtRaw = json['completedAt'];
    return SrtResultModel(
      id: documentId,
      userId: json['userId'] ?? '',
      responses: Map<String, String>.from(json['responses'] ?? {}),
      aiFeedback: json['aiFeedback'] ?? '',
      completedAt: completedAtRaw is Timestamp
          ? completedAtRaw.toDate()
          : DateTime.tryParse((completedAtRaw ?? '').toString()) ?? DateTime.now(),
    );
  }
}
