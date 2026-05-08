import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:ssb_ready_app/core/services/ai_evaluation_service.dart';
import 'package:ssb_ready_app/presentation/bloc/ppdt/ppdt_event.dart';
import 'package:ssb_ready_app/presentation/bloc/ppdt/ppdt_state.dart';

import 'package:ssb_ready_app/domain/repositories/auth_repository.dart';
import 'package:ssb_ready_app/domain/repositories/test_history_repository.dart';
import 'package:ssb_ready_app/data/models/ppdt_result_model.dart';

class PpdtBloc extends Bloc<PpdtEvent, PpdtState> {
  final AuthRepository _authRepository;
  final TestHistoryRepository _historyRepository;
  Timer? _observationTimer;
  Timer? _writingTimer;

  PpdtBloc(this._authRepository, this._historyRepository) : super(const PpdtState()) {
    on<StartObservation>(_onStartObservation);
    on<TickObservationTimer>(_onTickObservationTimer);
    on<StartWriting>(_onStartWriting);
    on<TickWritingTimer>(_onTickWritingTimer);
    on<SubmitStory>(_onSubmitStory);
  }

  void _onStartObservation(StartObservation event, Emitter<PpdtState> emit) {
    emit(state.copyWith(
      phase: PpdtPhase.observing,
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

  void _onTickObservationTimer(TickObservationTimer event, Emitter<PpdtState> emit) {
    if (state.phase != PpdtPhase.observing) return;

    if (state.observationTimeRemaining > 0) {
      emit(state.copyWith(observationTimeRemaining: state.observationTimeRemaining - 1));
    } else {
      _observationTimer?.cancel();
      add(StartWriting());
    }
  }

  void _onStartWriting(StartWriting event, Emitter<PpdtState> emit) {
    emit(state.copyWith(phase: PpdtPhase.writing));

    _writingTimer?.cancel();
    _writingTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      add(TickWritingTimer());
    });
  }

  void _onTickWritingTimer(TickWritingTimer event, Emitter<PpdtState> emit) {
    if (state.phase != PpdtPhase.writing) return;

    if (state.writingTimeRemaining > 0) {
      emit(state.copyWith(writingTimeRemaining: state.writingTimeRemaining - 1));
    } else {
      _writingTimer?.cancel();
    }
  }

  Future<void> _onSubmitStory(SubmitStory event, Emitter<PpdtState> emit) async {
    _writingTimer?.cancel();
    emit(state.copyWith(
      phase: PpdtPhase.analyzing,
      submittedStory: event.storyText,
      errorMessage: null,
    ));

    try {
      final aiService = await AiEvaluationService.initialize();
      if (aiService == null) {
        throw Exception('AI Service failed to initialize.');
      }

      final evaluation = await aiService.evaluateStory(event.storyText);
      final feedbackMarkdown = evaluation.toMarkdown();

      emit(state.copyWith(
        phase: PpdtPhase.completed,
        feedback: feedbackMarkdown,
      ));

      final user = await _authRepository.getCurrentUser();
      if (user != null) {
        final result = PpdtResultModel(
          id: '',
          userId: user.id,
          imageUrl: state.imageUrl,
          userStory: event.storyText,
          aiFeedback: feedbackMarkdown,
          completedAt: DateTime.now(),
        );
        await _historyRepository.savePpdtResult(result);
      }
    } catch (e) {
      emit(state.copyWith(
        phase: PpdtPhase.completed,
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
