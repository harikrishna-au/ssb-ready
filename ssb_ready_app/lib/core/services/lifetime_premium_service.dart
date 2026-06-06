import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;

class LifetimePremiumService {
  LifetimePremiumService({String? baseUrl})
      : _baseUrl = (baseUrl ?? dotenv.env['SUPABASE_URL'] ?? '')
            .trim()
            .replaceAll(RegExp(r'/$'), '');

  final String _baseUrl;

  bool get isConfigured {
    if (_baseUrl.isEmpty) return false;
    final uri = Uri.tryParse(_baseUrl);
    return uri != null && uri.hasScheme && uri.host.isNotEmpty;
  }

  Future<Map<String, dynamic>> createOrder({
    required String email,
    required String username,
  }) async {
    if (!isConfigured) {
      throw Exception('SUPABASE_URL is not configured.');
    }

    final token = await FirebaseAuth.instance.currentUser?.getIdToken();
    final response = await http.post(
      Uri.parse('$_baseUrl/functions/v1/lifetime-premium'),
      headers: {
        'Content-Type': 'application/json',
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'action': 'create_order',
        'email': email,
        'username': username,
      }),
    );
    return _decode(response);
  }

  Future<Map<String, dynamic>> verifyPayment({
    required String orderId,
    required String paymentId,
    required String signature,
  }) async {
    if (!isConfigured) {
      throw Exception('SUPABASE_URL is not configured.');
    }

    final token = await FirebaseAuth.instance.currentUser?.getIdToken();
    final response = await http.post(
      Uri.parse('$_baseUrl/functions/v1/lifetime-premium'),
      headers: {
        'Content-Type': 'application/json',
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'action': 'verify_payment',
        'razorpay_order_id': orderId,
        'razorpay_payment_id': paymentId,
        'razorpay_signature': signature,
      }),
    );
    return _decode(response);
  }

  Map<String, dynamic> _decode(http.Response response) {
    final body = response.body.isEmpty ? '{}' : response.body;
    final decoded = jsonDecode(body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = decoded is Map<String, dynamic>
          ? (decoded['error'] ?? 'Premium payment failed').toString()
          : 'Premium payment failed';
      throw Exception(message);
    }
    if (decoded is! Map<String, dynamic>) {
      throw Exception('Invalid premium payment response');
    }
    return decoded;
  }
}
