import 'package:flutter/foundation.dart';
import 'package:ssb_ready_app/core/services/supabase_service.dart';

/// Saves and retrieves test results from the Supabase `test_history` table.
/// Uses the Firebase UID as `user_id` — no Firestore dependency.
class HistoryService {
  static const _table = 'test_history';

  // ─── Write ─────────────────────────────────────────────────────────────────

  /// Persist a single test result. Silently swallows errors so a
  /// Supabase hiccup never crashes the result screen.
  static Future<void> save({
    required String userId,
    required String testType,
    required int score,
    required int answeredCount,
    required int totalCount,
    String feedback = '',
  }) async {
    if (userId.isEmpty) return;
    try {
      await SupabaseService.client.from(_table).insert({
        'user_id':        userId,
        'test_type':      testType,
        'score':          score,
        'answered_count': answeredCount,
        'total_count':    totalCount,
        'feedback':       feedback,
        // completed_at defaults to now() in Postgres
      });
      debugPrint('✓ Saved $testType result for $userId');
    } catch (e) {
      debugPrint('⚠ Failed to save $testType history: $e');
    }
  }

  // ─── Read ──────────────────────────────────────────────────────────────────

  /// Last [limit] results for a user across all test types, newest first.
  static Future<List<TestHistoryEntry>> getHistory(
    String userId, {
    int limit = 30,
  }) async {
    if (userId.isEmpty) return [];
    try {
      final rows = await SupabaseService.client
          .from(_table)
          .select()
          .eq('user_id', userId)
          .order('completed_at', ascending: false)
          .limit(limit);
      return (rows as List).map((r) => TestHistoryEntry.fromMap(r as Map<String, dynamic>)).toList();
    } catch (e) {
      debugPrint('⚠ Failed to fetch history: $e');
      return [];
    }
  }

  /// History for a specific test type.
  static Future<List<TestHistoryEntry>> getHistoryByType(
    String userId,
    String testType, {
    int limit = 10,
  }) async {
    if (userId.isEmpty) return [];
    try {
      final rows = await SupabaseService.client
          .from(_table)
          .select()
          .eq('user_id', userId)
          .eq('test_type', testType)
          .order('completed_at', ascending: false)
          .limit(limit);
      return (rows as List).map((r) => TestHistoryEntry.fromMap(r as Map<String, dynamic>)).toList();
    } catch (e) {
      debugPrint('⚠ Failed to fetch $testType history: $e');
      return [];
    }
  }

  /// Total number of tests completed by a user.
  static Future<int> getTotalCount(String userId) async {
    if (userId.isEmpty) return 0;
    try {
      final res = await SupabaseService.client
          .from(_table)
          .select()
          .eq('user_id', userId)
          .count();
      return res.count;
    } catch (e) {
      return 0;
    }
  }
}

// ─── Model ───────────────────────────────────────────────────────────────────

class TestHistoryEntry {
  final String id;
  final String userId;
  final String testType;
  final int score;
  final int answeredCount;
  final int totalCount;
  final String feedback;
  final DateTime completedAt;

  const TestHistoryEntry({
    required this.id,
    required this.userId,
    required this.testType,
    required this.score,
    required this.answeredCount,
    required this.totalCount,
    required this.feedback,
    required this.completedAt,
  });

  factory TestHistoryEntry.fromMap(Map<String, dynamic> m) {
    return TestHistoryEntry(
      id:            m['id']?.toString() ?? '',
      userId:        m['user_id']?.toString() ?? '',
      testType:      m['test_type']?.toString() ?? '',
      score:         (m['score'] as num?)?.toInt() ?? 0,
      answeredCount: (m['answered_count'] as num?)?.toInt() ?? 0,
      totalCount:    (m['total_count'] as num?)?.toInt() ?? 0,
      feedback:      m['feedback']?.toString() ?? '',
      completedAt:   m['completed_at'] != null
          ? DateTime.parse(m['completed_at'].toString()).toLocal()
          : DateTime.now(),
    );
  }

  String get scoreLabel => score > 0 ? '$score/10' : '—';
  String get completionLabel => '$answeredCount/$totalCount';

  String get timeAgo {
    final diff = DateTime.now().difference(completedAt);
    if (diff.inMinutes < 1)  return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24)   return '${diff.inHours}h ago';
    if (diff.inDays < 7)     return '${diff.inDays}d ago';
    return '${completedAt.day}/${completedAt.month}/${completedAt.year}';
  }
}
