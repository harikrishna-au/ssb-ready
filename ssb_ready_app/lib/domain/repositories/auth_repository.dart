import 'package:ssb_ready_app/domain/entities/user.dart';

abstract class AuthRepository {
  Future<User> signUp({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
  });

  Future<User> signIn({
    required String email,
    required String password,
  });

  Future<User> googleSignIn({
    required String email,
    required String displayName,
    required String photoUrl,
  });

  Future<void> updateUserType(String userId, String userType);

  Future<void> resetPassword(String email);

  Future<User?> getCurrentUser();

  Future<bool> isAuthenticated();

  Future<void> signOut();

  String? getToken();
}
