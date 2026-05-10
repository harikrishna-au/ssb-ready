import 'package:equatable/equatable.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:ssb_ready_app/core/errors/auth_failures.dart';
import 'package:ssb_ready_app/domain/entities/user.dart';
import 'package:ssb_ready_app/domain/repositories/auth_repository.dart';

part 'auth_event.dart';
part 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository _authRepository;

  AuthBloc(this._authRepository) : super(const AuthInitial()) {
    on<CheckAuthStatusEvent>(_onCheckAuthStatus);
    on<SignUpEvent>(_onSignUp);
    on<SignInEvent>(_onSignIn);
    on<GoogleSignInEvent>(_onGoogleSignIn);
    on<UpdateUserTypeEvent>(_onUpdateUserType);
    on<ResetPasswordEvent>(_onResetPassword);
    on<SignOutEvent>(_onSignOut);
  }

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
    } catch (e) {
      // Treat startup session errors as logged out so routing can show login.
      emit(const AuthUnauthenticated());
    }
  }

  Future<void> _onSignUp(
    SignUpEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());
    try {
      final user = await _authRepository.signUp(
        email: event.email,
        password: event.password,
        firstName: event.firstName,
        lastName: event.lastName,
      );
      emit(AuthAuthenticated(user: user));
    } catch (e) {
      debugPrint('SignUp Error: $e');
      emit(AuthFailureState(
        failure: AuthFailure.signUpFailed(
          message: e.toString(),
        ),
      ));
    }
  }

  Future<void> _onSignIn(
    SignInEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());
    try {
      final user = await _authRepository.signIn(
        email: event.email,
        password: event.password,
      );
      emit(AuthAuthenticated(user: user));
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
      final user = await _authRepository.googleSignIn(
        email: '',
        displayName: '',
        photoUrl: '',
      );
      emit(AuthAuthenticated(user: user));
    } catch (e) {
      debugPrint('Google SignIn Error: $e');
      emit(
        AuthFailureState(
          failure: AuthFailure.googleSignInFailed(
            message: e.toString(),
          ),
        ),
      );
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
      emit(
        AuthFailureState(
          failure: AuthFailure.fetchUserFailed(message: e.toString()),
        ),
      );
    }
  }

  Future<void> _onResetPassword(
    ResetPasswordEvent event,
    Emitter<AuthState> emit,
  ) async {
    try {
      await _authRepository.resetPassword(event.email);
      // Keep user in the same auth state while surfacing operation success.
      final currentUser = await _authRepository.getCurrentUser();
      if (currentUser != null) {
        emit(AuthAuthenticated(user: currentUser));
      } else {
        emit(const AuthUnauthenticated());
      }
    } catch (e) {
      emit(
        AuthFailureState(
          failure: AuthFailure.resetPasswordFailed(message: e.toString()),
        ),
      );
    }
  }

  Future<void> _onSignOut(
    SignOutEvent event,
    Emitter<AuthState> emit,
  ) async {
    try {
      await _authRepository.signOut();
      emit(const AuthUnauthenticated());
    } catch (e) {
      emit(AuthFailureState(failure: AuthFailure.signOutFailed()));
    }
  }
}
