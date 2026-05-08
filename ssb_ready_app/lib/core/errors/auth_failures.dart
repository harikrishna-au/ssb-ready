class AuthFailure implements Exception {
  final String message;

  AuthFailure({required this.message});

  factory AuthFailure.signUpFailed({String? message}) {
    return AuthFailure(
      message: message ?? 'Sign up failed. Please try again.',
    );
  }

  factory AuthFailure.signInFailed({String? message}) {
    return AuthFailure(
      message: message ?? 'Invalid email or password.',
    );
  }

  factory AuthFailure.googleSignInFailed({String? message}) {
    return AuthFailure(
      message: message ?? 'Google sign-in failed. Please try again.',
    );
  }

  factory AuthFailure.signOutFailed({String? message}) {
    return AuthFailure(
      message: message ?? 'Sign out failed. Please try again.',
    );
  }

  factory AuthFailure.emailVerificationFailed({String? message}) {
    return AuthFailure(
      message: message ?? 'Email verification failed.',
    );
  }

  factory AuthFailure.userNotFound() {
    return AuthFailure(
      message: 'User not found.',
    );
  }

  factory AuthFailure.fetchUserFailed({String? message}) {
    return AuthFailure(
      message: message ?? 'Failed to fetch user data.',
    );
  }

  factory AuthFailure.resetPasswordFailed({String? message}) {
    return AuthFailure(
      message: message ?? 'Failed to send password reset email.',
    );
  }

  factory AuthFailure.networkError() {
    return AuthFailure(
      message: 'Network error. Please check your internet connection.',
    );
  }

  factory AuthFailure.sessionExpired() {
    return AuthFailure(
      message: 'Your session has expired. Please sign in again.',
    );
  }

  @override
  String toString() => message;
}
