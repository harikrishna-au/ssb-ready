class Validators {
  static bool isValidEmail(String email) {
    final emailRegex = RegExp(
      r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
    );
    return emailRegex.hasMatch(email);
  }

  static bool isValidPassword(String password) {
    // At least 8 characters
    return password.length >= 8;
  }

  static bool isValidName(String name) {
    // At least 2 characters, no numbers
    return name.length >= 2 && !name.contains(RegExp(r'[0-9]'));
  }

  static String? validateEmail(String? email) {
    if (email?.isEmpty ?? true) {
      return 'Email is required';
    }
    if (!isValidEmail(email!)) {
      return 'Invalid email address';
    }
    return null;
  }

  static String? validatePassword(String? password) {
    if (password?.isEmpty ?? true) {
      return 'Password is required';
    }
    if (!isValidPassword(password!)) {
      return 'Password must be at least 8 characters';
    }
    return null;
  }

  static String? validateName(String? name) {
    if (name?.isEmpty ?? true) {
      return 'Name is required';
    }
    if (!isValidName(name!)) {
      return 'Name must be at least 2 characters and contain no numbers';
    }
    return null;
  }

  static Map<String, String> validateSignUpForm({
    required String email,
    required String password,
    required String confirmPassword,
    String? firstName,
    String? lastName,
  }) {
    final errors = <String, String>{};

    if (email.isEmpty) {
      errors['email'] = 'Email is required';
    } else if (!isValidEmail(email)) {
      errors['email'] = 'Invalid email address';
    }

    if (password.isEmpty) {
      errors['password'] = 'Password is required';
    } else if (!isValidPassword(password)) {
      errors['password'] = 'Password must be at least 8 characters';
    }

    if (confirmPassword.isEmpty) {
      errors['confirmPassword'] = 'Confirm password is required';
    } else if (password != confirmPassword) {
      errors['confirmPassword'] = 'Passwords do not match';
    }

    if (firstName != null && firstName.isNotEmpty && !isValidName(firstName)) {
      errors['firstName'] = 'First name must be at least 2 characters';
    }

    if (lastName != null && lastName.isNotEmpty && !isValidName(lastName)) {
      errors['lastName'] = 'Last name must be at least 2 characters';
    }

    return errors;
  }

  static Map<String, String> validateLoginForm({
    required String email,
    required String password,
  }) {
    final errors = <String, String>{};

    if (email.isEmpty) {
      errors['email'] = 'Email is required';
    } else if (!isValidEmail(email)) {
      errors['email'] = 'Invalid email address';
    }

    if (password.isEmpty) {
      errors['password'] = 'Password is required';
    }

    return errors;
  }
}
