import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Thin wrapper around the Supabase singleton.
/// Call [SupabaseService.initialize] once during app bootstrap.
/// Access the client anywhere via [SupabaseService.client].
class SupabaseService {
  SupabaseService._();

  static SupabaseClient get client => Supabase.instance.client;

  static Future<void> initialize() async {
    final url = dotenv.env['SUPABASE_URL'] ?? '';
    final anonKey = dotenv.env['SUPABASE_ANON_KEY'] ?? '';

    if (url.isEmpty || anonKey.isEmpty) {
      debugPrint('⚠ SUPABASE_URL or SUPABASE_ANON_KEY missing in .env');
      return;
    }

    await Supabase.initialize(
      url: url,
      // publishableKey is the new name for anonKey in supabase_flutter ^2.6
      publishableKey: anonKey,
      debug: false,
    );

    debugPrint('✓ Supabase initialized (${Uri.parse(url).host})');
  }
}
