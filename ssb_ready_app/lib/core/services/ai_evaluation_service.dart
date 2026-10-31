import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'package:ssb_ready_app/core/services/rate_limiter.dart';
import 'package:ssb_ready_app/data/models/ppdt_evaluation_model.dart';
import 'package:ssb_ready_app/data/models/wat_evaluation_model.dart';
import 'package:ssb_ready_app/data/models/srt_evaluation_model.dart';
import 'package:ssb_ready_app/data/models/tat_evaluation_model.dart';
import 'package:ssb_ready_app/data/models/piq_model.dart';
import 'package:ssb_ready_app/core/services/evaluation_pipeline_service.dart';

class AiEvaluationService {
  static const String _model = 'gpt-4o-mini';
  static const String _openAiUrl = 'https://api.openai.com/v1/chat/completions';

  final String? _apiKey;
  final String? _backendUrl;

  AiEvaluationService._({String? apiKey, String? backendUrl})
      : _apiKey = apiKey,
        _backendUrl = backendUrl?.trim().isNotEmpty == true
            ? backendUrl!.trim().replaceAll(RegExp(r'/$'), '')
            : null;

  /// Initializes using OPENAI_API_KEY from .env.
  /// OPENAI_API_KEY takes priority over BACKEND_URL for AI evaluation.
  static Future<AiEvaluationService?> initialize() async {
    final backendUrl = dotenv.env['BACKEND_URL'];
    final apiKey = dotenv.env['OPENAI_API_KEY'];

    // If OpenAI key is set, always use it directly — ignore backend for AI.
    if (apiKey != null && apiKey.trim().isNotEmpty && !apiKey.contains('your-openai')) {
      debugPrint('✓ Using OpenAI directly (gpt-4o-mini)');
      return AiEvaluationService._(apiKey: apiKey.trim());
    }

    // Fall back to hosted backend if no OpenAI key.
    if (backendUrl != null && backendUrl.trim().isNotEmpty) {
      debugPrint('✓ Using backend for AI: $backendUrl');
      return AiEvaluationService._(backendUrl: backendUrl);
    }

    debugPrint('Warning: No OPENAI_API_KEY or BACKEND_URL found in .env');
    return AiEvaluationService._();
  }

  // ─── OpenAI Chat Completions helper ──────────────────────────────────────

  /// Calls OpenAI Chat API and returns the response text.
  Future<String> _openAiChat(String prompt, {bool jsonMode = false}) async {
    if (_apiKey == null) {
      throw Exception('OPENAI_API_KEY is missing. Please add it to your .env file.');
    }

    final body = <String, dynamic>{
      'model': _model,
      'messages': [
        {'role': 'user', 'content': prompt},
      ],
      'temperature': 0.4,
    };

    if (jsonMode) {
      body['response_format'] = {'type': 'json_object'};
    }

    final response = await http.post(
      Uri.parse(_openAiUrl),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $_apiKey',
      },
      body: jsonEncode(body),
    );

    if (response.statusCode != 200) {
      debugPrint('OpenAI error ${response.statusCode}: ${response.body}');
      throw Exception('OpenAI request failed (${response.statusCode}).');
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    final text = decoded['choices']?[0]?['message']?['content'] as String?;
    if (text == null || text.isEmpty) {
      throw Exception('OpenAI returned an empty response.');
    }
    return text.trim();
  }

  // ─── Rate limiting ───────────────────────────────────────────────────────

