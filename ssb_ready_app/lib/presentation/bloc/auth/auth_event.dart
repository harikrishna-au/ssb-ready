part of 'auth_bloc.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

class CheckAuthStatusEvent extends AuthEvent {
  final User? user;

  const CheckAuthStatusEvent({this.user});

  @override
  List<Object?> get props => [user];
}

class SignUpEvent extends AuthEvent {
  final String email;
  final String password;
  final String firstName;
  final String lastName;

  const SignUpEvent({
    required this.email,
    required this.password,
    required this.firstName,
    required this.lastName,
  });

  @override
  List<Object?> get props => [email, password, firstName, lastName];
}

class SignInEvent extends AuthEvent {
  final String email;
  final String password;

  const SignInEvent({
    required this.email,
    required this.password,
  });

  @override
  List<Object?> get props => [email, password];
}

class GoogleSignInEvent extends AuthEvent {
  final String email;
  final String displayName;
  final String photoUrl;

  const GoogleSignInEvent({
    this.email = '',
    this.displayName = '',
    this.photoUrl = '',
  });

  @override
  List<Object?> get props => [email, displayName, photoUrl];
}

class UpdateUserTypeEvent extends AuthEvent {
  final String userId;
  final String userType;

  const UpdateUserTypeEvent({
    required this.userId,
    required this.userType,
  });

  @override
  List<Object?> get props => [userId, userType];
}

class ResetPasswordEvent extends AuthEvent {
  final String email;

  const ResetPasswordEvent({required this.email});

  @override
  List<Object?> get props => [email];
}

class SignOutEvent extends AuthEvent {
  const SignOutEvent();

  @override
  List<Object?> get props => [];
}
