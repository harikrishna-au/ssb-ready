import 'package:equatable/equatable.dart';
import 'package:ssb_ready_app/data/models/piq_model.dart';

abstract class InterviewEvent extends Equatable {
  const InterviewEvent();
  @override
  List<Object?> get props => [];
}

class LoadPiq extends InterviewEvent {}

class UpdatePiqField extends InterviewEvent {
  final PiqModel updatedPiq;
  const UpdatePiqField(this.updatedPiq);
  @override
  List<Object?> get props => [updatedPiq];
}

class SavePiq extends InterviewEvent {}

class StartMockInterview extends InterviewEvent {}

class SendInterviewMessage extends InterviewEvent {
  final String message;
  const SendInterviewMessage(this.message);
  @override
  List<Object?> get props => [message];
}

// State
enum InterviewStatus { initial, loading, loaded, saving, success, interviewing, error }

class InterviewState extends Equatable {
  final InterviewStatus status;
  final PiqModel? piq;
  final List<Map<String, String>> chatHistory;
  final String? errorMessage;

  const InterviewState({
    this.status = InterviewStatus.initial,
    this.piq,
    this.chatHistory = const [],
    this.errorMessage,
  });

  InterviewState copyWith({
    InterviewStatus? status,
    PiqModel? piq,
    List<Map<String, String>>? chatHistory,
    String? errorMessage,
  }) {
    return InterviewState(
      status: status ?? this.status,
      piq: piq ?? this.piq,
      chatHistory: chatHistory ?? this.chatHistory,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  @override
  List<Object?> get props => [status, piq, chatHistory, errorMessage];
}
