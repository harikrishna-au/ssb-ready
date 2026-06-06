import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:ssb_ready_app/core/data/psychology_image_catalog.dart';
import 'package:ssb_ready_app/core/services/backend_api_client.dart';
import 'package:ssb_ready_app/presentation/bloc/ppdt/ppdt_event.dart';
import 'package:ssb_ready_app/presentation/bloc/ppdt/ppdt_state.dart';

import 'package:ssb_ready_app/domain/repositories/auth_repository.dart';
import 'package:ssb_ready_app/domain/repositories/test_history_repository.dart';
import 'package:ssb_ready_app/data/models/ppdt_result_model.dart';

class PpdtBloc extends Bloc<PpdtEvent, PpdtState> {
  final AuthRepository _authRepository;
  final TestHistoryRepository _historyRepository;
  final BackendApiClient _apiClient = BackendApiClient();
  Timer? _prepTimer;
  Timer? _observationTimer;
  Timer? _perceptionTimer;
  Timer? _writingTimer;

  PpdtBloc(this._authRepository, this._historyRepository)
      : super(PpdtState(imageUrl: PsychologyImageCatalog.ppdtImageUrls.first)) {
    on<ResetPpdtFlow>(_onResetPpdtFlow);
    on<BeginPpdtFlow>(_onBeginPpdtFlow);
    on<AcceptPictureViewing>(_onAcceptPictureViewing);
    on<SelectStoryMode>(_onSelectStoryMode);
    on<TickPrepTimer>(_onTickPrepTimer);
    on<SkipPrep>(_onSkipPrep);
    on<StartObservation>(_onStartObservation);
    on<TickObservationTimer>(_onTickObservationTimer);
    on<TickPerceptionTimer>(_onTickPerceptionTimer);
    on<SubmitPerceptionMeta>(_onSubmitPerceptionMeta);
    on<StartWriting>(_onStartWriting);
    on<TickWritingTimer>(_onTickWritingTimer);
    on<SubmitStory>(_onSubmitStory);
  }

