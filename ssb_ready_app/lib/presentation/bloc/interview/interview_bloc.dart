import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:ssb_ready_app/core/services/evaluation_pipeline_service.dart';
import 'package:ssb_ready_app/domain/repositories/auth_repository.dart';
import 'package:ssb_ready_app/domain/repositories/test_history_repository.dart';
import 'package:ssb_ready_app/data/models/piq_model.dart';
import 'package:ssb_ready_app/presentation/bloc/interview/interview_bloc_state.dart';

class InterviewBloc extends Bloc<InterviewEvent, InterviewState> {
  final AuthRepository _authRepository;
  final TestHistoryRepository _historyRepository;
  final EvaluationPipelineService _evaluationPipeline;

  InterviewBloc(
    this._authRepository,
    this._historyRepository, {
    EvaluationPipelineService? evaluationPipeline,
  })  : _evaluationPipeline =
            evaluationPipeline ?? EvaluationPipelineService(),
        super(const InterviewState()) {
    on<LoadPiq>(_onLoadPiq);
    on<UpdatePiqField>(_onUpdatePiqField);
    on<SavePiq>(_onSavePiq);
    on<StartMockInterview>(_onStartMockInterview);
    on<SendInterviewMessage>(_onSendInterviewMessage);
  }

  Future<void> _onLoadPiq(LoadPiq event, Emitter<InterviewState> emit) async {
    emit(state.copyWith(status: InterviewStatus.loading));
    try {
      final user = await _authRepository.getCurrentUser();
      if (user == null) throw Exception('User not authenticated');
      
      final piq = await _historyRepository.getPiq(user.id);
      emit(state.copyWith(
        status: InterviewStatus.loaded,
        piq: piq ?? PiqModel(userId: user.id, fullName: '${user.firstName ?? ''} ${user.lastName ?? ''}'.trim()),
      ));
    } catch (e) {
      emit(state.copyWith(status: InterviewStatus.error, errorMessage: e.toString()));
    }
  }

  void _onUpdatePiqField(UpdatePiqField event, Emitter<InterviewState> emit) {
    emit(state.copyWith(piq: event.updatedPiq));
  }

  Future<void> _onSavePiq(SavePiq event, Emitter<InterviewState> emit) async {
    if (state.piq == null) return;
    emit(state.copyWith(status: InterviewStatus.saving));
    try {
      await _historyRepository.savePiq(state.piq!);
      emit(state.copyWith(status: InterviewStatus.success));
      // Revert to loaded status after success so UI knows saving is done
      await Future.delayed(const Duration(seconds: 1));
      emit(state.copyWith(status: InterviewStatus.loaded));
    } catch (e) {
      emit(state.copyWith(status: InterviewStatus.error, errorMessage: e.toString()));
    }
  }

  Future<void> _onStartMockInterview(StartMockInterview event, Emitter<InterviewState> emit) async {
    if (state.piq == null) {
      emit(state.copyWith(status: InterviewStatus.error, errorMessage: 'Please fill your PIQ first.'));
      return;
    }
    
    emit(state.copyWith(
      status: InterviewStatus.interviewing,
      chatHistory: [
        {'role': 'assistant', 'content': 'Jai Hind! I am your Interviewing Officer today. I have reviewed your PIQ. Let\'s begin. Can you tell me a bit about your family and the place you come from?'}
      ],
    ));
  }

  Future<void> _onSendInterviewMessage(SendInterviewMessage event, Emitter<InterviewState> emit) async {
    final updatedHistory = List<Map<String, String>>.from(state.chatHistory);
    updatedHistory.add({'role': 'user', 'content': event.message});
    
    emit(state.copyWith(chatHistory: updatedHistory, status: InterviewStatus.loading));
    
    try {
      final raw = await _evaluationPipeline.run(
        testType: 'INTERVIEW_REPLY',
        payload: {
          'piq': state.piq!.toJson(),
          'chatHistory': updatedHistory,
        },
      );
      final reply = (raw['reply'] as String?)?.trim();
      final response = reply != null && reply.isNotEmpty
          ? reply
          : 'I see. Tell me more about that.';

      updatedHistory.add({'role': 'assistant', 'content': response});
      emit(state.copyWith(chatHistory: updatedHistory, status: InterviewStatus.interviewing));
    } catch (e) {
      emit(state.copyWith(status: InterviewStatus.error, errorMessage: 'Failed to get AI response.'));
    }
  }
}
