import 'package:flutter/foundation.dart';
import 'package:ssb_ready_app/core/services/supabase_service.dart';
import 'package:ssb_ready_app/data/models/oir_result_model.dart';
import 'package:ssb_ready_app/data/models/ppdt_result_model.dart';
import 'package:ssb_ready_app/data/models/wat_result_model.dart';
import 'package:ssb_ready_app/data/models/srt_result_model.dart';
import 'package:ssb_ready_app/data/models/tat_result_model.dart';
import 'package:ssb_ready_app/data/models/piq_model.dart';
import 'package:ssb_ready_app/domain/repositories/test_history_repository.dart';

/// Production TestHistoryRepository backed by Supabase Postgres.
/// Replaces FirebaseTestHistoryService — zero Firestore dependency.
class SupabaseTestHistoryService implements TestHistoryRepository {
  final _db = SupabaseService.client;

  // ─── OIR ───────────────────────────────────────────────────────────────────

  @override
  Future<void> saveOirResult(OirResultModel result) async {
    try {
      await _db.from('test_history').insert({
        'user_id':        result.userId,
        'test_type':      'OIR',
        'score':          result.score,
        'answered_count': result.score,
        'total_count':    result.totalQuestions,
        'feedback':       '',
      });
    } catch (e) {
      debugPrint('⚠ saveOirResult: $e');
    }
  }

  @override
  Future<List<OirResultModel>> getOirHistory(String userId) async {
    try {
      final rows = await _db
          .from('test_history')
          .select()
          .eq('user_id', userId)
          .eq('test_type', 'OIR')
          .order('completed_at', ascending: false)
          .limit(20);
      return (rows as List).map((r) {
        final m = r as Map<String, dynamic>;
        return OirResultModel(
          id:             m['id']?.toString() ?? '',
          userId:         userId,
          score:          (m['score'] as num?)?.toInt() ?? 0,
          totalQuestions: (m['total_count'] as num?)?.toInt() ?? 0,
          completedAt:    DateTime.tryParse(m['completed_at']?.toString() ?? '') ?? DateTime.now(),
        );
      }).toList();
    } catch (e) {
      debugPrint('⚠ getOirHistory: $e');
      return [];
    }
  }

  // ─── PPDT ──────────────────────────────────────────────────────────────────

  @override
  Future<void> savePpdtResult(PpdtResultModel result) async {
    try {
      await _db.from('test_history').insert({
        'user_id':        result.userId,
        'test_type':      'PPDT',
        'score':          0,
        'answered_count': 1,
        'total_count':    1,
        'feedback':       result.aiFeedback,
      });
    } catch (e) {
      debugPrint('⚠ savePpdtResult: $e');
    }
  }

  @override
  Future<List<PpdtResultModel>> getPpdtHistory(String userId) async {
    try {
      final rows = await _db
          .from('test_history')
          .select()
          .eq('user_id', userId)
          .eq('test_type', 'PPDT')
          .order('completed_at', ascending: false)
          .limit(20);
      return (rows as List).map((r) {
        final m = r as Map<String, dynamic>;
        return PpdtResultModel(
          id:          m['id']?.toString() ?? '',
          userId:      userId,
          imageUrl:    '',
          userStory:   '',
          aiFeedback:  m['feedback']?.toString() ?? '',
          completedAt: DateTime.tryParse(m['completed_at']?.toString() ?? '') ?? DateTime.now(),
        );
      }).toList();
    } catch (e) {
      debugPrint('⚠ getPpdtHistory: $e');
      return [];
    }
  }

  // ─── WAT ───────────────────────────────────────────────────────────────────

  @override
  Future<void> saveWatResult(WatResultModel result) async {
    try {
      await _db.from('test_history').insert({
        'user_id':        result.userId,
        'test_type':      'WAT',
        'score':          0,
        'answered_count': result.responses.values.where((v) => v.trim().isNotEmpty).length,
        'total_count':    result.responses.length,
        'feedback':       result.aiFeedback,
      });
    } catch (e) {
      debugPrint('⚠ saveWatResult: $e');
    }
  }

