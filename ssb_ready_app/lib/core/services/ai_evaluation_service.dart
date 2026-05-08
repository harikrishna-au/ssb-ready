import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:google_generative_ai/google_generative_ai.dart';
import 'package:ssb_ready_app/data/models/ppdt_evaluation_model.dart';
import 'package:ssb_ready_app/data/models/wat_evaluation_model.dart';
import 'package:ssb_ready_app/data/models/srt_evaluation_model.dart';
import 'package:ssb_ready_app/data/models/tat_evaluation_model.dart';
import 'package:ssb_ready_app/data/models/piq_model.dart';

class AiEvaluationService {
  static const String _modelName = 'gemini-1.5-flash';

  final GenerativeModel? _model;

  AiEvaluationService._({GenerativeModel? model}) : _model = model;

  /// Initializes the AI Service. 
  /// Returns null if GEMINI_API_KEY is not set in .env.
  static Future<AiEvaluationService?> initialize() async {
    final apiKey = dotenv.env['GEMINI_API_KEY'];
    if (apiKey == null || apiKey.isEmpty) {
      debugPrint('Warning: GEMINI_API_KEY not found in .env');
      return AiEvaluationService._(); // Return an instance with a null model to handle gracefully
    }

    final model = GenerativeModel(
      model: _modelName,
      apiKey: apiKey,
    );
    
    return AiEvaluationService._(model: model);
  }

  /// Evaluates a PPDT story using Gemini.
  Future<PpdtEvaluationModel> evaluateStory(String story) async {
    if (_model == null) {
      throw Exception('Gemini API Key is missing. Please add GEMINI_API_KEY to your .env file.');
    }

    final prompt = '''
You are an expert Services Selection Board (SSB) Assessor (GTO/Psychologist) for the Indian Armed Forces.
You are evaluating a candidate's story written for the Picture Perception and Description Test (PPDT).

Analyze the following story based on these strict criteria:
1. Identify the core Theme (is it constructive, negative, or neutral?).
2. Evaluate the Actions taken by the central character (were they proactive, logical, and conclusive?).
3. Look for explicit demonstrations of the 15 Officer Like Qualities (OLQs) such as Initiative, Courage, Social Adaptability, Liveliness, Reasoning Ability, etc.
4. Provide actionable feedback for improvement.
5. Give an overall score out of 10.

Return your analysis strictly as a valid JSON object matching this schema exactly:
{
  "theme": "string",
  "action": "string",
  "identified_olqs": ["string", "string"],
  "feedback": "string",
  "score": number
}

The candidate's story is:
"$story"

Respond ONLY with valid JSON. Do not use Markdown block syntax (```json) around your response.
''';

    try {
      final content = [Content.text(prompt)];
      final response = await _model!.generateContent(content);
      
      final String? responseText = response.text;
      
      if (responseText == null || responseText.isEmpty) {
        throw Exception('AI returned an empty response.');
      }

      // Clean the response text in case the model ignored the instructions and wrapped in ```json
      String cleanJson = responseText.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.substring(7);
      }
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.substring(3);
      }
      if (cleanJson.endsWith('```')) {
        cleanJson = cleanJson.substring(0, cleanJson.length - 3);
      }
      cleanJson = cleanJson.trim();

