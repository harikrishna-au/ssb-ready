import 'package:equatable/equatable.dart';

class User extends Equatable {
  final String id;
  final String email;
  final String? firstName;
  final String? lastName;
  final String? profileImageUrl;
  final bool? emailVerified;
  final DateTime? createdAt;
  final String? userType;
  final bool? isPremium;

  const User({
    required this.id,
    required this.email,
    this.firstName,
    this.lastName,
    this.profileImageUrl,
    this.emailVerified,
    this.createdAt,
    this.userType,
    this.isPremium,
  });

  String get fullName => '${firstName ?? ''} ${lastName ?? ''}'.trim();

  @override
  List<Object?> get props => [
        id,
        email,
        firstName,
        lastName,
        profileImageUrl,
        emailVerified,
        createdAt,
        userType,
        isPremium,
      ];
}
