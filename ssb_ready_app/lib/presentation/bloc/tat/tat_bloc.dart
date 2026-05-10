import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:ssb_ready_app/core/services/backend_api_client.dart';
import 'package:ssb_ready_app/domain/repositories/auth_repository.dart';
import 'package:ssb_ready_app/domain/repositories/test_history_repository.dart';
import 'package:ssb_ready_app/data/models/tat_result_model.dart';
import 'package:ssb_ready_app/presentation/bloc/tat/tat_event.dart';
import 'package:ssb_ready_app/presentation/bloc/tat/tat_state.dart';

class TatBloc extends Bloc<TatEvent, TatState> {
  final AuthRepository _authRepository;
  final TestHistoryRepository _historyRepository;
  final BackendApiClient _apiClient = BackendApiClient();

  Timer? _prepTimer;
  Timer? _observationTimer;
  Timer? _writingTimer;

  TatBloc(this._authRepository, this._historyRepository)
      : super(
          TatState(
            totalImages: TatState.imageDescriptions.length,
          ),
        ) {
    on<BeginTatFlow>(_onBeginTatFlow);
    on<AcceptPictureViewing>(_onAcceptPictureViewing);
    on<SelectStoryMode>(_onSelectStoryMode);
    on<TickPrepTimer>(_onTickPrepTimer);
    on<StartObservation>(_onStartObservation);
    on<TickObservationTimer>(_onTickObservationTimer);
    on<SubmitPerceptionMeta>(_onSubmitPerceptionMeta);
    on<StartWriting>(_onStartWriting);
    on<TickWritingTimer>(_onTickWritingTimer);
    on<SubmitStory>(_onSubmitStory);
    on<StartNextTatPicture>(_onStartNextTatPicture);
  }

  void _onBeginTatFlow(BeginTatFlow event, Emitter<TatState> emit) {
    emit(state.copyWith(
      phase: TatPhase.waitingPictureConsent,
      prepTimeRemaining: 30,
      observationTimeRemaining: 30,
      writingTimeRemaining: 180,
      submittedStory: '',
      feedback: null,
      leaderboard: const [],
      errorMessage: null,
      situationSummary: '',
      positiveCharacters: 0,
      negativeCharacters: 0,
      neutralCharacters: 0,
      sketchNotes: '',
    ));
  }

  void _onAcceptPictureViewing(AcceptPictureViewing event, Emitter<TatState> emit) {
    emit(state.copyWith(phase: TatPhase.modeSelection));
  }

  void _onSelectStoryMode(SelectStoryMode event, Emitter<TatState> emit) {
    emit(state.copyWith(
      phase: TatPhase.prep,
      storyInputMode: event.mode,
      prepTimeRemaining: 30,
    ));
    _prepTimer?.cancel();
    _prepTimer = Timer.periodic(const Duration(seconds: 1), (_) => add(TickPrepTimer()));
  }

  void _onTickPrepTimer(TickPrepTimer event, Emitter<TatState> emit) {
    if (state.phase != TatPhase.prep) return;
    if (state.prepTimeRemaining > 0) {
      emit(state.copyWith(prepTimeRemaining: state.prepTimeRemaining - 1));
      return;
    }
    _prepTimer?.cancel();
    add(StartObservation());
  }

