import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:ssb_ready_app/core/services/evaluation_pipeline_service.dart';
import 'package:ssb_ready_app/data/datasources/oir/firestore_oir_data_source.dart';
import 'package:ssb_ready_app/presentation/bloc/oir/oir_event.dart';
import 'package:ssb_ready_app/presentation/bloc/oir/oir_state.dart';

class OirBloc extends Bloc<OirEvent, OirState> {
  final FirestoreOirDataSource _dataSource;
  final EvaluationPipelineService _evaluationPipeline;
  Timer? _timer;

  OirBloc(
    this._dataSource, {
    EvaluationPipelineService? evaluationPipeline,
  })  : _evaluationPipeline = evaluationPipeline ?? EvaluationPipelineService(),
        super(const OirState()) {
    on<StartOirTest>(_onStartOirTest);
    on<SubmitAnswer>(_onSubmitAnswer);
    on<NextQuestion>(_onNextQuestion);
    on<SkipQuestion>(_onSkipQuestion);
    on<TickTimer>(_onTickTimer);
  }

  Future<void> _onStartOirTest(
      StartOirTest event, Emitter<OirState> emit) async {
    emit(state.copyWith(status: OirStatus.loading));
    try {
      final questions = await _dataSource.getQuestions();
      emit(state.copyWith(
        status: OirStatus.inProgress,
        questions: questions,
        currentQuestionIndex: 0,
        score: 0,
        timeRemaining: 600,
        feedbackMarkdown: null,
      ));

      _timer?.cancel();
      _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
        add(TickTimer());
      });
    } catch (e) {
      emit(state.copyWith(status: OirStatus.error, errorMessage: e.toString()));
    }
  }

  void _onSubmitAnswer(SubmitAnswer event, Emitter<OirState> emit) {
    if (state.status != OirStatus.inProgress) return;

    final currentQuestion = state.questions[state.currentQuestionIndex];
    int newScore = state.score;
    if (event.selectedIndex == currentQuestion.correctAnswerIndex) {
      newScore++;
    }

    emit(state.copyWith(score: newScore));
    add(NextQuestion());
  }

  void _onNextQuestion(NextQuestion event, Emitter<OirState> emit) {
    if (state.currentQuestionIndex < state.questions.length - 1) {
      emit(
          state.copyWith(currentQuestionIndex: state.currentQuestionIndex + 1));
    } else {
      _finishTest(emit);
    }
  }

  void _onSkipQuestion(SkipQuestion event, Emitter<OirState> emit) {
    add(NextQuestion());
  }

  void _onTickTimer(TickTimer event, Emitter<OirState> emit) {
    if (state.timeRemaining > 0) {
      emit(state.copyWith(timeRemaining: state.timeRemaining - 1));
    } else {
      _finishTest(emit);
    }
  }

  Future<void> _finishTest(Emitter<OirState> emit) async {
    _timer?.cancel();
    emit(state.copyWith(status: OirStatus.analyzing));

    try {
      final raw = await _evaluationPipeline.run(
        testType: 'OIR',
        payload: {
          'score': state.score,
          'totalQuestions': state.questions.length,
        },
      );
      final md = raw['feedbackMarkdown'] as String?;
      emit(state.copyWith(
        status: OirStatus.finished,
        feedbackMarkdown: md?.trim().isNotEmpty == true ? md : null,
      ));
    } catch (_) {
      emit(state.copyWith(
        status: OirStatus.finished,
        feedbackMarkdown: null,
      ));
    }
  }

  @override
  Future<void> close() {
    _timer?.cancel();
    return super.close();
  }
}