      final Map<String, dynamic> jsonMap = jsonDecode(cleanJson);
      return PpdtEvaluationModel.fromJson(jsonMap);

    } catch (e) {
      debugPrint('AI Evaluation Error: $e');
      throw Exception('Failed to evaluate story. Please try again.');
    }
  }

  /// Evaluates WAT responses using Gemini.
  Future<WatEvaluationModel> evaluateWat(Map<String, String> responses) async {
    if (_model == null) {
      throw Exception('Gemini API Key is missing. Please add GEMINI_API_KEY to your .env file.');
    }

    final promptBuffer = StringBuffer();
    promptBuffer.writeln('You are an expert Services Selection Board (SSB) Psychologist.');
    promptBuffer.writeln('Evaluate the following Word Association Test (WAT) responses from a candidate.');
    promptBuffer.writeln('Criteria:');
    promptBuffer.writeln('1. Sentences should be positive, spontaneous, and meaningful.');
    promptBuffer.writeln('2. Look for Officer Like Qualities (OLQs) like Positivity, Courage, Determination, Social Adaptability, etc.');
    promptBuffer.writeln('3. Provide overall feedback and a score out of 10.');
    promptBuffer.writeln();
    promptBuffer.writeln('Return your analysis strictly as a valid JSON object matching this schema exactly:');
    promptBuffer.writeln('{');
    promptBuffer.writeln('  "identified_olqs": ["string", "string"],');
    promptBuffer.writeln('  "feedback": "string",');
    promptBuffer.writeln('  "score": number');
    promptBuffer.writeln('}');
    promptBuffer.writeln();
    promptBuffer.writeln('Responses:');
    responses.forEach((word, sentence) {
      promptBuffer.writeln('Word: "$word" -> Sentence: "$sentence"');
    });
    promptBuffer.writeln();
    promptBuffer.writeln('Respond ONLY with valid JSON. Do not use Markdown block syntax (```json) around your response.');

    try {
      final content = [Content.text(promptBuffer.toString())];
      final response = await _model!.generateContent(content);
      
      final String? responseText = response.text;
      
      if (responseText == null || responseText.isEmpty) {
        throw Exception('AI returned an empty response.');
      }

      String cleanJson = responseText.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.substring(7);
      }
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.substring(3);
      }
      if (cleanJson.endsWith('```')) {
        cleanJson = cleanJson.substring(0, cleanJson.length - 3);
      }
      cleanJson = cleanJson.trim();

      final Map<String, dynamic> jsonMap = jsonDecode(cleanJson);
      return WatEvaluationModel.fromJson(jsonMap);

    } catch (e) {
      debugPrint('AI Evaluation Error: $e');
      throw Exception('Failed to evaluate WAT responses. Please try again.');
    }
  }

  /// Evaluates SRT responses using Gemini.
  Future<SrtEvaluationModel> evaluateSrt(Map<String, String> responses) async {
    if (_model == null) {
      throw Exception('Gemini API Key is missing. Please add GEMINI_API_KEY to your .env file.');
    }

    final promptBuffer = StringBuffer();
    promptBuffer.writeln('You are an expert Services Selection Board (SSB) Psychologist.');
    promptBuffer.writeln('Evaluate the following Situation Reaction Test (SRT) responses from a candidate.');
    promptBuffer.writeln('Criteria:');
    promptBuffer.writeln('1. Reactions should be practical, decisive, and show leadership.');
    promptBuffer.writeln('2. Look for Officer Like Qualities (OLQs) like Initiative, Courage, Determination, Responsibility, and Social Adaptability.');
    promptBuffer.writeln('3. Reactions should NOT be escapist, passive, or unrealistic.');
    promptBuffer.writeln('4. Provide overall feedback and a score out of 10.');
    promptBuffer.writeln();
    promptBuffer.writeln('Return your analysis strictly as a valid JSON object matching this schema exactly:');
    promptBuffer.writeln('{');
    promptBuffer.writeln('  "identified_olqs": ["string", "string"],');
    promptBuffer.writeln('  "feedback": "string",');
    promptBuffer.writeln('  "score": number');
    promptBuffer.writeln('}');
    promptBuffer.writeln();
    promptBuffer.writeln('Responses:');
    int i = 1;
    responses.forEach((situation, reaction) {
      promptBuffer.writeln('Situation $i: "$situation"');
      promptBuffer.writeln('Reaction: "$reaction"');
      promptBuffer.writeln();
      i++;
    });
    promptBuffer.writeln('Respond ONLY with valid JSON. Do not use Markdown block syntax (```json) around your response.');

    try {
      final content = [Content.text(promptBuffer.toString())];
      final response = await _model!.generateContent(content);
      
      final String? responseText = response.text;
      
      if (responseText == null || responseText.isEmpty) {
        throw Exception('AI returned an empty response.');
      }

      String cleanJson = responseText.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.substring(7);
      }
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.substring(3);
      }
      if (cleanJson.endsWith('```')) {
        cleanJson = cleanJson.substring(0, cleanJson.length - 3);
      }
      cleanJson = cleanJson.trim();

      final Map<String, dynamic> jsonMap = jsonDecode(cleanJson);
      return SrtEvaluationModel.fromJson(jsonMap);

    } catch (e) {
      debugPrint('AI Evaluation Error: $e');
      throw Exception('Failed to evaluate SRT responses. Please try again.');
    }
  }

  /// Evaluates a TAT story using Gemini.
  Future<TatEvaluationModel> evaluateTat(String imageDescription, String story) async {
    if (_model == null) {
      throw Exception('Gemini API Key is missing. Please add GEMINI_API_KEY to your .env file.');
    }

    final prompt = '''
You are an expert Services Selection Board (SSB) Psychologist.
You are evaluating a candidate's story written for the Thematic Apperception Test (TAT).

The image shown to the candidate depicted the following scene:
"$imageDescription"

Analyze the following story based on these strict criteria:
1. Identify the core Theme (is it constructive, negative, or neutral?).
2. Evaluate the Actions taken by the central character (were they proactive, logical, and conclusive?).
3. Look for explicit demonstrations of the 15 Officer Like Qualities (OLQs) such as Initiative, Courage, Social Adaptability, Liveliness, Reasoning Ability, etc.
4. Provide actionable feedback for improvement.
5. Give an overall score out of 10.

Return your analysis strictly as a valid JSON object matching this schema exactly:
{
  "theme": "string",
  "action": "string",
  "identified_olqs": ["string", "string"],
  "feedback": "string",
  "score": number
}

The candidate's story is:
"$story"

Respond ONLY with valid JSON. Do not use Markdown block syntax around your response.
''';

    try {
      final content = [Content.text(prompt)];
      final response = await _model!.generateContent(content);
      
      final String? responseText = response.text;
      
      if (responseText == null || responseText.isEmpty) {
        throw Exception('AI returned an empty response.');
      }

      String cleanJson = responseText.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.substring(7);
      }
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.substring(3);
      }
      if (cleanJson.endsWith('```')) {
        cleanJson = cleanJson.substring(0, cleanJson.length - 3);
      }
      cleanJson = cleanJson.trim();

      final Map<String, dynamic> jsonMap = jsonDecode(cleanJson);
      return TatEvaluationModel.fromJson(jsonMap);

    } catch (e) {
      debugPrint('AI Evaluation Error: \$e');
      throw Exception('Failed to evaluate TAT story. Please try again.');
    }
  }

  /// Generates the next response from the Interviewing Officer (IO) during a mock interview.
  Future<String> generateInterviewResponse(PiqModel piq, List<Map<String, String>> chatHistory) async {
    if (_model == null) {
      throw Exception('Gemini API Key is missing.');
    }

    final promptBuffer = StringBuffer();
    promptBuffer.writeln('You are a seasoned Interviewing Officer (IO) at a Services Selection Board (SSB).');
    promptBuffer.writeln('Your goal is to conduct a professional, realistic, and probing interview for a defense aspirant.');
    promptBuffer.writeln('Base your questions on the candidate\'s PIQ data provided below:');
    promptBuffer.writeln('--- CANDIDATE PIQ ---');
    promptBuffer.writeln('Name: ${piq.fullName}');
    promptBuffer.writeln('Place: ${piq.placeOfResidence}, ${piq.district}, ${piq.state}');
    promptBuffer.writeln('Education: 10th: ${piq.tenthPercentage}%, 12th: ${piq.twelfthPercentage}%, Grad: ${piq.graduationPercentage}%');
    promptBuffer.writeln('Family: Father (${piq.fatherOccupation}), Mother (${piq.motherOccupation})');
    promptBuffer.writeln('Hobbies: ${piq.hobbies}');
    promptBuffer.writeln('Sports: ${piq.gamesSports}');
    promptBuffer.writeln('NCC/Responsibilities: ${piq.nccTraining}, ${piq.responsibilitiesHeld}');
    promptBuffer.writeln('--- END PIQ ---');
    promptBuffer.writeln();
    promptBuffer.writeln('Guidelines:');
    promptBuffer.writeln('1. Be formal yet observant. Call the candidate by name occasionally.');
    promptBuffer.writeln('2. Ask one clear question or a small set of related questions (like a Rapid Fire round).');
    promptBuffer.writeln('3. Probe into their education, family, hobbies, or reasons for joining the armed forces.');
    promptBuffer.writeln('4. If the candidate gives a brief answer, probe deeper.');
    promptBuffer.writeln('5. Stay in character as a Colonel/Captain/Group Captain.');
    promptBuffer.writeln();
    promptBuffer.writeln('Conversation so far:');
    for (var msg in chatHistory) {
      promptBuffer.writeln('${msg['role'] == 'user' ? 'Candidate' : 'IO'}: ${msg['content']}');
    }
    promptBuffer.writeln('IO:');

    try {
      final content = [Content.text(promptBuffer.toString())];
      final response = await _model!.generateContent(content);
      return response.text ?? 'I see. Tell me more about that.';
    } catch (e) {
      debugPrint('AI Interview Error: $e');
      throw Exception('Failed to generate interview response.');
    }
  }
}
