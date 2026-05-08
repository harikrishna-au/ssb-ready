import 'package:ssb_ready_app/data/models/user_model.dart';

/// Abstract base class for all authentication services
abstract class AuthService {
  Future<UserModel> signUp({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
  });

  Future<UserModel> signIn({
    required String email,
    required String password,
  });

  Future<UserModel> signInWithGoogle();

  Future<UserModel?> getCurrentUser();

  Future<void> signOut();

  Future<void> updateUserType(String userId, String userType);

  Future<void> resetPassword(String email);

  bool isAuthenticated();

  String? getAuthToken();
}
