import 'package:equatable/equatable.dart';

abstract class TatEvent extends Equatable {
  const TatEvent();

  @override
  List<Object?> get props => [];
}

class StartTatTest extends TatEvent {}

class TickObservationTimer extends TatEvent {}

class StartWriting extends TatEvent {}

class TickWritingTimer extends TatEvent {}

class SubmitStory extends TatEvent {
  final String storyText;
  const SubmitStory(this.storyText);

  @override
  List<Object?> get props => [storyText];
}
