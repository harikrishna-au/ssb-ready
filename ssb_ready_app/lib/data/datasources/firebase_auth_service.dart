import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:ssb_ready_app/core/errors/auth_failures.dart';
import 'package:ssb_ready_app/data/models/user_model.dart';
import 'package:ssb_ready_app/data/datasources/auth_service.dart';

class FirebaseAuthService implements AuthService {
  final SharedPreferences _prefs;
  final FirebaseAuth _firebaseAuth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final GoogleSignIn _googleSignIn = GoogleSignIn.instance;

  static const String _userCacheKey = 'cached_user';
  static const List<String> _googleScopes = <String>['email', 'profile'];

  FirebaseAuthService(this._prefs) {
    _initializeGoogleSignIn();
  }

  Future<void> _initializeGoogleSignIn() async {
    await _googleSignIn.initialize();
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

      debugPrint('Attempting Firebase signup for email: $email');

      final userCredential = await _firebaseAuth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );

      final user = userCredential.user;
      if (user == null) {
        throw AuthFailure.signUpFailed(
            message: 'Signup failed. User not created.');
      }

      // Update Firebase profile with name
      await user.updateDisplayName('$firstName $lastName');

      final userModel = UserModel(
        id: user.uid,
        firstName: firstName,
        lastName: lastName,
        email: email,
        userType: '', // Needs to be updated later by UI
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        isPremium: false,
      );

      // Save user to Firestore
      await _firestore
          .collection('users')
          .doc(user.uid)
          .set(userModel.toJson());

      await _cacheUser(userModel);
      final token = await user.getIdToken();
      await _prefs.setString('auth_token', token ?? '');

      debugPrint('Signup successful for user: ${userModel.id}');
      return userModel;
    } on FirebaseAuthException catch (e) {
      debugPrint('Firebase AuthException: ${e.message}');
      throw AuthFailure.signUpFailed(
          message: e.message ?? 'Unknown error occurred.');
    } catch (e) {
      debugPrint('Unexpected signup error: $e');
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
      debugPrint('Attempting Firebase signin for email: $email');

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
        userType:
            '', // We don't store this in Firebase Auth profile directly by default
        createdAt: user.metadata.creationTime ?? DateTime.now(),
        updatedAt: user.metadata.lastSignInTime ?? DateTime.now(),
        isPremium: false,
      );

      await _cacheUser(userModel);
      final token = await user.getIdToken();
      await _prefs.setString('auth_token', token ?? '');

      debugPrint('SignIn successful for user: ${userModel.id}');
      return userModel;
    } on FirebaseAuthException catch (e) {
      debugPrint('Firebase AuthException: ${e.message}');
      throw AuthFailure.signInFailed(
          message: e.message ?? 'Unknown error occurred.');
    } catch (e) {
      debugPrint('Unexpected signin error: $e');
      throw AuthFailure.signInFailed(
          message: 'An error occurred: ${e.toString()}');
    }
  }

  /// Google Sign-In Implementation
  @override
  Future<UserModel> signInWithGoogle() async {
    try {
      debugPrint('Attempting Google Sign-In');
      final GoogleSignInAccount googleUser = await _googleSignIn.authenticate(
        scopeHint: _googleScopes,
      );
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
      await _firestore.collection('users').doc(user.uid).set(
            userModel.toJson(),
            SetOptions(merge: true),
          );

      await _cacheUser(userModel);
      final token = await user.getIdToken();
      await _prefs.setString('auth_token', token ?? '');

      debugPrint('Google SignIn successful for user: ${userModel.id}');
      return userModel;
    } on FirebaseAuthException catch (e) {
      debugPrint('Firebase Google AuthException: ${e.message}');
      throw AuthFailure.signInFailed(
          message: e.message ?? 'Unknown error occurred.');
    } catch (e) {
      debugPrint('Unexpected Google signin error: $e');
      throw AuthFailure.signInFailed(
          message: 'An error occurred: ${e.toString()}');
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

      // We fetch user metadata from Firestore
      String userType = '';
      try {
        final doc = await _firestore.collection('users').doc(user.uid).get();
        if (doc.exists && doc.data() != null) {
          userType = doc.data()!['userType'] ?? '';
        } else {
          // Attempt fallback from cache if Firestore fails or doesn't exist
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
      // 1. Update Firestore
      await _firestore.collection('users').doc(userId).set({
        'userType': userType,
      }, SetOptions(merge: true));

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
