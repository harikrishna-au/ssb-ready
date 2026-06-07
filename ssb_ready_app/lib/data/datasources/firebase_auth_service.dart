import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/widgets.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:ssb_ready_app/core/services/supabase_service.dart';
import 'package:ssb_ready_app/core/errors/auth_failures.dart';
import 'package:ssb_ready_app/data/models/user_model.dart';
import 'package:ssb_ready_app/data/datasources/auth_service.dart';

/// Firebase Auth handles all authentication.
/// Supabase Postgres stores all user data (profiles, history, PIQ).
class FirebaseAuthService implements AuthService {
  final SharedPreferences _prefs;
  final FirebaseAuth _firebaseAuth = FirebaseAuth.instance;
  final GoogleSignIn _googleSignIn = GoogleSignIn.instance;

  static const String _userCacheKey = 'cached_user';
  static const List<String> _googleScopes = <String>['email', 'profile'];

  /// Lazy init so Google Credential Manager doesn't block first paint.
  Future<void>? _googleSignInInit;

  FirebaseAuthService(this._prefs);

  // ─── Public API ─────────────────────────────────────────────────────────────

  @override
  Future<UserModel> signUp({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
  }) async {
    if (email.isEmpty || password.isEmpty) {
      throw AuthFailure.signUpFailed(message: 'Email and password are required.');
    }
    try {
      final cred = await _firebaseAuth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );
      final fbUser = cred.user!;
      await fbUser.updateDisplayName('$firstName $lastName');

      final model = UserModel(
        id:        fbUser.uid,
        firstName: firstName,
        lastName:  lastName,
        email:     email,
        userType:  '',
        isPremium: false,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      // Persist token + cache before any network writes
      await _saveToken(fbUser);
      await _cacheUser(model);

      // Create profile row in Supabase (new user — userType defaults to '' in DB)
      await _upsertIdentity(model);

      return model;
    } on FirebaseAuthException catch (e) {
      throw AuthFailure.signUpFailed(message: _friendlyFirebaseError(e));
    } catch (e) {
      throw AuthFailure.signUpFailed(message: e.toString());
    }
  }

  @override
  Future<UserModel> signIn({
    required String email,
    required String password,
  }) async {
    try {
      final cred = await _firebaseAuth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      return _buildModelFromFirebaseUser(cred.user!);
    } on FirebaseAuthException catch (e) {
      throw AuthFailure.signInFailed(message: _friendlyFirebaseError(e));
    } catch (e) {
      throw AuthFailure.signInFailed(message: e.toString());
    }
  }

