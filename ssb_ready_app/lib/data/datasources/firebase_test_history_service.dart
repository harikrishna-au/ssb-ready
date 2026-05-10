import 'package:ssb_ready_app/core/services/backend_api_client.dart';
import 'package:ssb_ready_app/data/models/oir_result_model.dart';
import 'package:ssb_ready_app/data/models/ppdt_result_model.dart';
import 'package:ssb_ready_app/data/models/wat_result_model.dart';
import 'package:ssb_ready_app/data/models/srt_result_model.dart';
import 'package:ssb_ready_app/data/models/tat_result_model.dart';
import 'package:ssb_ready_app/data/models/piq_model.dart';
import 'package:ssb_ready_app/domain/repositories/test_history_repository.dart';

class FirebaseTestHistoryService implements TestHistoryRepository {
  final BackendApiClient _apiClient;

  FirebaseTestHistoryService({BackendApiClient? apiClient})
      : _apiClient = apiClient ?? BackendApiClient();

  @override
  Future<void> saveOirResult(OirResultModel result) async {
    await _apiClient.post('/api/firestore/oir/results', {
      ...result.toJson(),
      'completedAt': result.completedAt.toIso8601String(),
    });
  }

  @override
  Future<void> savePpdtResult(PpdtResultModel result) async {
    await _apiClient.post('/api/firestore/ppdt/results', {
      ...result.toJson(),
      'completedAt': result.completedAt.toIso8601String(),
    });
  }

  @override
  Future<void> saveWatResult(WatResultModel result) async {
    await _apiClient.post('/api/firestore/wat/results', {
      ...result.toJson(),
      'completedAt': result.completedAt.toIso8601String(),
    });
  }

  @override
  Future<void> saveSrtResult(SrtResultModel result) async {
    await _apiClient.post('/api/firestore/srt/results', {
      ...result.toJson(),
      'completedAt': result.completedAt.toIso8601String(),
    });
  }

  @override
  Future<List<OirResultModel>> getOirHistory(String userId) async {
    final response = await _apiClient.get('/api/firestore/oir/history/$userId');
    final list = response['data'] as List<dynamic>? ?? [];
    return list
        .whereType<Map<String, dynamic>>()
        .map((json) => OirResultModel.fromJson(json, json['id'] ?? ''))
        .toList();
  }

  @override
  Future<List<PpdtResultModel>> getPpdtHistory(String userId) async {
    final response = await _apiClient.get('/api/firestore/ppdt/history/$userId');
    final list = response['data'] as List<dynamic>? ?? [];
    return list
        .whereType<Map<String, dynamic>>()
        .map((json) => PpdtResultModel.fromJson(json, json['id'] ?? ''))
        .toList();
  }

  @override
  Future<List<WatResultModel>> getWatHistory(String userId) async {
    final response = await _apiClient.get('/api/firestore/wat/history/$userId');
    final list = response['data'] as List<dynamic>? ?? [];
    return list
        .whereType<Map<String, dynamic>>()
        .map((json) => WatResultModel.fromJson(json, json['id'] ?? ''))
        .toList();
  }

  @override
  Future<List<SrtResultModel>> getSrtHistory(String userId) async {
    final response = await _apiClient.get('/api/firestore/srt/history/$userId');
    final list = response['data'] as List<dynamic>? ?? [];
    return list
        .whereType<Map<String, dynamic>>()
        .map((json) => SrtResultModel.fromJson(json, json['id'] ?? ''))
        .toList();
  }

  @override
  Future<void> saveTatResult(TatResultModel result) async {
    await _apiClient.post('/api/firestore/tat/results', {
      ...result.toJson(),
      'completedAt': result.completedAt.toIso8601String(),
    });
  }

  @override
  Future<List<TatResultModel>> getTatHistory(String userId) async {
    final response = await _apiClient.get('/api/firestore/tat/history/$userId');
    final list = response['data'] as List<dynamic>? ?? [];
    return list
        .whereType<Map<String, dynamic>>()
        .map((json) => TatResultModel.fromJson(json, json['id'] ?? ''))
        .toList();
  }

  @override
  Future<void> savePiq(PiqModel piq) async {
    await _apiClient.post('/api/firestore/piq', piq.toJson());
  }

  @override
  Future<PiqModel?> getPiq(String userId) async {
    final response = await _apiClient.get('/api/firestore/piq/$userId');
    final data = response['data'];
    if (data is Map<String, dynamic>) {
      return PiqModel.fromJson(data);
    }
    return null;
  }
}
