import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:ssb_ready_app/core/services/ai_evaluation_service.dart';
import 'package:ssb_ready_app/domain/repositories/auth_repository.dart';
import 'package:ssb_ready_app/domain/repositories/test_history_repository.dart';
import 'package:ssb_ready_app/data/models/srt_result_model.dart';
import 'package:ssb_ready_app/presentation/bloc/srt/srt_event.dart';
import 'package:ssb_ready_app/presentation/bloc/srt/srt_state.dart';

class SrtBloc extends Bloc<SrtEvent, SrtState> {
  final AuthRepository _authRepository;
  final TestHistoryRepository _historyRepository;
  Timer? _timer;

  static const List<String> _sampleSituations = [
    'He was travelling in a bus and noticed a pickpocket stealing from an old lady. He...',
    'While leading a trekking group, the weather suddenly turned hostile with heavy rain and thunder. He...',
    'He found that his best friend was spreading rumours about him in the college. He...',
    'During a military exercise, his commanding officer collapsed due to a heat stroke. He...',
    'He noticed a child drowning in a lake and no one nearby knew how to swim. He...',
    'His team was losing badly in an inter-college debate competition with one round remaining. He...',
    'He discovered that an important exam paper had been leaked and some students had access to it. He...',
    'While driving on a highway, his car broke down in the middle of the night in an isolated area. He...',
    'He was the only officer in charge when a group of villagers came complaining about contaminated water supply. He...',
    'He received news of his selection for the academy but his family was facing a severe financial crisis. He...',
  ];

  SrtBloc(this._authRepository, this._historyRepository) : super(const SrtState()) {
    on<StartSrtTest>(_onStartSrtTest);
    on<TickTimer>(_onTickTimer);
    on<SubmitReaction>(_onSubmitReaction);
    on<NextSituation>(_onNextSituation);
  }

  void _onStartSrtTest(StartSrtTest event, Emitter<SrtState> emit) {
    emit(state.copyWith(
      status: SrtStatus.inProgress,
      situations: _sampleSituations,
      currentSituationIndex: 0,
      globalTimeRemaining: 300, // 5 minutes
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

  void _onTickTimer(TickTimer event, Emitter<SrtState> emit) {
    if (state.status != SrtStatus.inProgress) return;

    if (state.globalTimeRemaining > 0) {
      emit(state.copyWith(globalTimeRemaining: state.globalTimeRemaining - 1));
    }
    // When timer hits 0, the UI will intercept and trigger finalization
  }

  void _onSubmitReaction(SubmitReaction event, Emitter<SrtState> emit) {
    if (state.status != SrtStatus.inProgress) return;

    final updatedResponses = Map<String, String>.from(state.responses);
    updatedResponses[state.currentSituation] = event.reaction.trim();

    emit(state.copyWith(responses: updatedResponses));
  }

  Future<void> _onNextSituation(NextSituation event, Emitter<SrtState> emit) async {
    if (state.status != SrtStatus.inProgress) return;

    if (state.currentSituationIndex < state.situations.length - 1) {
      emit(state.copyWith(
        currentSituationIndex: state.currentSituationIndex + 1,
      ));
    } else {
      // All situations answered, finish test
      await _finishTest(emit);
    }
  }

  Future<void> _finishTest(Emitter<SrtState> emit) async {
    _timer?.cancel();
    emit(state.copyWith(status: SrtStatus.analyzing));

    try {
      final aiService = await AiEvaluationService.initialize();
      if (aiService == null) {
        throw Exception('AI Service failed to initialize.');
      }

      final evaluation = await aiService.evaluateSrt(state.responses);
      final feedbackMarkdown = evaluation.toMarkdown();

      emit(state.copyWith(
        status: SrtStatus.completed,
        feedback: feedbackMarkdown,
      ));

      final user = await _authRepository.getCurrentUser();
      if (user != null) {
        final result = SrtResultModel(
          id: '',
          userId: user.id,
          responses: state.responses,
          aiFeedback: feedbackMarkdown,
          completedAt: DateTime.now(),
        );
        await _historyRepository.saveSrtResult(result);
      }
    } catch (e) {
      emit(state.copyWith(
        status: SrtStatus.error,
        errorMessage: e.toString().replaceAll('Exception: ', ''),
      ));
    }
  }

  /// Called externally (from UI) when global timer expires
  Future<void> finishTestFromUI(Emitter<SrtState>? emit) async {
    // This is handled via NextSituation or via the BlocListener
  }

  @override
  Future<void> close() {
    _timer?.cancel();
    return super.close();
  }
}
