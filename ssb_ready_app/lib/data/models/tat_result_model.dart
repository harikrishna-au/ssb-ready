import 'package:cloud_firestore/cloud_firestore.dart';

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

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'imageIndex': imageIndex,
      'userStory': userStory,
      'aiFeedback': aiFeedback,
      'completedAt': Timestamp.fromDate(completedAt),
    };
  }

  factory TatResultModel.fromJson(Map<String, dynamic> json, String documentId) {
    return TatResultModel(
      id: documentId,
      userId: json['userId'] ?? '',
      imageIndex: json['imageIndex'] ?? 0,
      userStory: json['userStory'] ?? '',
      aiFeedback: json['aiFeedback'] ?? '',
      completedAt: (json['completedAt'] as Timestamp).toDate(),
    );
  }
}
