import 'dart:convert';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;

class BackendApiClient {
  BackendApiClient({String? baseUrl})
      : _baseUrl =
            (baseUrl ?? dotenv.env['BACKEND_URL'] ?? '').trim().replaceAll(RegExp(r'/$'), '');

  final String _baseUrl;

  /// `BACKEND_URL` must be set (e.g. `https://your-app.onrender.com`) for REST
  /// proxy endpoints. When false, auth/user profile can still use Firestore from
  /// [FirebaseAuthService] — other features that only call the API need a URL.
  bool get isConfigured {
    if (_baseUrl.isEmpty) return false;
    final uri = Uri.tryParse(_baseUrl);
    return uri != null && uri.hasScheme && uri.host.isNotEmpty;
  }

  void _ensureConfigured() {
    if (!isConfigured) {
      throw Exception(
        'BACKEND_URL is not set in .env. Add your server base URL, '
        'for example: BACKEND_URL=https://your-service.onrender.com',
      );
    }
  }

  Future<Map<String, dynamic>> get(String path) async {
    _ensureConfigured();
    final token = await FirebaseAuth.instance.currentUser?.getIdToken();
    final response = await http.get(
      Uri.parse('$_baseUrl$path'),
      headers: _headers(token),
    );
    return _decode(response);
  }

  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body) async {
    _ensureConfigured();
    final token = await FirebaseAuth.instance.currentUser?.getIdToken();
    final response = await http.post(
      Uri.parse('$_baseUrl$path'),
      headers: _headers(token),
      body: jsonEncode(body),
    );
    return _decode(response);
  }

  Future<Map<String, dynamic>> patch(String path, Map<String, dynamic> body) async {
    _ensureConfigured();
    final token = await FirebaseAuth.instance.currentUser?.getIdToken();
    final response = await http.patch(
      Uri.parse('$_baseUrl$path'),
      headers: _headers(token),
      body: jsonEncode(body),
    );
    return _decode(response);
  }

  Map<String, String> _headers(String? token) => {
        'Content-Type': 'application/json',
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      };

  Map<String, dynamic> _decode(http.Response response) {
    final body = response.body.isEmpty ? '{}' : response.body;
    final decoded = jsonDecode(body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      String message = 'Backend error (${response.statusCode})';
      if (decoded is Map<String, dynamic>) {
        final error = decoded['error'];
        if (error is Map<String, dynamic>) {
          message = (error['message'] ?? message).toString();
        }
      }
      throw Exception(
        message,
      );
    }
    if (decoded is! Map<String, dynamic>) {
      throw Exception('Invalid backend response');
    }
    return decoded;
  }
}
