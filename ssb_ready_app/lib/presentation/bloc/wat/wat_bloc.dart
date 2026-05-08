import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:ssb_ready_app/core/services/ai_evaluation_service.dart';
import 'package:ssb_ready_app/domain/repositories/auth_repository.dart';
import 'package:ssb_ready_app/domain/repositories/test_history_repository.dart';
import 'package:ssb_ready_app/data/models/wat_result_model.dart';
import 'package:ssb_ready_app/presentation/bloc/wat/wat_event.dart';
import 'package:ssb_ready_app/presentation/bloc/wat/wat_state.dart';

class WatBloc extends Bloc<WatEvent, WatState> {
  final AuthRepository _authRepository;
  final TestHistoryRepository _historyRepository;
  Timer? _timer;

  static const List<String> _sampleWords = [
    'Attack', 'Mother', 'Fail', 'Leader', 'Defeat', 
    'Courage', 'Afraid', 'Success', 'Weapon', 'Dark',
    'Enemy', 'Help', 'Officer', 'Problem', 'Worry'
  ]; // Using 15 words for practice instead of 60 to save API costs

  WatBloc(this._authRepository, this._historyRepository) : super(const WatState()) {
    on<StartWatTest>(_onStartWatTest);
    on<TickTimer>(_onTickTimer);
    on<SubmitSentence>(_onSubmitSentence);
  }

  void _onStartWatTest(StartWatTest event, Emitter<WatState> emit) {
    emit(state.copyWith(
      status: WatStatus.inProgress,
      words: _sampleWords,
      currentWordIndex: 0,
      timeRemaining: 15,
      responses: {},
      feedback: null,
      errorMessage: null,
    ));

    _startTimer();
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      add(TickTimer());
    });
  }

  void _onTickTimer(TickTimer event, Emitter<WatState> emit) {
    if (state.status != WatStatus.inProgress) return;

    if (state.timeRemaining > 0) {
      emit(state.copyWith(timeRemaining: state.timeRemaining - 1));
    }
    // Note: When timeRemaining hits 0, the UI will intercept it in a BlocListener
    // and fire SubmitSentence with the current text.
  }

  Future<void> _onSubmitSentence(SubmitSentence event, Emitter<WatState> emit) async {
    if (state.status != WatStatus.inProgress) return;

    // Save response
    final updatedResponses = Map<String, String>.from(state.responses);
    updatedResponses[state.currentWord] = event.sentence.trim();

    if (state.currentWordIndex < state.words.length - 1) {
      // Move to next word
      emit(state.copyWith(
        responses: updatedResponses,
        currentWordIndex: state.currentWordIndex + 1,
        timeRemaining: 15,
      ));
      _startTimer();
    } else {
      // Finish test
      _timer?.cancel();
      emit(state.copyWith(
        status: WatStatus.analyzing,
        responses: updatedResponses,
      ));
      await _analyzeAndSave(emit, updatedResponses);
    }
  }

  Future<void> _analyzeAndSave(Emitter<WatState> emit, Map<String, String> responses) async {
    try {
      final aiService = await AiEvaluationService.initialize();
      if (aiService == null) {
        throw Exception('AI Service failed to initialize.');
      }

      // Convert responses to a single block of text for Gemini
      final promptBuffer = StringBuffer();
      promptBuffer.writeln('Evaluate the following Word Association Test responses for Officer Like Qualities (OLQs).');
      responses.forEach((word, sentence) {
        promptBuffer.writeln('Word: "$word" -> Sentence: "$sentence"');
      });

      // We reuse the existing evaluateStory method for simplicity, but pass the WAT prompt.
      // Alternatively, AiEvaluationService should have a dedicated evaluateWat method.
      // For now, we'll format it so the AI understands it's evaluating a list of WAT sentences.
      final evaluation = await aiService.evaluateWat(responses);
      final feedbackMarkdown = evaluation.toMarkdown();

      emit(state.copyWith(
        status: WatStatus.completed,
        feedback: feedbackMarkdown,
      ));

      final user = await _authRepository.getCurrentUser();
      if (user != null) {
        final result = WatResultModel(
          id: '',
          userId: user.id,
          responses: responses,
          aiFeedback: feedbackMarkdown,
          completedAt: DateTime.now(),
        );
        await _historyRepository.saveWatResult(result);
      }
    } catch (e) {
      emit(state.copyWith(
        status: WatStatus.error,
        errorMessage: e.toString().replaceAll('Exception: ', ''),
      ));
    }
  }

  @override
  Future<void> close() {
    _timer?.cancel();
    return super.close();
  }
}
