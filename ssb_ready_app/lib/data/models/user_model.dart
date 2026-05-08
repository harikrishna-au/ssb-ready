import 'dart:convert';
import 'package:ssb_ready_app/domain/entities/user.dart';

class UserModel extends User {
  final DateTime? updatedAt;
  final bool? isPremium;

  const UserModel({
    required super.id,
    required super.email,
    super.firstName,
    super.lastName,
    super.profileImageUrl,
    super.emailVerified,
    super.createdAt,
    super.userType,
    this.updatedAt,
    this.isPremium,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      email: json['email'] ?? '',
      firstName: json['firstName'],
      lastName: json['lastName'],
      profileImageUrl: json['profileImageUrl'],
      emailVerified: json['emailVerified'] ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : null,
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'])
          : null,
      userType: json['userType'],
      isPremium: json['isPremium'] ?? false,
    );
  }

  factory UserModel.fromUser(User user) {
    return UserModel(
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      userType: user.userType,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'firstName': firstName,
      'lastName': lastName,
      'profileImageUrl': profileImageUrl,
      'emailVerified': emailVerified,
      'createdAt': createdAt?.toIso8601String(),
      'userType': userType,
    };
  }

  String toJsonString() {
    return jsonEncode(toJson());
  }

  UserModel copyWith({
    String? id,
    String? email,
    String? firstName,
    String? lastName,
    String? profileImageUrl,
    bool? emailVerified,
    DateTime? createdAt,
    String? userType,
  }) {
    return UserModel(
      id: id ?? this.id,
      email: email ?? this.email,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      profileImageUrl: profileImageUrl ?? this.profileImageUrl,
      emailVerified: emailVerified ?? this.emailVerified,
      createdAt: createdAt ?? this.createdAt,
      userType: userType ?? this.userType,
    );
  }
}
