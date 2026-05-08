import 'package:equatable/equatable.dart';

abstract class WatEvent extends Equatable {
  const WatEvent();

  @override
  List<Object?> get props => [];
}

class StartWatTest extends WatEvent {}

class TickTimer extends WatEvent {}

class SubmitSentence extends WatEvent {
  final String sentence;
  const SubmitSentence(this.sentence);

  @override
  List<Object?> get props => [sentence];
}
