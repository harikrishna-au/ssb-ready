import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/widgets.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:ssb_ready_app/core/services/backend_api_client.dart';
import 'package:ssb_ready_app/core/errors/auth_failures.dart';
import 'package:ssb_ready_app/data/models/user_model.dart';
import 'package:ssb_ready_app/data/datasources/auth_service.dart';

class FirebaseAuthService implements AuthService {
  final SharedPreferences _prefs;
  final FirebaseAuth _firebaseAuth = FirebaseAuth.instance;
  final GoogleSignIn _googleSignIn = GoogleSignIn.instance;
  final BackendApiClient _apiClient = BackendApiClient();

  static const String _userCacheKey = 'cached_user';
  static const List<String> _googleScopes = <String>['email', 'profile'];

  /// Lazy so startup does not run Credential Manager / Play Services work while
  /// the system is still bringing up the UI (reduces emulator "System UI"
  /// ANRs).
  Future<void>? _googleSignInInit;

  FirebaseAuthService(this._prefs);

  Future<void> _ensureGoogleSignInReady() async {
    _googleSignInInit ??= _googleSignIn.initialize();
    await _googleSignInInit;
  }

  @override
  Future<UserModel> signUp({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
  }) async {
    try {
      if (email.isEmpty || password.isEmpty) {
        throw Exception('Email and password are required');
      }

      final userCredential = await _firebaseAuth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );

      final user = userCredential.user;
      if (user == null) {
        throw AuthFailure.signUpFailed(
            message: 'Signup failed. User not created.');
      }

      await user.updateDisplayName('$firstName $lastName');

      final userModel = UserModel(
        id: user.uid,
        firstName: firstName,
        lastName: lastName,
        email: email,
        userType: '',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        isPremium: false,
      );

      await _cacheUser(userModel);
      final token = await user.getIdToken();
      await _prefs.setString('auth_token', token ?? '');
      await _persistUserProfile(userModel);

      return userModel;
    } on FirebaseAuthException catch (e) {
      throw AuthFailure.signUpFailed(
          message: e.message ?? 'Unknown error occurred.');
    } catch (e) {
      throw AuthFailure.signUpFailed(
          message: 'An error occurred: ${e.toString()}');
    }
  }

  @override
  Future<UserModel> signIn({
    required String email,
    required String password,
  }) async {
    try {
      final userCredential = await _firebaseAuth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      final user = userCredential.user;
      if (user == null) {
        throw AuthFailure.signInFailed(message: 'Invalid credentials.');
      }

      final nameParts = (user.displayName ?? '').split(' ');
      final firstName = nameParts.isNotEmpty ? nameParts.first : '';
      final lastName =
          nameParts.length > 1 ? nameParts.sublist(1).join(' ') : '';

      final userModel = UserModel(
        id: user.uid,
        firstName: firstName,
        lastName: lastName,
        email: user.email ?? '',
        userType: '',
        createdAt: user.metadata.creationTime ?? DateTime.now(),
        updatedAt: user.metadata.lastSignInTime ?? DateTime.now(),
        isPremium: false,
      );

      await _cacheUser(userModel);
      final token = await user.getIdToken();
      await _prefs.setString('auth_token', token ?? '');

      return userModel;
    } on FirebaseAuthException catch (e) {
      throw AuthFailure.signInFailed(
          message: e.message ?? 'Unknown error occurred.');
    } catch (e) {
      throw AuthFailure.signInFailed(
          message: 'An error occurred: ${e.toString()}');
    }
  }

  /// Google Sign-In Implementation
  @override
  Future<UserModel> signInWithGoogle() async {
    try {
      debugPrint('Attempting Google Sign-In');
      await _ensureGoogleSignInReady();
      final GoogleSignInAccount googleUser = await _authenticateWithRetry();
      final GoogleSignInAuthentication googleAuth = googleUser.authentication;
      final GoogleSignInClientAuthorization googleAuthorization =
          await googleUser.authorizationClient.authorizationForScopes(
                _googleScopes,
              ) ??
              await googleUser.authorizationClient.authorizeScopes(
                _googleScopes,
              );

      if (googleAuth.idToken == null ||
          googleAuthorization.accessToken.isEmpty) {
        throw AuthFailure.signInFailed(
          message: 'Unable to fetch Google authentication tokens.',
        );
      }

      final AuthCredential credential = GoogleAuthProvider.credential(
        accessToken: googleAuthorization.accessToken,
        idToken: googleAuth.idToken,
      );

      final userCredential =
          await _firebaseAuth.signInWithCredential(credential);
      final user = userCredential.user;

      if (user == null) {
        throw AuthFailure.signInFailed(
            message: 'Failed to retrieve user from Google credential.');
      }

      final nameParts = (user.displayName ?? '').split(' ');
      final firstName = nameParts.isNotEmpty ? nameParts.first : '';
      final lastName =
          nameParts.length > 1 ? nameParts.sublist(1).join(' ') : '';

      final userModel = UserModel(
        id: user.uid,
        firstName: firstName,
        lastName: lastName,
        email: user.email ?? '',
        userType: '',
        createdAt: user.metadata.creationTime ?? DateTime.now(),
        updatedAt: user.metadata.lastSignInTime ?? DateTime.now(),
        isPremium: false,
      );

      // Save/Merge user in Firestore
      await _cacheUser(userModel);
      final token = await user.getIdToken();
      await _prefs.setString('auth_token', token ?? '');
      await _persistUserProfile(userModel);

      return userModel;
    } on FirebaseAuthException catch (e) {
      debugPrint('Firebase Google AuthException: ${e.message}');
      throw AuthFailure.signInFailed(
          message: e.message ?? 'Unknown error occurred.');
    } on GoogleSignInException catch (e) {
      debugPrint('GoogleSignInException: $e');
      if (e.code == GoogleSignInExceptionCode.canceled) {
        throw AuthFailure.googleSignInFailed(
          message: 'Google sign-in was canceled. Please try again.',
        );
      }
      throw AuthFailure.googleSignInFailed(
        message: 'Google sign-in failed. Please try again.',
      );
    } catch (e) {
      debugPrint('Unexpected Google signin error: $e');
      throw AuthFailure.signInFailed(
          message: 'An error occurred: ${e.toString()}');
    }
  }

  Future<GoogleSignInAccount> _authenticateWithRetry() async {
    try {
      return await _googleSignIn.authenticate(scopeHint: _googleScopes);
    } on GoogleSignInException catch (e) {
      final isReauthIssue = e.code == GoogleSignInExceptionCode.canceled &&
          (e.description ?? '').contains('Account reauth failed');
      if (!isReauthIssue) rethrow;

      // Credential Manager occasionally keeps a stale session on Android.
      await _googleSignIn.signOut();
      try {
        await _googleSignIn.disconnect();
      } catch (_) {
        // Ignore disconnect failures and continue retry flow.
      }
      return _googleSignIn.authenticate(scopeHint: _googleScopes);
    }
  }

  @override
  Future<UserModel?> getCurrentUser() async {
    try {
      final user = _firebaseAuth.currentUser;
      if (user == null) {
        await _clearCache();
        return null;
      }

      // Refresh token if needed
      final token = await user.getIdToken();
      if (token == null) {
        await _clearCache();
        return null;
      }
      await _prefs.setString('auth_token', token);

      final nameParts = (user.displayName ?? '').split(' ');
      final firstName = nameParts.isNotEmpty ? nameParts.first : '';
      final lastName =
          nameParts.length > 1 ? nameParts.sublist(1).join(' ') : '';

      String userType = '';
      try {
        userType = await _fetchRemoteUserType(user.uid);
        if (userType.isEmpty) {
          final cachedJson = _prefs.getString(_userCacheKey);
          if (cachedJson != null) {
            final Map<String, dynamic> userMap = jsonDecode(cachedJson);
            userType = userMap['userType'] ?? '';
          }
        }
      } catch (_) {
        // Attempt fallback from cache if Firestore fails
        final cachedJson = _prefs.getString(_userCacheKey);
        if (cachedJson != null) {
          try {
            final Map<String, dynamic> userMap = jsonDecode(cachedJson);
            userType = userMap['userType'] ?? '';
          } catch (_) {}
        }
      }

      final userModel = UserModel(
        id: user.uid,
        firstName: firstName,
        lastName: lastName,
        email: user.email ?? '',
        userType: userType,
        createdAt: user.metadata.creationTime ?? DateTime.now(),
        updatedAt: user.metadata.lastSignInTime ?? DateTime.now(),
        isPremium: false,
      );

      await _cacheUser(userModel);
      return userModel;
    } catch (e) {
      await _clearCache();
      return null;
    }
  }

  @override
  Future<void> signOut() async {
    try {
      await _firebaseAuth.signOut();
      await _googleSignIn.signOut(); // Ensure Google session is also cleared
      await _clearCache();
      await _prefs.remove('auth_token');
    } catch (e) {
      throw AuthFailure.signOutFailed(message: 'Failed to sign out.');
    }
  }

  @override
  Future<void> updateUserType(String userId, String userType) async {
    try {
      if (_apiClient.isConfigured) {
        await _apiClient
            .patch('/api/firestore/user/type', {'userType': userType});
      } else {
        await FirebaseFirestore.instance.collection('users').doc(userId).set(
              {
                'userType': userType,
                'updatedAt': FieldValue.serverTimestamp(),
              },
              SetOptions(merge: true),
            );
      }

      // 2. Update local cache
      final cachedJson = _prefs.getString(_userCacheKey);
      if (cachedJson != null) {
        final Map<String, dynamic> userMap = jsonDecode(cachedJson);
        final user = UserModel.fromJson(userMap);
        final updatedUser = user.copyWith(userType: userType);
        await _cacheUser(updatedUser);
      }
    } catch (e) {
      throw AuthFailure.fetchUserFailed(message: 'Failed to update user type.');
    }
  }

  @override
  Future<void> resetPassword(String email) async {
    try {
      await _firebaseAuth.sendPasswordResetEmail(email: email.trim());
    } on FirebaseAuthException catch (e) {
      throw AuthFailure.resetPasswordFailed(
        message: e.message ?? 'Unable to send password reset email.',
      );
    } catch (_) {
      throw AuthFailure.resetPasswordFailed();
    }
  }

  Future<void> _cacheUser(UserModel user) async {
    try {
      await _prefs.setString(_userCacheKey, user.toJsonString());
    } catch (e) {
      // Cache failure is not critical
    }
  }

  Future<void> _persistUserProfile(UserModel model) async {
    if (_apiClient.isConfigured) {
      await _apiClient.post('/api/firestore/user/profile', model.toJson());
      return;
    }
    await FirebaseFirestore.instance.collection('users').doc(model.id).set(
          {
            ...model.toJson(),
            'updatedAt': FieldValue.serverTimestamp(),
          },
          SetOptions(merge: true),
        );
  }

  Future<String> _fetchRemoteUserType(String uid) async {
    if (_apiClient.isConfigured) {
      final response = await _apiClient.get('/api/firestore/user/profile');
      final data = response['data'];
      if (data is Map<String, dynamic>) {
        final v = data['userType'];
        return v == null ? '' : '$v'.trim();
      }
      return '';
    }
    final snap =
        await FirebaseFirestore.instance.collection('users').doc(uid).get();
    final data = snap.data();
    if (data == null) {
      return '';
    }
    final v = data['userType'];
    return v == null ? '' : '$v'.trim();
  }

  /// Call once after [Firebase.initializeApp] to silence null X-Firebase-Locale warnings.
  static void applyAuthLocaleFromPlatform() {
    try {
      final code =
          WidgetsBinding.instance.platformDispatcher.locale.languageCode;
      if (code.isEmpty) {
        return;
      }
      FirebaseAuth.instance.setLanguageCode(code);
    } catch (_) {
      FirebaseAuth.instance.setLanguageCode('en');
    }
  }

  Future<void> _clearCache() async {
    try {
      await _prefs.remove(_userCacheKey);
    } catch (e) {
      // Clear failure is not critical
    }
  }

  @override
  bool isAuthenticated() {
    return _firebaseAuth.currentUser != null;
  }

  @override
  String? getAuthToken() {
    return _prefs.getString('auth_token');
  }
}