  @override
  Future<UserModel> signInWithGoogle() async {
    try {
      await _ensureGoogleSignInReady();
      final googleUser = await _authenticateWithRetry();
      final googleAuth = googleUser.authentication;
      final googleAuthz = await googleUser.authorizationClient
              .authorizationForScopes(_googleScopes) ??
          await googleUser.authorizationClient.authorizeScopes(_googleScopes);

      if (googleAuth.idToken == null || googleAuthz.accessToken.isEmpty) {
        throw AuthFailure.signInFailed(
            message: 'Unable to fetch Google authentication tokens.');
      }

      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuthz.accessToken,
        idToken:     googleAuth.idToken,
      );

      final cred = await _firebaseAuth.signInWithCredential(credential);
      return _buildModelFromFirebaseUser(cred.user!);
    } on FirebaseAuthException catch (e) {
      debugPrint('Firebase Google AuthException: ${e.message}');
      throw AuthFailure.signInFailed(message: _friendlyFirebaseError(e));
    } on GoogleSignInException catch (e) {
      debugPrint('GoogleSignInException: $e');
      if (e.code == GoogleSignInExceptionCode.canceled) {
        throw AuthFailure.googleSignInFailed(
            message: 'Sign-in was cancelled. Please try again.');
      }
      throw AuthFailure.googleSignInFailed(
          message: 'Google sign-in failed. Please try again.');
    } catch (e) {
      debugPrint('Unexpected Google sign-in error: $e');
      throw AuthFailure.signInFailed(message: e.toString());
    }
  }

  @override
  Future<UserModel?> getCurrentUser() async {
    try {
      final fbUser = _firebaseAuth.currentUser;
      if (fbUser == null) {
        await _clearCache();
        return null;
      }

      // Silently refresh token so it stays valid
      await _saveToken(fbUser);

      // Resolve name parts from Firebase display name
      final nameParts = (fbUser.displayName ?? '').trim().split(' ');
      final firstName = nameParts.isNotEmpty ? nameParts.first : '';
      final lastName  = nameParts.length > 1
          ? nameParts.sublist(1).join(' ')
          : '';

      // Fetch userType + isPremium from Supabase; fall back to local cache
      String userType  = '';
      bool   isPremium = false;

      try {
        final remote = await _fetchProfile(fbUser.uid);
        userType  = remote['userType']?.toString().trim()  ?? '';
        isPremium = remote['isPremium'] == true;
      } catch (_) { /* network issue — fall through to cache */ }

      if (userType.isEmpty && !isPremium) {
        final cached = _prefs.getString(_userCacheKey);
        if (cached != null) {
          try {
            final m = UserModel.fromJson(jsonDecode(cached));
            userType  = m.userType?.trim() ?? '';
            isPremium = m.isPremium ?? false;
          } catch (_) {}
        }
      }

      final model = UserModel(
        id:        fbUser.uid,
        firstName: firstName,
        lastName:  lastName,
        email:     fbUser.email ?? '',
        userType:  userType,
        isPremium: isPremium,
        createdAt: fbUser.metadata.creationTime  ?? DateTime.now(),
        updatedAt: fbUser.metadata.lastSignInTime ?? DateTime.now(),
      );

      await _cacheUser(model);
      return model;
    } catch (e) {
      await _clearCache();
      return null;
    }
  }

  @override
  Future<void> signOut() async {
    try {
      await Future.wait([
        _firebaseAuth.signOut(),
        _googleSignIn.signOut(),
      ]);
      await _clearCache();
      await _prefs.remove('auth_token');
    } catch (e) {
      throw AuthFailure.signOutFailed(message: 'Failed to sign out.');
    }
  }

  /// Persists the user's exam category to Supabase `profiles`.
  @override
  Future<void> updateUserType(String userId, String userType) async {
    try {
      await SupabaseService.client
          .from('profiles')
          .upsert({'id': userId, 'user_type': userType}, onConflict: 'id');

      // Keep local cache in sync
      final cached = _prefs.getString(_userCacheKey);
      if (cached != null) {
        final updated = UserModel.fromJson(jsonDecode(cached))
            .copyWith(userType: userType);
        await _cacheUser(updated);
      }
    } catch (e) {
      throw AuthFailure.fetchUserFailed(
          message: 'Failed to save your selection. Please try again.');
    }
  }

  @override
  Future<void> resetPassword(String email) async {
    try {
      await _firebaseAuth.sendPasswordResetEmail(email: email.trim());
    } on FirebaseAuthException catch (e) {
      throw AuthFailure.resetPasswordFailed(
          message: _friendlyFirebaseError(e));
    } catch (_) {
      throw AuthFailure.resetPasswordFailed();
    }
  }

  @override
  bool isAuthenticated() => _firebaseAuth.currentUser != null;

  @override
  String? getAuthToken() => _prefs.getString('auth_token');

  /// Call once after [Firebase.initializeApp] to silence locale warnings.
  static void applyAuthLocaleFromPlatform() {
    try {
      final code =
          WidgetsBinding.instance.platformDispatcher.locale.languageCode;
      FirebaseAuth.instance.setLanguageCode(code.isEmpty ? 'en' : code);
    } catch (_) {
      FirebaseAuth.instance.setLanguageCode('en');
    }
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /// Core: sign in or Google sign-in → fetch Supabase profile → return model.
  /// NEVER overwrites userType or isPremium — those live in Supabase and
  /// are only modified by [updateUserType] or the premium service.
  Future<UserModel> _buildModelFromFirebaseUser(User fbUser) async {
    final nameParts = (fbUser.displayName ?? '').trim().split(' ');
    final firstName = nameParts.isNotEmpty ? nameParts.first : '';
    final lastName  = nameParts.length > 1
        ? nameParts.sublist(1).join(' ')
        : '';

    // 1. Fetch existing profile (userType, isPremium)
    String userType  = '';
    bool   isPremium = false;

    try {
      final remote = await _fetchProfile(fbUser.uid);
      userType  = remote['userType']?.toString().trim()  ?? '';
      isPremium = remote['isPremium'] == true;
    } catch (_) {
      // Supabase unavailable — fall back to local cache
      final cached = _prefs.getString(_userCacheKey);
      if (cached != null) {
        try {
          final m = UserModel.fromJson(jsonDecode(cached));
          if (m.id == fbUser.uid) {
            userType  = m.userType?.trim() ?? '';
            isPremium = m.isPremium ?? false;
          }
        } catch (_) {}
      }
    }

    final model = UserModel(
      id:        fbUser.uid,
      firstName: firstName,
      lastName:  lastName,
      email:     fbUser.email ?? '',
      userType:  userType,
      isPremium: isPremium,
      createdAt: fbUser.metadata.creationTime  ?? DateTime.now(),
      updatedAt: fbUser.metadata.lastSignInTime ?? DateTime.now(),
    );

    // 2. Persist token and local cache
    await _saveToken(fbUser);
    await _cacheUser(model);

    // 3. Keep Supabase identity fields fresh (email, name ONLY — never userType)
    await _upsertIdentity(model);

    return model;
  }

  /// Upserts only the identity fields to Supabase.
  /// Does NOT touch `user_type` or `is_premium` — those are managed
  /// by [updateUserType] and the premium service respectively.
  Future<void> _upsertIdentity(UserModel model) async {
    try {
      await SupabaseService.client.from('profiles').upsert(
        {
          'id':         model.id,
          'email':      model.email,
          'first_name': model.firstName ?? '',
          'last_name':  model.lastName  ?? '',
        },
        onConflict: 'id',
      );
    } catch (e) {
      // Non-critical: local cache still valid
      debugPrint('⚠ _upsertIdentity: $e');
    }
  }

  /// Fetches `user_type` and `is_premium` from the Supabase `profiles` table.
  Future<Map<String, dynamic>> _fetchProfile(String uid) async {
    final rows = await SupabaseService.client
        .from('profiles')
        .select('user_type, is_premium')
        .eq('id', uid)
        .limit(1);
    if ((rows as List).isEmpty) return const {};
    final row = rows.first;
    return {
      'userType':  row['user_type'] ?? '',
      'isPremium': row['is_premium'] ?? false,
    };
  }

  Future<void> _saveToken(User fbUser) async {
    try {
      final token = await fbUser.getIdToken();
      if (token != null) await _prefs.setString('auth_token', token);
    } catch (_) {}
  }

  Future<void> _cacheUser(UserModel user) async {
    try {
      await _prefs.setString(_userCacheKey, user.toJsonString());
    } catch (_) {}
  }

  Future<void> _clearCache() async {
    try {
      await _prefs.remove(_userCacheKey);
    } catch (_) {}
  }

  Future<void> _ensureGoogleSignInReady() async {
    _googleSignInInit ??= _googleSignIn.initialize();
    await _googleSignInInit;
  }

  Future<GoogleSignInAccount> _authenticateWithRetry() async {
    try {
      return await _googleSignIn.authenticate(scopeHint: _googleScopes);
    } on GoogleSignInException catch (e) {
      final isStaleSession = e.code == GoogleSignInExceptionCode.canceled &&
          (e.description ?? '').contains('Account reauth failed');
      if (!isStaleSession) rethrow;

      // Stale Credential Manager session on Android — clear and retry once
      await _googleSignIn.signOut();
      try { await _googleSignIn.disconnect(); } catch (_) {}
      return _googleSignIn.authenticate(scopeHint: _googleScopes);
    }
  }

  /// Maps Firebase error codes to plain-English messages for users.
  String _friendlyFirebaseError(FirebaseAuthException e) {
    switch (e.code) {
      case 'user-not-found':
        return 'No account found with that email.';
      case 'wrong-password':
      case 'invalid-credential':
        return 'Incorrect email or password.';
      case 'email-already-in-use':
        return 'An account with this email already exists.';
      case 'weak-password':
        return 'Password must be at least 6 characters.';
      case 'invalid-email':
        return 'Please enter a valid email address.';
      case 'user-disabled':
        return 'This account has been disabled. Contact support.';
      case 'too-many-requests':
        return 'Too many attempts. Please wait a moment and try again.';
      case 'network-request-failed':
        return 'No internet connection. Check your network and try again.';
      case 'operation-not-allowed':
        return 'Sign-in method not enabled. Contact support.';
      default:
        return e.message ?? 'Something went wrong. Please try again.';
    }
  }
}
