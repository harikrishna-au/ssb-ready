import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:ssb_ready_app/core/services/ai_evaluation_service.dart';
import 'package:ssb_ready_app/domain/repositories/auth_repository.dart';
import 'package:ssb_ready_app/domain/repositories/test_history_repository.dart';
import 'package:ssb_ready_app/data/models/tat_result_model.dart';
import 'package:ssb_ready_app/presentation/bloc/tat/tat_event.dart';
import 'package:ssb_ready_app/presentation/bloc/tat/tat_state.dart';

class TatBloc extends Bloc<TatEvent, TatState> {
  final AuthRepository _authRepository;
  final TestHistoryRepository _historyRepository;
  Timer? _observationTimer;
  Timer? _writingTimer;

  TatBloc(this._authRepository, this._historyRepository) : super(const TatState()) {
    on<StartTatTest>(_onStartTatTest);
    on<TickObservationTimer>(_onTickObservationTimer);
    on<StartWriting>(_onStartWriting);
    on<TickWritingTimer>(_onTickWritingTimer);
    on<SubmitStory>(_onSubmitStory);
  }

  void _onStartTatTest(StartTatTest event, Emitter<TatState> emit) {
    emit(state.copyWith(
      phase: TatPhase.observing,
      currentImageIndex: 0,
      totalImages: TatState.imageDescriptions.length,
      observationTimeRemaining: 30,
      writingTimeRemaining: 240,
      submittedStory: '',
      feedback: null,
      errorMessage: null,
    ));

    _observationTimer?.cancel();
    _observationTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      add(TickObservationTimer());
    });
  }

  void _onTickObservationTimer(TickObservationTimer event, Emitter<TatState> emit) {
    if (state.phase != TatPhase.observing) return;

    if (state.observationTimeRemaining > 0) {
      emit(state.copyWith(observationTimeRemaining: state.observationTimeRemaining - 1));
    } else {
      _observationTimer?.cancel();
      add(StartWriting());
    }
  }

  void _onStartWriting(StartWriting event, Emitter<TatState> emit) {
    emit(state.copyWith(phase: TatPhase.writing));

    _writingTimer?.cancel();
    _writingTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      add(TickWritingTimer());
    });
  }

  void _onTickWritingTimer(TickWritingTimer event, Emitter<TatState> emit) {
    if (state.phase != TatPhase.writing) return;

    if (state.writingTimeRemaining > 0) {
      emit(state.copyWith(writingTimeRemaining: state.writingTimeRemaining - 1));
    } else {
      _writingTimer?.cancel();
      // Timer expired — UI will intercept and submit
    }
  }

  Future<void> _onSubmitStory(SubmitStory event, Emitter<TatState> emit) async {
    _writingTimer?.cancel();
    emit(state.copyWith(
      phase: TatPhase.analyzing,
      submittedStory: event.storyText,
      errorMessage: null,
    ));

    try {
      final aiService = await AiEvaluationService.initialize();
      if (aiService == null) {
        throw Exception('AI Service failed to initialize.');
      }

      final evaluation = await aiService.evaluateTat(
        state.currentImageDescription,
        event.storyText,
      );
      final feedbackMarkdown = evaluation.toMarkdown();

      emit(state.copyWith(
        phase: TatPhase.completed,
        feedback: feedbackMarkdown,
      ));

      final user = await _authRepository.getCurrentUser();
      if (user != null) {
        final result = TatResultModel(
          id: '',
          userId: user.id,
          imageIndex: state.currentImageIndex,
          userStory: event.storyText,
          aiFeedback: feedbackMarkdown,
          completedAt: DateTime.now(),
        );
        await _historyRepository.saveTatResult(result);
      }
    } catch (e) {
      emit(state.copyWith(
        phase: TatPhase.completed,
        errorMessage: e.toString().replaceAll('Exception: ', ''),
      ));
    }
  }

  @override
  Future<void> close() {
    _observationTimer?.cancel();
    _writingTimer?.cancel();
    return super.close();
  }
}
