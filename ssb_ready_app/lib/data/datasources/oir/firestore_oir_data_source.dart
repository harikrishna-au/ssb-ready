import 'package:ssb_ready_app/core/services/backend_api_client.dart';
import 'package:ssb_ready_app/data/models/oir/question_model.dart';

class FirestoreOirDataSource {
  final BackendApiClient _apiClient;

  FirestoreOirDataSource({BackendApiClient? apiClient})
      : _apiClient = apiClient ?? BackendApiClient();

  Future<List<QuestionModel>> getQuestions() async {
    final response = await _apiClient.get('/api/firestore/oir/questions');
    final list = (response['data'] as List<dynamic>? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(QuestionModel.fromJson)
        .toList();
    if (list.isEmpty) {
      throw Exception(
        'No OIR questions found from backend.',
      );
    }
    return list;
  }
}