  /// Enforces two AI evaluation limits:
  /// - Daily cap: [RateLimiter.aiDailyMax] evaluations per calendar day.
  /// - Burst cap: [RateLimiter.aiBurstMax] evaluations per
  ///   [RateLimiter.aiBurstWindow].
  ///
  /// Throws [Exception] with a user-friendly message if either limit is hit.
  static Future<void> _checkRateLimit() async {
    // 1. Daily cap (calendar-day aligned key)
    final dailyResult = await RateLimiter.checkAsync(
      key:         RateLimiter.aiDailyKey(),
      maxAttempts: RateLimiter.aiDailyMax,
      window:      RateLimiter.aiDailyWindow,
    );
    if (!dailyResult.allowed) {
      throw Exception(
        'You\'ve used your ${RateLimiter.aiDailyMax} free AI evaluations for today. '
        'Come back tomorrow to continue practising!',
      );
    }

    // 2. Burst cap (rolling window)
    final burstResult = await RateLimiter.checkAsync(
      key:         RateLimiter.aiBurstKey,
      maxAttempts: RateLimiter.aiBurstMax,
      window:      RateLimiter.aiBurstWindow,
    );
    if (!burstResult.allowed) {
      throw Exception(
        'Please wait a moment before requesting another evaluation. '
        '${burstResult.lockoutMessage}.',
      );
    }
  }

  /// Strips markdown code fences if model wraps JSON in them.
  String _cleanJson(String raw) {
    String s = raw.trim();
    if (s.startsWith('```json')) s = s.substring(7);
    if (s.startsWith('```')) s = s.substring(3);
    if (s.endsWith('```')) s = s.substring(0, s.length - 3);
    return s.trim();
  }

  // ─── Backend POST helper ──────────────────────────────────────────────────

  Future<Map<String, dynamic>> _postJson(
    String path,
    Map<String, dynamic> body,
  ) async {
    if (_backendUrl == null) {
      throw Exception('BACKEND_URL is missing. Backend mode is not configured.');
    }

    final response = await http.post(
      Uri.parse('$_backendUrl$path'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        'Backend request failed (${response.statusCode}): ${response.body}',
      );
    }

    final decoded = jsonDecode(response.body);
    if (decoded is! Map<String, dynamic>) {
      throw Exception('Backend response is not a JSON object.');
    }
    return decoded;
  }

  // ─── PPDT ─────────────────────────────────────────────────────────────────

  Future<PpdtEvaluationModel> evaluateStory(String story) async {
    await _checkRateLimit();
    if (_backendUrl != null) {
      final jsonMap = await _postJson('/api/evaluate/ppdt', {'story': story});
      return PpdtEvaluationModel.fromJson(jsonMap);
    }

    final prompt = '''
You are an expert Services Selection Board (SSB) Assessor for the Indian Armed Forces.
Evaluate the following PPDT story based on:
1. Core Theme (constructive / negative / neutral)
2. Actions of the central character (proactive, logical, conclusive?)
3. Officer Like Qualities (OLQs) demonstrated (Initiative, Courage, Social Adaptability, etc.)
4. Actionable feedback for improvement
5. Overall score out of 10

Return ONLY a valid JSON object with this exact schema:
{
  "theme": "string",
  "action": "string",
  "identified_olqs": ["string"],
  "feedback": "string",
  "score": number
}

Story: "$story"
''';

    try {
      final raw = await _openAiChat(prompt, jsonMode: true);
      return PpdtEvaluationModel.fromJson(
          jsonDecode(_cleanJson(raw)) as Map<String, dynamic>);
    } catch (e) {
      debugPrint('PPDT eval error: $e');
      throw Exception('Failed to evaluate PPDT story. Please try again.');
    }
  }

  // ─── WAT ──────────────────────────────────────────────────────────────────

  Future<WatEvaluationModel> evaluateWat(Map<String, String> responses) async {
    await _checkRateLimit();
    if (_backendUrl != null) {
      final jsonMap =
          await _postJson('/api/evaluate/wat', {'responses': responses});
      return WatEvaluationModel.fromJson(jsonMap);
    }

    final buffer = StringBuffer();
    buffer.writeln(
        'You are an expert SSB Psychologist. Evaluate these Word Association Test (WAT) responses.');
    buffer.writeln('Criteria:');
    buffer.writeln(
        '1. Sentences should be positive, spontaneous, and meaningful.');
    buffer.writeln(
        '2. Look for OLQs: Positivity, Courage, Determination, Social Adaptability, etc.');
    buffer.writeln('3. Provide overall feedback and a score out of 10.');
    buffer.writeln();
    buffer.writeln('Return ONLY a valid JSON object:');
    buffer.writeln(
        '{ "identified_olqs": ["string"], "feedback": "string", "score": number }');
    buffer.writeln();
    buffer.writeln('Responses:');
    responses.forEach((word, sentence) {
      buffer.writeln('Word: "$word" -> "$sentence"');
    });

    try {
      final raw = await _openAiChat(buffer.toString(), jsonMode: true);
      return WatEvaluationModel.fromJson(
          jsonDecode(_cleanJson(raw)) as Map<String, dynamic>);
    } catch (e) {
      debugPrint('WAT eval error: $e');
      throw Exception('Failed to evaluate WAT responses. Please try again.');
    }
  }

