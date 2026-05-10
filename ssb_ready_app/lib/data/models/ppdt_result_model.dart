import 'package:cloud_firestore/cloud_firestore.dart';

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

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'imageUrl': imageUrl,
      'userStory': userStory,
      'aiFeedback': aiFeedback,
      'completedAt': Timestamp.fromDate(completedAt),
    };
  }

  factory PpdtResultModel.fromJson(Map<String, dynamic> json, String documentId) {
    final completedAtRaw = json['completedAt'];
    return PpdtResultModel(
      id: documentId,
      userId: json['userId'] ?? '',
      imageUrl: json['imageUrl'] ?? '',
      userStory: json['userStory'] ?? '',
      aiFeedback: json['aiFeedback'] ?? '',
      completedAt: completedAtRaw is Timestamp
          ? completedAtRaw.toDate()
          : DateTime.tryParse((completedAtRaw ?? '').toString()) ?? DateTime.now(),
    );
  }
}
