import 'package:ssb_ready_app/data/datasources/auth_service.dart';
import 'package:ssb_ready_app/domain/entities/user.dart';
import 'package:ssb_ready_app/domain/repositories/auth_repository.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthService _authService;

  AuthRepositoryImpl({required AuthService authService})
      : _authService = authService;

  @override
  Future<User> signUp({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
  }) async {
    final userModel = await _authService.signUp(
      email: email,
      password: password,
      firstName: firstName,
      lastName: lastName,
    );
    return userModel;
  }

  @override
  Future<User> signIn({
    required String email,
    required String password,
  }) async {
    final userModel = await _authService.signIn(
      email: email,
      password: password,
    );
    return userModel;
  }

  @override
  Future<User> googleSignIn({
    required String email,
    required String displayName,
    required String photoUrl,
  }) async {
    // Call the actual Google Sign-In method from the auth service
    final userModel = await _authService.signInWithGoogle();
    return userModel;
  }

  @override
  Future<void> updateUserType(String userId, String userType) async {
    await _authService.updateUserType(userId, userType);
  }

  @override
  Future<void> resetPassword(String email) async {
    await _authService.resetPassword(email);
  }

  @override
  Future<User?> getCurrentUser() async {
    return await _authService.getCurrentUser();
  }

  @override
  Future<bool> isAuthenticated() async {
    return _authService.isAuthenticated();
  }

  @override
  Future<void> signOut() async {
    await _authService.signOut();
  }

  @override
  String? getToken() {
    return _authService.getAuthToken();
  }
}