  // ─── SRT ──────────────────────────────────────────────────────────────────

  Future<SrtEvaluationModel> evaluateSrt(Map<String, String> responses) async {
    await _checkRateLimit();
    if (_backendUrl != null) {
      final jsonMap =
          await _postJson('/api/evaluate/srt', {'responses': responses});
      return SrtEvaluationModel.fromJson(jsonMap);
    }

    final buffer = StringBuffer();
    buffer.writeln(
        'You are an expert SSB Psychologist. Evaluate these Situation Reaction Test (SRT) responses.');
    buffer.writeln('Criteria:');
    buffer.writeln(
        '1. Reactions should be practical, decisive, and show leadership.');
    buffer.writeln(
        '2. Look for OLQs: Initiative, Courage, Determination, Responsibility, Social Adaptability.');
    buffer.writeln(
        '3. Reactions should NOT be escapist, passive, or unrealistic.');
    buffer.writeln('4. Provide overall feedback and a score out of 10.');
    buffer.writeln();
    buffer.writeln('Return ONLY a valid JSON object:');
    buffer.writeln(
        '{ "identified_olqs": ["string"], "feedback": "string", "score": number }');
    buffer.writeln();
    int i = 1;
    responses.forEach((situation, reaction) {
      buffer.writeln('Situation $i: "$situation"');
      buffer.writeln('Reaction: "$reaction"');
      buffer.writeln();
      i++;
    });

    try {
      final raw = await _openAiChat(buffer.toString(), jsonMode: true);
      return SrtEvaluationModel.fromJson(
          jsonDecode(_cleanJson(raw)) as Map<String, dynamic>);
    } catch (e) {
      debugPrint('SRT eval error: $e');
      throw Exception('Failed to evaluate SRT responses. Please try again.');
    }
  }

  // ─── TAT ──────────────────────────────────────────────────────────────────

  Future<TatEvaluationModel> evaluateTat(
      String imageDescription, String story) async {
    await _checkRateLimit();
    if (_backendUrl != null) {
      final jsonMap = await _postJson('/api/evaluate/tat', {
        'imageDescription': imageDescription,
        'story': story,
      });
      return TatEvaluationModel.fromJson(jsonMap);
    }

    final prompt = '''
You are an expert SSB Psychologist evaluating a TAT story.
Image shown: "$imageDescription"

Evaluate based on:
1. Core Theme (constructive / negative / neutral)
2. Actions of the central character
3. OLQs demonstrated (Initiative, Courage, Social Adaptability, etc.)
4. Actionable feedback
5. Score out of 10

Return ONLY a valid JSON object:
{
  "theme": "string",
  "action": "string",
  "identified_olqs": ["string"],
  "feedback": "string",
  "score": number
}

Story: "$story"
''';

    try {
      final raw = await _openAiChat(prompt, jsonMode: true);
      return TatEvaluationModel.fromJson(
          jsonDecode(_cleanJson(raw)) as Map<String, dynamic>);
    } catch (e) {
      debugPrint('TAT eval error: $e');
      throw Exception('Failed to evaluate TAT story. Please try again.');
    }
  }

  // ─── SDT ──────────────────────────────────────────────────────────────────