  void _onStartObservation(StartObservation event, Emitter<TatState> emit) {
    emit(state.copyWith(
      phase: TatPhase.observing,
      observationTimeRemaining: 30,
      writingTimeRemaining: 180,
      submittedStory: '',
      errorMessage: null,
    ));
    _observationTimer?.cancel();
    _observationTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      add(TickObservationTimer());
    });
  }

  void _onTickObservationTimer(TickObservationTimer event, Emitter<TatState> emit) {
    if (state.phase != TatPhase.observing) return;
    if (state.observationTimeRemaining > 0) {
      emit(state.copyWith(
        observationTimeRemaining: state.observationTimeRemaining - 1,
      ));
    } else {
      _observationTimer?.cancel();
      emit(state.copyWith(phase: TatPhase.perceptionCapture));
    }
  }

  void _onSubmitPerceptionMeta(SubmitPerceptionMeta event, Emitter<TatState> emit) {
    emit(state.copyWith(
      phase: TatPhase.writing,
      situationSummary: event.situationSummary,
      positiveCharacters: event.positiveCharacters,
      negativeCharacters: event.negativeCharacters,
      neutralCharacters: event.neutralCharacters,
      sketchNotes: event.sketchNotes,
      writingTimeRemaining: 180,
    ));
    add(StartWriting());
  }

  void _onStartWriting(StartWriting event, Emitter<TatState> emit) {
    _writingTimer?.cancel();
    _writingTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      add(TickWritingTimer());
    });
  }

  void _onTickWritingTimer(TickWritingTimer event, Emitter<TatState> emit) {
    if (state.phase != TatPhase.writing) return;
    if (state.writingTimeRemaining > 0) {
      emit(state.copyWith(writingTimeRemaining: state.writingTimeRemaining - 1));
    } else {
      _writingTimer?.cancel();
    }
  }

  Future<void> _onSubmitStory(SubmitStory event, Emitter<TatState> emit) async {
    _writingTimer?.cancel();
    final combinedStory = event.storyText.isNotEmpty
        ? event.storyText
        : (event.handwrittenText ?? '').trim();

    emit(state.copyWith(
      phase: TatPhase.analyzing,
      submittedStory: combinedStory,
      errorMessage: null,
    ));

    try {
      final user = await _authRepository.getCurrentUser();
      if (user == null) throw Exception('User not authenticated');

      final payload = {
        'imageDescription': state.currentImageDescription,
        'imageIndex': state.currentImageIndex,
        'storyMode': state.storyInputMode.name,
        'storyText': event.storyText,
        'handwrittenText': event.handwrittenText,
        'perception': {
          'situationSummary': state.situationSummary,
          'positiveCharacters': state.positiveCharacters,
          'negativeCharacters': state.negativeCharacters,
          'neutralCharacters': state.neutralCharacters,
          'sketchNotes': state.sketchNotes,
        },
      };

      final response = await _apiClient.post('/api/tat/pipeline', payload);
      final feedbackMarkdown =
          (response['analysisMarkdown'] ?? 'No analysis available').toString();
      final leaderboard = (response['leaderboard'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .toList();

      emit(state.copyWith(
        phase: TatPhase.completed,
        feedback: feedbackMarkdown,
        leaderboard: leaderboard,
      ));

      final result = TatResultModel(
        id: '',
        userId: user.id,
        imageIndex: state.currentImageIndex,
        userStory: combinedStory,
        aiFeedback: feedbackMarkdown,
        completedAt: DateTime.now(),
      );
      await _historyRepository.saveTatResult(result);
    } catch (e) {
      emit(state.copyWith(
        phase: TatPhase.completed,
        errorMessage: e.toString().replaceAll('Exception: ', ''),
      ));
    }
  }

  void _onStartNextTatPicture(StartNextTatPicture event, Emitter<TatState> emit) {
    if (state.currentImageIndex >= state.totalImages - 1) return;
    emit(state.copyWith(
      currentImageIndex: state.currentImageIndex + 1,
      phase: TatPhase.waitingPictureConsent,
      prepTimeRemaining: 30,
      observationTimeRemaining: 30,
      writingTimeRemaining: 180,
      submittedStory: '',
      feedback: null,
      leaderboard: const [],
      errorMessage: null,
      situationSummary: '',
      positiveCharacters: 0,
      negativeCharacters: 0,
      neutralCharacters: 0,
      sketchNotes: '',
    ));
  }

  @override
  Future<void> close() {
    _prepTimer?.cancel();
    _observationTimer?.cancel();
    _writingTimer?.cancel();
    return super.close();
  }
}
