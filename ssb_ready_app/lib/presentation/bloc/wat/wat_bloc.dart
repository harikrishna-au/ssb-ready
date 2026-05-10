import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:ssb_ready_app/core/services/evaluation_pipeline_service.dart';
import 'package:ssb_ready_app/data/models/wat_evaluation_model.dart';
import 'package:ssb_ready_app/presentation/bloc/wat/wat_event.dart';
import 'package:ssb_ready_app/presentation/bloc/wat/wat_state.dart';

class WatBloc extends Bloc<WatEvent, WatState> {
  final EvaluationPipelineService _evaluationPipeline;
  Timer? _timer;

  static const List<String> _sampleWords = [
    'Attack',
    'Mother',
    'Fail',
    'Leader',
    'Defeat',
    'Courage',
    'Afraid',
    'Success',
    'Weapon',
    'Dark',
    'Enemy',
    'Help',
    'Officer',
    'Problem',
    'Worry'
  ];

  WatBloc({EvaluationPipelineService? evaluationPipeline})
      : _evaluationPipeline = evaluationPipeline ?? EvaluationPipelineService(),
        super(const WatState()) {
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
  }

  Future<void> _onSubmitSentence(SubmitSentence event, Emitter<WatState> emit) async {
    if (state.status != WatStatus.inProgress) return;

    final updatedResponses = Map<String, String>.from(state.responses);
    updatedResponses[state.currentWord] = event.sentence.trim();

    if (state.currentWordIndex < state.words.length - 1) {
      emit(state.copyWith(
        responses: updatedResponses,
        currentWordIndex: state.currentWordIndex + 1,
        timeRemaining: 15,
      ));
      _startTimer();
    } else {
      _timer?.cancel();
      emit(state.copyWith(
        status: WatStatus.analyzing,
        responses: updatedResponses,
      ));
      await _analyze(emit, updatedResponses);
    }
  }

  Future<void> _analyze(Emitter<WatState> emit, Map<String, String> responses) async {
    try {
      final raw = await _evaluationPipeline.run(
        testType: 'WAT',
        payload: {'responses': responses},
      );
      final evalMap = raw['evaluation'];
      if (evalMap is! Map<String, dynamic>) {
        throw Exception('Invalid evaluation payload from server');
      }
      final evaluation = WatEvaluationModel.fromJson(evalMap);
      final feedbackMarkdown =
          (raw['feedbackMarkdown'] as String?)?.trim().isNotEmpty == true
              ? raw['feedbackMarkdown'] as String
              : evaluation.toMarkdown();

      emit(state.copyWith(
        status: WatStatus.completed,
        feedback: feedbackMarkdown,
      ));
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
