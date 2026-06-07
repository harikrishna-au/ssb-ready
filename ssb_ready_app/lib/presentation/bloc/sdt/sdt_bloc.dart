import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:ssb_ready_app/core/services/ai_evaluation_service.dart';
import 'package:ssb_ready_app/presentation/bloc/sdt/sdt_event.dart';
import 'package:ssb_ready_app/presentation/bloc/sdt/sdt_state.dart';

class SdtBloc extends Bloc<SdtEvent, SdtState> {
  final AiEvaluationService? _aiService;
  Timer? _timer;

  SdtBloc({AiEvaluationService? aiService})
      : _aiService = aiService,
        super(const SdtState()) {
    on<StartSdtTest>(_onStart);
    on<SdtTimerTick>(_onTick);
    on<SdtTimeExpired>(_onTimeExpired);
    on<SdtNextPerspective>(_onNext);
    on<SdtSubmitAll>(_onSubmitAll);
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      add(const SdtTimerTick());
    });
  }

  void _onStart(StartSdtTest event, Emitter<SdtState> emit) {
    emit(const SdtState(
      status: SdtStatus.inProgress,
      currentIndex: 0,
      responses: {},
      timeRemaining: kSdtPerspectiveSeconds,
    ));
    _startTimer();
  }

  void _onTick(SdtTimerTick event, Emitter<SdtState> emit) {
    if (state.status != SdtStatus.inProgress) return;
    final newTime = state.timeRemaining - 1;
    if (newTime <= 0) {
      emit(state.copyWith(timeRemaining: 0));
    } else {
      emit(state.copyWith(timeRemaining: newTime));
    }
  }

  void _onTimeExpired(SdtTimeExpired event, Emitter<SdtState> emit) {
    _saveAndAdvance(event.partialResponse, emit, timedOut: true);
  }

  void _onNext(SdtNextPerspective event, Emitter<SdtState> emit) {
    _saveAndAdvance(event.response, emit, timedOut: false);
  }

  void _saveAndAdvance(
    String response,
    Emitter<SdtState> emit, {
    required bool timedOut,
  }) {
    final key = state.currentPerspective['key']!;
    final updated = Map<String, String>.from(state.responses)..[key] = response;

    if (state.isLastPerspective || timedOut && state.isLastPerspective) {
      // Should call submit instead, but handle edge case
      _timer?.cancel();
      emit(state.copyWith(responses: updated));
      add(SdtSubmitAll(response));
    } else {
      emit(state.copyWith(
        responses: updated,
        currentIndex: state.currentIndex + 1,
        timeRemaining: kSdtPerspectiveSeconds,
      ));
      if (!timedOut) _startTimer();
    }
  }

  Future<void> _onSubmitAll(
      SdtSubmitAll event, Emitter<SdtState> emit) async {
    _timer?.cancel();

    final key = state.currentPerspective['key']!;
    final responses =
        Map<String, String>.from(state.responses)..[key] = event.lastResponse;

    emit(state.copyWith(
      status: SdtStatus.analyzing,
      responses: responses,
    ));

    try {
      final analysis = await _evaluateSdt(responses);
      emit(state.copyWith(
        status: SdtStatus.completed,
        aiAnalysis: analysis,
        responses: responses,
      ));
    } catch (e) {
      emit(state.copyWith(
        status: SdtStatus.error,
        errorMessage: e.toString(),
        responses: responses,
      ));
    }
  }

  Future<String> _evaluateSdt(Map<String, String> responses) async {
    if (_aiService == null) {
      return _fallbackAnalysis(responses);
    }
    try {
      return await _aiService!.evaluateSdt(responses);
    } catch (_) {
      return _fallbackAnalysis(responses);
    }
  }

  String _fallbackAnalysis(Map<String, String> responses) {
    final filled = responses.values.where((v) => v.trim().isNotEmpty).length;
    return '''
## SDT Completed

You completed **$filled / 5** perspectives.

**What the SSB psychologist looks for in SDT:**

- **Consistency** — Do all 5 perspectives paint a coherent picture of you?
- **Self-Awareness** — Is your self-description honest and balanced?
- **OLQ Indicators** — Leadership, initiative, social adaptability, and integrity should come through.
- **Authenticity** — Fabricated or over-glorified descriptions are easily spotted.

**Tip:** Your descriptions should align with what you'd say in the Personal Interview. Inconsistency between SDT and PI is a red flag for SSB psychologists.

Connect your backend to receive full AI-powered OLQ analysis.
''';
  }

  @override
  Future<void> close() {
    _timer?.cancel();
    return super.close();
  }
}
