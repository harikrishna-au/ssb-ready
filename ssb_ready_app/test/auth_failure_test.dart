import 'package:flutter_test/flutter_test.dart';
import 'package:ssb_ready_app/core/errors/auth_failures.dart';

void main() {
  group('AuthFailure', () {
    test('returns default reset password message', () {
      final failure = AuthFailure.resetPasswordFailed();
      expect(failure.message, 'Failed to send password reset email.');
    });

    test('uses custom reset password message when provided', () {
      final failure = AuthFailure.resetPasswordFailed(
        message: 'Custom message',
      );
      expect(failure.message, 'Custom message');
    });
  });
}
