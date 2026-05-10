import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:ssb_ready_app/core/services/evaluation_pipeline_service.dart';
import 'package:ssb_ready_app/data/models/srt_evaluation_model.dart';
import 'package:ssb_ready_app/presentation/bloc/srt/srt_event.dart';
import 'package:ssb_ready_app/presentation/bloc/srt/srt_state.dart';

class SrtBloc extends Bloc<SrtEvent, SrtState> {
  final EvaluationPipelineService _evaluationPipeline;
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

  SrtBloc({EvaluationPipelineService? evaluationPipeline})
      : _evaluationPipeline = evaluationPipeline ?? EvaluationPipelineService(),
        super(const SrtState()) {
    on<StartSrtTest>(_onStartSrtTest);
    on<TickTimer>(_onTickTimer);
    on<SubmitReaction>(_onSubmitReaction);
    on<NextSituation>(_onNextSituation);
    on<FinishSrtOnTimeout>(_onFinishSrtOnTimeout);
  }

  void _onStartSrtTest(StartSrtTest event, Emitter<SrtState> emit) {
    emit(state.copyWith(
      status: SrtStatus.inProgress,
      situations: _sampleSituations,
      currentSituationIndex: 0,
      globalTimeRemaining: 300,
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
      await _finishTest(emit, responses: state.responses);
    }
  }

  Future<void> _onFinishSrtOnTimeout(
      FinishSrtOnTimeout event, Emitter<SrtState> emit) async {
    if (state.status != SrtStatus.inProgress) return;

    final merged = Map<String, String>.from(state.responses);
    for (var i = state.currentSituationIndex; i < state.situations.length; i++) {
      final s = state.situations[i];
      if (i == state.currentSituationIndex) {
        merged[s] = event.partialReaction.trim();
      } else {
        merged[s] = (merged[s] ?? '').trim();
      }
    }

    await _finishTest(emit, responses: merged);
  }

  Future<void> _finishTest(
    Emitter<SrtState> emit, {
    required Map<String, String> responses,
  }) async {
    _timer?.cancel();
    emit(state.copyWith(status: SrtStatus.analyzing, responses: responses));

    try {
      final raw = await _evaluationPipeline.run(
        testType: 'SRT',
        payload: {'responses': responses},
      );
      final evalMap = raw['evaluation'];
      if (evalMap is! Map<String, dynamic>) {
        throw Exception('Invalid evaluation payload from server');
      }
      final evaluation = SrtEvaluationModel.fromJson(evalMap);
      final feedbackMarkdown =
          (raw['feedbackMarkdown'] as String?)?.trim().isNotEmpty == true
              ? raw['feedbackMarkdown'] as String
              : evaluation.toMarkdown();

      emit(state.copyWith(
        status: SrtStatus.completed,
        feedback: feedbackMarkdown,
      ));
    } catch (e) {
      emit(state.copyWith(
        status: SrtStatus.error,
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
