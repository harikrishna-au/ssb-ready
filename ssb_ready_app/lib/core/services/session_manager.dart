import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

// ─── Session status ───────────────────────────────────────────────────────────

enum SessionStatus {
  /// Firebase user is present and their ID token is fresh.
  active,

  /// The ID token was refreshed (happens every ~55 minutes automatically).
  tokenRefreshed,

  /// The user signed out explicitly (local or remote) or the token was revoked
  /// (e.g. password changed from another device, account disabled).
  signedOut,

  /// A token error was received — treat as an implicit sign-out.
  expired,
}

// ─── Session Manager ──────────────────────────────────────────────────────────

/// Singleton that translates Firebase Auth's real-time streams into a single
/// [statusStream] the rest of the app can subscribe to.
///
/// ### Wiring
/// ```dart
/// // In AuthBloc constructor:
/// SessionManager.instance.statusStream.listen((status) {
///   if (status == SessionStatus.signedOut || status == SessionStatus.expired) {
///     add(const SessionExpiredEvent());
///   }
/// });
/// ```
///
/// ### Two Firebase streams explained
/// | Stream | Fires when |
/// |---|---|
/// | `authStateChanges()` | sign-in / sign-out only |
/// | `idTokenChanges()` | sign-in / sign-out / token refresh / token revocation |
///
/// We use both so that:
/// - Sign-out (including forced from another device) → [SessionStatus.signedOut]
/// - Token refresh (silent, ~hourly) → [SessionStatus.tokenRefreshed]
/// - Token revocation / error → [SessionStatus.expired]
class SessionManager {
  SessionManager._();

  // Singleton
  static final SessionManager instance = SessionManager._();

  // ─── Public stream ───────────────────────────────────────────────────────

  final _controller = StreamController<SessionStatus>.broadcast();

  /// Subscribe to receive [SessionStatus] events. The stream is broadcast,
  /// so multiple listeners are supported with no problem.
  Stream<SessionStatus> get statusStream => _controller.stream;

  // ─── Internal state ──────────────────────────────────────────────────────

  StreamSubscription<User?>? _authSub;
  StreamSubscription<User?>? _tokenSub;

  bool _initialized   = false;
  bool _userWasActive = false; // tracks whether we had an active user before

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  /// Call once from [AppLoader._bootstrap] **after** Firebase is initialised.
  /// Safe to call again — subsequent calls are no-ops.
  void initialize() {
    if (_initialized) return;
    _initialized = true;

    // 1. authStateChanges — coarse sign-in / sign-out boundary
    _authSub = FirebaseAuth.instance.authStateChanges().listen(
      (user) {
        if (user == null) {
          if (_userWasActive) {
            debugPrint('🔐 Session: signed out');
            _emit(SessionStatus.signedOut);
          }
          _userWasActive = false;
        } else {
          debugPrint('🔐 Session: active (uid=${user.uid})');
          _userWasActive = true;
          _emit(SessionStatus.active);
        }
      },
      onError: (Object e) {
        debugPrint('🔐 Session authState error: $e');
        _emit(SessionStatus.expired);
      },
    );

    // 2. idTokenChanges — catches token refresh AND revocation
    _tokenSub = FirebaseAuth.instance.idTokenChanges().listen(
      (user) {
        if (user != null && _userWasActive) {
          // Fired after the first authStateChanges active event → token refresh
          debugPrint('🔐 Session: ID token refreshed');
          _emit(SessionStatus.tokenRefreshed);
        } else if (user == null && _userWasActive) {
          // Token disappeared while we had an active user → revocation
          debugPrint('🔐 Session: token lost while active → expired');
          _emit(SessionStatus.expired);
        }
      },
      onError: (Object e) {
        debugPrint('🔐 Session token error: $e');
        if (_userWasActive) _emit(SessionStatus.expired);
      },
    );

    debugPrint('✓ SessionManager initialised');
  }

  /// Cancels all subscriptions and closes the stream.
  /// Call from [AppLoader] if the app is being torn down (rare on mobile).
  void dispose() {
    _authSub?.cancel();
    _tokenSub?.cancel();
    if (!_controller.isClosed) _controller.close();
    _initialized = false;
    _userWasActive = false;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  void _emit(SessionStatus status) {
    if (!_controller.isClosed) _controller.add(status);
  }
}
