import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:ssb_ready_app/core/errors/auth_failures.dart';
import 'package:ssb_ready_app/core/services/rate_limiter.dart';
import 'package:ssb_ready_app/core/services/session_manager.dart';
import 'package:ssb_ready_app/domain/entities/user.dart';
import 'package:ssb_ready_app/domain/repositories/auth_repository.dart';

part 'auth_event.dart';
part 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository _authRepository;
  StreamSubscription<SessionStatus>? _sessionSub;

  AuthBloc(this._authRepository) : super(const AuthInitial()) {
    on<CheckAuthStatusEvent>(_onCheckAuthStatus);
    on<SignUpEvent>(_onSignUp);
    on<SignInEvent>(_onSignIn);
    on<GoogleSignInEvent>(_onGoogleSignIn);
    on<UpdateUserTypeEvent>(_onUpdateUserType);
    on<ResetPasswordEvent>(_onResetPassword);
    on<SignOutEvent>(_onSignOut);
    on<SessionExpiredEvent>(_onSessionExpired);

    // Subscribe to Firebase session lifecycle events.
    // signedOut / expired → force the user back to the login screen.
    _sessionSub = SessionManager.instance.statusStream.listen((status) {
      if (status == SessionStatus.signedOut ||
          status == SessionStatus.expired) {
        add(const SessionExpiredEvent());
      }
    });
  }

  @override
  Future<void> close() {
    _sessionSub?.cancel();
    return super.close();
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  Future<void> _onCheckAuthStatus(
    CheckAuthStatusEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());
    try {
      final user = await _authRepository.getCurrentUser();
      if (user != null) {
        emit(AuthAuthenticated(user: user));
      } else {
        emit(const AuthUnauthenticated());
      }
    } catch (_) {
      // Treat startup errors as logged-out so the login screen appears.
      emit(const AuthUnauthenticated());
    }
  }

  Future<void> _onSignUp(
    SignUpEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());
    try {
      // Rate limit: 3 sign-ups per hour (device-wide)
      final rlResult = await RateLimiter.checkAsync(
        key: 'signup',
        maxAttempts: RateLimiter.signUpMaxAttempts,
        window:      RateLimiter.signUpWindow,
      );
      if (!rlResult.allowed) {
        emit(AuthRateLimited(
          resetIn: rlResult.resetIn,
          reason:  'Too many sign-up attempts',
        ));
        return;
      }

      final user = await _authRepository.signUp(
        email:     event.email,
        password:  event.password,
        firstName: event.firstName,
        lastName:  event.lastName,
      );

      // Success → clear the rate limit counter
      await RateLimiter.resetAsync(key: 'signup');

      emit(AuthAuthenticated(user: user));
    } on AuthFailure catch (f) {
      emit(AuthFailureState(failure: f));
    } catch (e) {
      debugPrint('SignUp Error: $e');
      emit(AuthFailureState(
        failure: AuthFailure.signUpFailed(message: e.toString()),
      ));
    }
  }

  Future<void> _onSignIn(
    SignInEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());
    try {
      // Rate limit: 5 attempts per 15 minutes, keyed by email fingerprint
      final rlKey    = RateLimiter.emailKey('login', event.email);
      final rlResult = await RateLimiter.checkAsync(
        key:         rlKey,
        maxAttempts: RateLimiter.loginMaxAttempts,
        window:      RateLimiter.loginWindow,
      );
      if (!rlResult.allowed) {
        emit(AuthRateLimited(
          resetIn: rlResult.resetIn,
          reason:  'Too many login attempts',
        ));
        return;
      }

      final user = await _authRepository.signIn(
        email:    event.email,
        password: event.password,
      );

      // Success → reset this email's attempt counter
      await RateLimiter.resetAsync(key: rlKey);

      emit(AuthAuthenticated(user: user));
    } on AuthFailure catch (f) {
      // Wrong password etc. — the attempt was already counted by the RL check
      emit(AuthFailureState(failure: f));
    } catch (e) {
      emit(AuthFailureState(failure: AuthFailure.signInFailed()));
    }
  }

  Future<void> _onGoogleSignIn(
    GoogleSignInEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());
    try {
      // Rate limit: 5 attempts per 15 minutes (device-wide for Google)
      final rlResult = await RateLimiter.checkAsync(
        key:         'google_signin',
        maxAttempts: RateLimiter.loginMaxAttempts,
        window:      RateLimiter.loginWindow,
      );
      if (!rlResult.allowed) {
        emit(AuthRateLimited(
          resetIn: rlResult.resetIn,
          reason:  'Too many sign-in attempts',
        ));
        return;
      }

      final user = await _authRepository.googleSignIn(
        email:       '',
        displayName: '',
        photoUrl:    '',
      );

      await RateLimiter.resetAsync(key: 'google_signin');

      emit(AuthAuthenticated(user: user));
    } on AuthFailure catch (f) {
      debugPrint('Google SignIn Error: $f');
      emit(AuthFailureState(failure: f));
    } catch (e) {
      debugPrint('Google SignIn Error: $e');
      emit(AuthFailureState(
        failure: AuthFailure.googleSignInFailed(message: e.toString()),
      ));
    }
  }

  Future<void> _onUpdateUserType(
    UpdateUserTypeEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());
    try {
      await _authRepository.updateUserType(event.userId, event.userType);
      final updatedUser = await _authRepository.getCurrentUser();
      if (updatedUser == null) {
        emit(const AuthUnauthenticated());
        return;
      }
      emit(AuthAuthenticated(user: updatedUser));
    } catch (e) {
      emit(AuthFailureState(
        failure: AuthFailure.fetchUserFailed(message: e.toString()),
      ));
    }
  }

  Future<void> _onResetPassword(
    ResetPasswordEvent event,
    Emitter<AuthState> emit,
  ) async {
    try {
      // Rate limit: 3 reset requests per 10 minutes
      final rlResult = await RateLimiter.checkAsync(
        key:         'password_reset',
        maxAttempts: RateLimiter.passwordResetMax,
        window:      RateLimiter.passwordResetWindow,
      );
      if (!rlResult.allowed) {
        emit(AuthRateLimited(
          resetIn: rlResult.resetIn,
          reason:  'Too many password reset requests',
        ));
        return;
      }

      await _authRepository.resetPassword(event.email);

      final currentUser = await _authRepository.getCurrentUser();
      if (currentUser != null) {
        emit(AuthAuthenticated(user: currentUser));
      } else {
        emit(const AuthUnauthenticated());
      }
    } on AuthFailure catch (f) {
      emit(AuthFailureState(failure: f));
    } catch (e) {
      emit(AuthFailureState(
        failure: AuthFailure.resetPasswordFailed(message: e.toString()),
      ));
    }
  }

  Future<void> _onSignOut(
    SignOutEvent event,
    Emitter<AuthState> emit,
  ) async {
    try {
      await _authRepository.signOut();
      emit(const AuthUnauthenticated());
    } catch (_) {
      emit(AuthFailureState(failure: AuthFailure.signOutFailed()));
    }
  }

  /// Handles forced sign-out triggered by [SessionManager] (token revoked,
  /// password changed on another device, account disabled, etc.).
  Future<void> _onSessionExpired(
    SessionExpiredEvent event,
    Emitter<AuthState> emit,
  ) async {
    // Only act if we were previously authenticated; ignore during bootstrap
    // (SessionManager may emit signedOut before CheckAuthStatus resolves).
    if (state is! AuthAuthenticated) return;

    debugPrint('🔐 AuthBloc: session expired — forcing sign-out');
    try {
      await _authRepository.signOut();
    } catch (_) {
      // Best-effort; even if signOut fails we still emit the expired state
    }
    emit(const AuthSessionExpired());
  }
}