  Future<String> evaluateSdt(Map<String, String> responses) async {
    await _checkRateLimit();
    if (_backendUrl != null) {
      final raw = await EvaluationPipelineService().run(
        testType: 'SDT',
        payload: {'responses': responses},
      );
      return raw['analysis'] as String? ?? raw.toString();
    }

    final buffer = StringBuffer();
    buffer.writeln(
        'You are an expert SSB psychologist evaluating a Self Description Test (SDT).');
    buffer.writeln(
        'The candidate wrote how 5 groups see them. Evaluate against SSB OLQs.');
    buffer.writeln();
    buffer.writeln('SDT Responses:');
    for (final entry in responses.entries) {
      buffer.writeln(
          '${entry.key.toUpperCase()}: ${entry.value.trim().isEmpty ? "(No response)" : entry.value.trim()}');
      buffer.writeln();
    }
    buffer.writeln('Provide a detailed markdown analysis covering:');
    buffer.writeln('1. Overall Consistency — do the 5 perspectives align?');
    buffer.writeln('2. OLQ Indicators — which OLQs are evident?');
    buffer.writeln('3. Self-Awareness — honest and balanced?');
    buffer.writeln('4. Red Flags — contradictions or over-glorification?');
    buffer.writeln('5. Improvement Tips — 2-3 specific suggestions.');

    try {
      return await _openAiChat(buffer.toString());
    } catch (e) {
      debugPrint('SDT eval error: $e');
      throw Exception('Failed to evaluate SDT responses. Please try again.');
    }
  }

  // ─── Mock Interview ───────────────────────────────────────────────────────

  Future<String> generateInterviewResponse(
      PiqModel piq, List<Map<String, String>> chatHistory) async {
    await _checkRateLimit();
    if (_backendUrl != null) {
      final raw = await EvaluationPipelineService().run(
        testType: 'INTERVIEW_REPLY',
        payload: {
          'piq': piq.toJson(),
          'chatHistory': chatHistory,
        },
      );
      final reply = (raw['reply'] as String?)?.trim();
      return reply != null && reply.isNotEmpty
          ? reply
          : 'I see. Tell me more about that.';
    }

    final buffer = StringBuffer();
    buffer.writeln(
        'You are a seasoned Interviewing Officer (IO) at a Services Selection Board (SSB).');
    buffer.writeln(
        'Conduct a professional, realistic, and probing interview for a defence aspirant.');
    buffer.writeln('Base your questions on this PIQ:');
    buffer.writeln('Name: ${piq.fullName}');
    buffer.writeln(
        'Place: ${piq.placeOfResidence}, ${piq.district}, ${piq.state}');
    buffer.writeln(
        'Education: 10th: ${piq.tenthPercentage}%, 12th: ${piq.twelfthPercentage}%, Grad: ${piq.graduationPercentage}%');
    buffer.writeln(
        'Family: Father (${piq.fatherOccupation}), Mother (${piq.motherOccupation})');
    buffer.writeln('Hobbies: ${piq.hobbies}');
    buffer.writeln('Sports: ${piq.gamesSports}');
    buffer.writeln(
        'NCC/Responsibilities: ${piq.nccTraining}, ${piq.responsibilitiesHeld}');
    buffer.writeln();
    buffer.writeln('Guidelines:');
    buffer.writeln('1. Be formal yet observant. Use the candidate\'s name occasionally.');
    buffer.writeln('2. Ask one clear question or a small related set.');
    buffer.writeln('3. Probe education, family, hobbies, or motivation.');
    buffer.writeln('4. If answer is brief, probe deeper.');
    buffer.writeln('5. Stay in character as a Colonel/Group Captain.');
    buffer.writeln();
    buffer.writeln('Conversation so far:');
    for (final msg in chatHistory) {
      buffer.writeln(
          '${msg['role'] == 'user' ? 'Candidate' : 'IO'}: ${msg['content']}');
    }
    buffer.writeln('IO:');

    try {
      return await _openAiChat(buffer.toString());
    } catch (e) {
      debugPrint('Interview AI error: $e');
      throw Exception('Failed to generate interview response.');
    }
  }
}