  Future<void> _onBeginPpdtFlow(BeginPpdtFlow event, Emitter<PpdtState> emit) async {
    final user = await _authRepository.getCurrentUser();
    final isPremium = user?.isPremium == true;
    emit(state.copyWith(
      imageUrl: PsychologyImageCatalog.randomPpdtImageUrl(premium: isPremium),
      phase: PpdtPhase.waitingPictureConsent,
      prepTimeRemaining: 30,
      observationTimeRemaining: 30,
      perceptionTimeRemaining: 60,
      writingTimeRemaining: 240,
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

  void _onResetPpdtFlow(ResetPpdtFlow event, Emitter<PpdtState> emit) {
    _prepTimer?.cancel();
    _observationTimer?.cancel();
    _perceptionTimer?.cancel();
    _writingTimer?.cancel();
    emit(PpdtState(imageUrl: PsychologyImageCatalog.previewPpdtImageUrls.first));
  }

  void _onAcceptPictureViewing(AcceptPictureViewing event, Emitter<PpdtState> emit) {
    emit(state.copyWith(phase: PpdtPhase.modeSelection));
  }

  void _onSelectStoryMode(SelectStoryMode event, Emitter<PpdtState> emit) {
    emit(state.copyWith(
      phase: PpdtPhase.prep,
      storyInputMode: event.mode,
      prepTimeRemaining: 30,
    ));
    _prepTimer?.cancel();
    _prepTimer = Timer.periodic(const Duration(seconds: 1), (_) => add(TickPrepTimer()));
  }

  void _onTickPrepTimer(TickPrepTimer event, Emitter<PpdtState> emit) {
    if (state.phase != PpdtPhase.prep) return;
    if (state.prepTimeRemaining > 0) {
      emit(state.copyWith(prepTimeRemaining: state.prepTimeRemaining - 1));
      return;
    }
    _prepTimer?.cancel();
    add(StartObservation());
  }

  void _onSkipPrep(SkipPrep event, Emitter<PpdtState> emit) {
    if (state.phase != PpdtPhase.prep) return;
    _prepTimer?.cancel();
    add(StartObservation());
  }

  void _onStartObservation(StartObservation event, Emitter<PpdtState> emit) {
    emit(state.copyWith(
      phase: PpdtPhase.observing,
      observationTimeRemaining: 30,
      perceptionTimeRemaining: 60,
      writingTimeRemaining: 240,
      submittedStory: '',
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
      emit(state.copyWith(
        phase: PpdtPhase.perceptionCapture,
        perceptionTimeRemaining: 60,
      ));
      _perceptionTimer?.cancel();
      _perceptionTimer = Timer.periodic(const Duration(seconds: 1), (_) {
        add(TickPerceptionTimer());
      });
    }
  }

  void _onTickPerceptionTimer(TickPerceptionTimer event, Emitter<PpdtState> emit) {
    if (state.phase != PpdtPhase.perceptionCapture) return;
    if (state.perceptionTimeRemaining > 0) {
      emit(state.copyWith(perceptionTimeRemaining: state.perceptionTimeRemaining - 1));
      return;
    }
    _perceptionTimer?.cancel();
    emit(state.copyWith(phase: PpdtPhase.writing, writingTimeRemaining: 240));
    add(StartWriting());
  }

  void _onSubmitPerceptionMeta(SubmitPerceptionMeta event, Emitter<PpdtState> emit) {
    _perceptionTimer?.cancel();
    emit(state.copyWith(
      phase: PpdtPhase.writing,
      situationSummary: event.situationSummary,
      positiveCharacters: event.positiveCharacters,
      negativeCharacters: event.negativeCharacters,
      neutralCharacters: event.neutralCharacters,
      sketchNotes: event.sketchNotes,
      writingTimeRemaining: 240,
    ));
    add(StartWriting());
  }

  void _onStartWriting(StartWriting event, Emitter<PpdtState> emit) {
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
      submittedStory: event.storyText.isNotEmpty
          ? event.storyText
          : (event.handwrittenText ?? ''),
      errorMessage: null,
    ));

    try {
      final user = await _authRepository.getCurrentUser();
      if (user == null) throw Exception('User not authenticated');
      final payload = {
        'imageUrl': state.imageUrl,
        'storyMode': state.storyInputMode.name,
        'storyText': event.storyText,
        'handwrittenText': event.handwrittenText,
        'perception': {
          'situationSummary': state.situationSummary,
          'positiveCharacters': state.positiveCharacters,
          'negativeCharacters': state.negativeCharacters,
          'neutralCharacters': state.neutralCharacters,
          'sketchNotes': state.sketchNotes,
        }
      };
      final response = await _apiClient.post('/api/ppdt/pipeline', payload);
      final feedbackMarkdown = (response['analysisMarkdown'] ?? 'No analysis available').toString();
      final leaderboard = (response['leaderboard'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .toList();

      emit(state.copyWith(
        phase: PpdtPhase.completed,
        feedback: feedbackMarkdown,
        leaderboard: leaderboard,
      ));

      final result = PpdtResultModel(
        id: '',
        userId: user.id,
        imageUrl: state.imageUrl,
        userStory: event.storyText,
        aiFeedback: feedbackMarkdown,
        completedAt: DateTime.now(),
      );
      await _historyRepository.savePpdtResult(result);
    } catch (e) {
      emit(state.copyWith(
        phase: PpdtPhase.completed,
        errorMessage: e.toString().replaceAll('Exception: ', ''),
      ));
    }
  }

  @override
  Future<void> close() {
    _prepTimer?.cancel();
    _observationTimer?.cancel();
    _perceptionTimer?.cancel();
    _writingTimer?.cancel();
    return super.close();
  }
}
