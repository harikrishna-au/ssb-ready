import 'package:equatable/equatable.dart';

abstract class PpdtEvent extends Equatable {
  const PpdtEvent();

  @override
  List<Object?> get props => [];
}

class StartObservation extends PpdtEvent {}

class TickObservationTimer extends PpdtEvent {}

class StartWriting extends PpdtEvent {}

class TickWritingTimer extends PpdtEvent {}

class SubmitStory extends PpdtEvent {
  final String storyText;

  const SubmitStory(this.storyText);

  @override
  List<Object?> get props => [storyText];
}
