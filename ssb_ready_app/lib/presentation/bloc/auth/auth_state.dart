part of 'auth_bloc.dart';

abstract class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object?> get props => [];
}

class AuthInitial extends AuthState {
  const AuthInitial();
}

class AuthLoading extends AuthState {
  const AuthLoading();
}

class AuthAuthenticated extends AuthState {
  final User user;

  const AuthAuthenticated({required this.user});

  @override
  List<Object?> get props => [user];
}

class AuthUnauthenticated extends AuthState {
  const AuthUnauthenticated();
}

class AuthFailureState extends AuthState {
  final AuthFailure failure;

  const AuthFailureState({required this.failure});

  @override
  List<Object?> get props => [failure];
}

/// Emitted when too many auth attempts are made.
/// The UI should show a countdown and disable inputs until [lockedUntil].
class AuthRateLimited extends AuthState {
  /// Absolute [DateTime] when the lockout expires.
  final DateTime lockedUntil;

  /// Human-readable reason, e.g. "Too many login attempts".
  final String reason;

  AuthRateLimited({required Duration resetIn, required this.reason})
      : lockedUntil = DateTime.now().add(resetIn);

  /// Seconds remaining until [lockedUntil]. Returns 0 when expired.
  int get secondsRemaining {
    final diff = lockedUntil.difference(DateTime.now()).inSeconds;
    return diff < 0 ? 0 : diff;
  }

  @override
  List<Object?> get props => [lockedUntil, reason];
}

/// Emitted when the Firebase session is lost while the user was active
/// (token revoked, password changed from another device, account disabled).
/// The app should navigate to login and show an explanatory snackbar.
class AuthSessionExpired extends AuthState {
  const AuthSessionExpired();
}
