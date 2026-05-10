import 'package:ssb_ready_app/core/services/backend_api_client.dart';

/// Single entry for AI evaluation + Firestore persistence (server-side).
class EvaluationPipelineService {
  EvaluationPipelineService({BackendApiClient? client})
      : _client = client ?? BackendApiClient();

  final BackendApiClient _client;

  /// [testType]: `WAT`, `SRT`, `OIR`, `INTERVIEW_REPLY`
  Future<Map<String, dynamic>> run({
    required String testType,
    required Map<String, dynamic> payload,
  }) {
    return _client.post('/api/evaluation/run', {
      'testType': testType,
      'payload': payload,
    });
  }
}
