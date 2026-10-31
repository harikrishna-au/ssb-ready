import 'package:shared_preferences/shared_preferences.dart';

// ─── Result ──────────────────────────────────────────────────────────────────

/// Outcome of a rate-limit check.
class RateLimitResult {
  /// Whether the action is permitted.
  final bool allowed;

  /// Attempts still available within the current window (0 when blocked).
  final int remainingAttempts;

  /// How long until the oldest attempt expires and frees a slot.
  /// [Duration.zero] when [allowed] is true.
  final Duration resetIn;

  const RateLimitResult._({
    required this.allowed,
    required this.remainingAttempts,
    required this.resetIn,
  });

  factory RateLimitResult.allowed({required int remainingAttempts}) =>
      RateLimitResult._(
        allowed: true,
        remainingAttempts: remainingAttempts,
        resetIn: Duration.zero,
      );

  factory RateLimitResult.blocked({required Duration resetIn}) =>
      RateLimitResult._(
        allowed: false,
        remainingAttempts: 0,
        resetIn: resetIn,
      );

  /// Human-readable lockout countdown, e.g. "Try again in 4m 22s".
  String get lockoutMessage {
    final total = resetIn.inSeconds.clamp(1, resetIn.inSeconds);
    final m = total ~/ 60;
    final s = total % 60;
    if (m > 0) return 'Try again in ${m}m ${s}s';
    return 'Try again in ${s}s';
  }
}

// ─── Rate Limiter ─────────────────────────────────────────────────────────────

/// Sliding-window rate limiter backed by [SharedPreferences].
///
/// Each key stores a list of attempt timestamps. On every [check] call,
/// timestamps outside the [window] are pruned, then:
/// - If `timestamps.length >= maxAttempts` → blocked
/// - Otherwise → record this timestamp and return allowed
///
/// On successful completion of the gated action, call [reset] to clear the
/// counter so a legitimate user isn't locked out after a successful attempt.
///
/// All keys are prefixed with `rl_` to namespace them in SharedPreferences.
///
/// ### Usage
/// ```dart
/// final result = await RateLimiter.check(
///   prefs,
///   key: RateLimiter.emailKey('login', event.email),
///   maxAttempts: 5,
///   window: Duration(minutes: 15),
/// );
/// if (!result.allowed) throw AuthFailure.rateLimitExceeded(resetIn: result.resetIn);
/// // ... attempt the action ...
/// await RateLimiter.reset(prefs, key: RateLimiter.emailKey('login', event.email));
/// ```
class RateLimiter {
  static const String _prefix = 'rl_';

  // ─── Predefined limits ────────────────────────────────────────────────────

  // Auth
  static const int  loginMaxAttempts     = 5;
  static final      loginWindow          = const Duration(minutes: 15);

  static const int  signUpMaxAttempts    = 3;
  static final      signUpWindow         = const Duration(hours: 1);

  static const int  passwordResetMax     = 3;
  static final      passwordResetWindow  = const Duration(minutes: 10);

  // AI evaluation — daily cap (cost control)
  static const int  aiDailyMax           = 10;     // 10 evals per calendar day
  static final      aiDailyWindow        = const Duration(hours: 24);

  // AI evaluation — burst cap (prevents spam tapping Evaluate)
  static const int  aiBurstMax           = 3;
  static final      aiBurstWindow        = const Duration(minutes: 5);

  // ─── Core API ─────────────────────────────────────────────────────────────

  /// Check whether the action identified by [key] is within its limit,
  /// and record it if allowed.
  ///
  /// [prefs] must already be initialised (call [SharedPreferences.getInstance]
  /// once during app bootstrap).
  static Future<RateLimitResult> check(
    SharedPreferences prefs, {
    required String key,
    required int maxAttempts,
    required Duration window,
  }) async {
    final now      = DateTime.now().millisecondsSinceEpoch;
    final windowMs = window.inMilliseconds;
    final storeKey = '$_prefix$key';

    // Load + prune timestamps outside the sliding window
    final raw        = prefs.getStringList(storeKey) ?? [];
    final timestamps = raw
        .map(int.tryParse)
        .whereType<int>()
        .where((t) => now - t < windowMs)
        .toList()
      ..sort();

    if (timestamps.length >= maxAttempts) {
      // Blocked: oldest timestamp + window = when one slot opens
      final resetAt = timestamps.first + windowMs;
      final resetIn = Duration(
        milliseconds: (resetAt - now).clamp(1000, windowMs),
      );
      return RateLimitResult.blocked(resetIn: resetIn);
    }

    // Allowed: record this attempt
    timestamps.add(now);
    await prefs.setStringList(
      storeKey,
      timestamps.map((t) => t.toString()).toList(),
    );

    return RateLimitResult.allowed(
      remainingAttempts: maxAttempts - timestamps.length,
    );
  }

  /// Like [check] but fetches its own [SharedPreferences] instance.
  /// Useful in services that don't receive [prefs] via constructor.
  static Future<RateLimitResult> checkAsync({
    required String key,
    required int maxAttempts,
    required Duration window,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    return check(prefs, key: key, maxAttempts: maxAttempts, window: window);
  }

  /// Clears all recorded attempts for [key].
  /// Call this after a **successful** action to give the user a clean slate.
  static Future<void> reset(
    SharedPreferences prefs, {
    required String key,
  }) async {
    await prefs.remove('$_prefix$key');
  }

  /// Like [reset] but fetches its own [SharedPreferences] instance.
  static Future<void> resetAsync({required String key}) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('$_prefix$key');
  }

  // ─── Key helpers ──────────────────────────────────────────────────────────

  /// Builds a stable, privacy-preserving key from an email address.
  ///
  /// Stores only the character count + last 4 chars — never the full address.
  /// Example: `login` + `user@example.com` → `login_15_m.com`
  static String emailKey(String prefix, String email) {
    final e      = email.toLowerCase().trim();
    final suffix = e.length >= 4 ? e.substring(e.length - 4) : e;
    return '${prefix}_${e.length}_$suffix';
  }

  /// Key for the AI daily cap — resets based on calendar date so the window
  /// always aligns with midnight, not a rolling 24 h from first use.
  static String aiDailyKey() {
    final now = DateTime.now();
    return 'ai_daily_${now.year}${now.month.toString().padLeft(2, '0')}${now.day.toString().padLeft(2, '0')}';
  }

  /// Key for AI burst (rolling window, per-device).
  static const String aiBurstKey = 'ai_burst';
}
