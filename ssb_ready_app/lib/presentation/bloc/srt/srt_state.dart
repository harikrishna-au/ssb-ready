import 'package:equatable/equatable.dart';

enum SrtStatus { initial, loading, inProgress, analyzing, completed, error }

class SrtState extends Equatable {
  final SrtStatus status;
  final List<String> situations;
  final int currentSituationIndex;
  final int globalTimeRemaining; // in seconds
  final Map<String, String> responses; // situation -> reaction
  final String? feedback;
  final String? errorMessage;

  const SrtState({
    this.status = SrtStatus.initial,
    this.situations = const [],
    this.currentSituationIndex = 0,
    this.globalTimeRemaining = 300, // 5 minutes
    this.responses = const {},
    this.feedback,
    this.errorMessage,
  });

  String get currentSituation =>
      situations.isNotEmpty && currentSituationIndex < situations.length
          ? situations[currentSituationIndex]
          : '';

  bool get isLastSituation => currentSituationIndex >= situations.length - 1;

  String get formattedTime {
    final minutes = globalTimeRemaining ~/ 60;
    final seconds = globalTimeRemaining % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  SrtState copyWith({
    SrtStatus? status,
    List<String>? situations,
    int? currentSituationIndex,
    int? globalTimeRemaining,
    Map<String, String>? responses,
    String? feedback,
    String? errorMessage,
  }) {
    return SrtState(
      status: status ?? this.status,
      situations: situations ?? this.situations,
      currentSituationIndex: currentSituationIndex ?? this.currentSituationIndex,
      globalTimeRemaining: globalTimeRemaining ?? this.globalTimeRemaining,
      responses: responses ?? this.responses,
      feedback: feedback ?? this.feedback,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  @override
  List<Object?> get props => [
        status,
        situations,
        currentSituationIndex,
        globalTimeRemaining,
        responses,
        feedback,
        errorMessage,
      ];
}