  @override
  Future<List<WatResultModel>> getWatHistory(String userId) async {
    try {
      final rows = await _db
          .from('test_history')
          .select()
          .eq('user_id', userId)
          .eq('test_type', 'WAT')
          .order('completed_at', ascending: false)
          .limit(20);
      return (rows as List).map((r) {
        final m = r as Map<String, dynamic>;
        return WatResultModel(
          id:          m['id']?.toString() ?? '',
          userId:      userId,
          responses:   const {},
          aiFeedback:  m['feedback']?.toString() ?? '',
          completedAt: DateTime.tryParse(m['completed_at']?.toString() ?? '') ?? DateTime.now(),
        );
      }).toList();
    } catch (e) {
      debugPrint('⚠ getWatHistory: $e');
      return [];
    }
  }

  // ─── SRT ───────────────────────────────────────────────────────────────────

  @override
  Future<void> saveSrtResult(SrtResultModel result) async {
    try {
      await _db.from('test_history').insert({
        'user_id':        result.userId,
        'test_type':      'SRT',
        'score':          0,
        'answered_count': result.responses.values.where((v) => v.trim().isNotEmpty).length,
        'total_count':    result.responses.length,
        'feedback':       result.aiFeedback,
      });
    } catch (e) {
      debugPrint('⚠ saveSrtResult: $e');
    }
  }

  @override
  Future<List<SrtResultModel>> getSrtHistory(String userId) async {
    try {
      final rows = await _db
          .from('test_history')
          .select()
          .eq('user_id', userId)
          .eq('test_type', 'SRT')
          .order('completed_at', ascending: false)
          .limit(20);
      return (rows as List).map((r) {
        final m = r as Map<String, dynamic>;
        return SrtResultModel(
          id:          m['id']?.toString() ?? '',
          userId:      userId,
          responses:   const {},
          aiFeedback:  m['feedback']?.toString() ?? '',
          completedAt: DateTime.tryParse(m['completed_at']?.toString() ?? '') ?? DateTime.now(),
        );
      }).toList();
    } catch (e) {
      debugPrint('⚠ getSrtHistory: $e');
      return [];
    }
  }

  // ─── TAT ───────────────────────────────────────────────────────────────────

  @override
  Future<void> saveTatResult(TatResultModel result) async {
    try {
      await _db.from('test_history').insert({
        'user_id':        result.userId,
        'test_type':      'TAT',
        'score':          0,
        'answered_count': 1,
        'total_count':    1,
        'feedback':       result.aiFeedback,
      });
    } catch (e) {
      debugPrint('⚠ saveTatResult: $e');
    }
  }

  @override
  Future<List<TatResultModel>> getTatHistory(String userId) async {
    try {
      final rows = await _db
          .from('test_history')
          .select()
          .eq('user_id', userId)
          .eq('test_type', 'TAT')
          .order('completed_at', ascending: false)
          .limit(20);
      return (rows as List).map((r) {
        final m = r as Map<String, dynamic>;
        return TatResultModel(
          id:          m['id']?.toString() ?? '',
          userId:      userId,
          imageIndex:  0,
          userStory:   '',
          aiFeedback:  m['feedback']?.toString() ?? '',
          completedAt: DateTime.tryParse(m['completed_at']?.toString() ?? '') ?? DateTime.now(),
        );
      }).toList();
    } catch (e) {
      debugPrint('⚠ getTatHistory: $e');
      return [];
    }
  }

  // ─── PIQ ───────────────────────────────────────────────────────────────────

  @override
  Future<void> savePiq(PiqModel piq) async {
    try {
      await _db.from('piq_profiles').upsert({
        'user_id': piq.userId,
        'data':    piq.toJson(),
      }, onConflict: 'user_id');
    } catch (e) {
      debugPrint('⚠ savePiq: $e');
    }
  }

  @override
  Future<PiqModel?> getPiq(String userId) async {
    try {
      final rows = await _db
          .from('piq_profiles')
          .select()
          .eq('user_id', userId)
          .limit(1);
      if ((rows as List).isEmpty) return null;
      final data = rows.first['data'] as Map<String, dynamic>? ?? {};
      return PiqModel.fromJson({'userId': userId, ...data});
    } catch (e) {
      debugPrint('⚠ getPiq: $e');
      return null;
    }
  }
}
