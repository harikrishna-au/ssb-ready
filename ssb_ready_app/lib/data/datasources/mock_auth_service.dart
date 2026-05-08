import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:ssb_ready_app/core/errors/auth_failures.dart';
import 'package:ssb_ready_app/data/models/user_model.dart';
import 'package:ssb_ready_app/data/datasources/auth_service.dart';

/// Mock authentication service for testing when Supabase is unavailable
class MockAuthService implements AuthService {
  final SharedPreferences _prefs;
  static const String _userCacheKey = 'cached_user';
  static const String _authTokenKey = 'auth_token';

  // In-memory user storage for mock auth
  static final Map<String, Map<String, String>> _mockUsers = {};
  static String? _currentUserId;

  MockAuthService(this._prefs);

  @override
  Future<UserModel> signUp({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
  }) async {
    try {
      debugPrint('[MOCK] Attempting signup for email: $email');

      // Validate inputs
      if (email.isEmpty || password.isEmpty) {
        throw Exception('Email and password are required');
      }

      if (firstName.isEmpty || lastName.isEmpty) {
        throw Exception('First name and last name are required');
      }

      // Check if email already exists
      if (_mockUsers.containsKey(email)) {
        throw Exception('Email already exists');
      }

      // Simulate delay
      await Future.delayed(const Duration(milliseconds: 500));

      // Create mock user
      final userId = 'mock_${DateTime.now().millisecondsSinceEpoch}';
      _mockUsers[email] = {
        'id': userId,
        'firstName': firstName,
        'lastName': lastName,
        'email': email,
        'password': password,
      };

      final user = UserModel(
        id: userId,
        firstName: firstName,
        lastName: lastName,
        email: email,
        userType: '',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        isPremium: false,
      );

      _currentUserId = userId;
      await _cacheUser(user);
      await _prefs.setString(_authTokenKey, 'mock_token_$userId');

      debugPrint('[MOCK] Signup successful for user: $userId');
      return user;
    } catch (e) {
      debugPrint('[MOCK] Signup error: $e');
      throw AuthFailure.signUpFailed(message: e.toString());
    }
  }

  @override
  Future<UserModel> signIn({
    required String email,
    required String password,
  }) async {
    try {
      debugPrint('[MOCK] Attempting signin for email: $email');

      // Simulate delay
      await Future.delayed(const Duration(milliseconds: 500));

      // Check if user exists
      if (!_mockUsers.containsKey(email)) {
        throw Exception('User not found');
      }

      final userData = _mockUsers[email]!;

      // Check password
      if (userData['password'] != password) {
        throw Exception('Invalid password');
      }

      final user = UserModel(
        id: userData['id']!,
        firstName: userData['firstName']!,
        lastName: userData['lastName']!,
        email: email,
        userType: '',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        isPremium: false,
      );

      _currentUserId = userData['id'];
      await _cacheUser(user);
      await _prefs.setString(_authTokenKey, 'mock_token_${userData['id']}');

      debugPrint('[MOCK] SignIn successful for user: ${userData['id']}');
      return user;
    } catch (e) {
      debugPrint('[MOCK] SignIn error: $e');
      throw AuthFailure.signInFailed(message: e.toString());
    }
  }

  @override
  Future<UserModel> signInWithGoogle() async {
    try {
      debugPrint('[MOCK] Attempting Google Sign-In');

      // Simulate delay
      await Future.delayed(const Duration(milliseconds: 1000));

      // Create a mock Google user
      final userId = 'google_${DateTime.now().millisecondsSinceEpoch}';
      final email =
          'mockgoogle_${DateTime.now().millisecondsSinceEpoch}@gmail.com';

      _mockUsers[email] = {
        'id': userId,
        'firstName': 'Mock',
        'lastName': 'GoogleUser',
        'email': email,
        'password': '', // No password for OAuth users
      };

      final user = UserModel(
        id: userId,
        firstName: 'Mock',
        lastName: 'GoogleUser',
        email: email,
        userType: '',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        isPremium: false,
      );

      _currentUserId = userId;
      await _cacheUser(user);
      await _prefs.setString(_authTokenKey, 'mock_google_token_$userId');

      debugPrint('[MOCK] Google Sign-In successful for user: $userId');
      return user;
    } catch (e) {
      debugPrint('[MOCK] Google Sign-In error: $e');
      throw AuthFailure.signInFailed(
          message: 'Google Sign-In failed: ${e.toString()}');
    }
  }

  @override
  Future<UserModel?> getCurrentUser() async {
    try {
      if (_currentUserId == null) {
        final cachedJson = _prefs.getString(_userCacheKey);
        if (cachedJson == null) {
          return null;
        }
        // Parse cached user
        final userMap = UserModel.fromJson(jsonDecode(cachedJson));
        _currentUserId = userMap.id;
        return userMap;
      }

      // Find user by ID
      for (final userData in _mockUsers.values) {
        if (userData['id'] == _currentUserId) {
          return UserModel(
            id: userData['id']!,
            firstName: userData['firstName']!,
            lastName: userData['lastName']!,
            email: userData['email']!,
            userType: '',
            createdAt: DateTime.now(),
            updatedAt: DateTime.now(),
            isPremium: false,
          );
        }
      }

      return null;
    } catch (e) {
      debugPrint('[MOCK] Get current user error: $e');
      return null;
    }
  }

  @override
  Future<void> signOut() async {
    try {
      await _clearCache();
      await _prefs.remove(_authTokenKey);
      _currentUserId = null;
      debugPrint('[MOCK] SignOut successful');
    } catch (e) {
      throw AuthFailure.signOutFailed(message: 'Failed to sign out.');
    }
  }

  @override
  Future<void> updateUserType(String userId, String userType) async {
    try {
      final cachedJson = _prefs.getString(_userCacheKey);
      if (cachedJson != null) {
        final Map<String, dynamic> userMap = jsonDecode(cachedJson);
        final updatedUser = UserModel.fromJson(userMap).copyWith(
          userType: userType,
        );
        await _cacheUser(updatedUser);
      }
      debugPrint('[MOCK] Updated user type for $userId to $userType');
    } catch (e) {
      throw AuthFailure.fetchUserFailed(message: 'Failed to update user type.');
    }
  }

  @override
  Future<void> resetPassword(String email) async {
    // Mock mode does not have an email backend. Keep behavior predictable.
    await Future.delayed(const Duration(milliseconds: 300));
    debugPrint('[MOCK] Password reset requested for $email');
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
    return _currentUserId != null;
  }

  @override
  String? getAuthToken() {
    return _prefs.getString(_authTokenKey);
  }
}
