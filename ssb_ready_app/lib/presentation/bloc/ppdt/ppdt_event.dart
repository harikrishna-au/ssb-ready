import 'package:equatable/equatable.dart';
import 'package:ssb_ready_app/core/enums/story_input_mode.dart';

export 'package:ssb_ready_app/core/enums/story_input_mode.dart';

abstract class PpdtEvent extends Equatable {
  const PpdtEvent();

  @override
  List<Object?> get props => [];
}

class BeginPpdtFlow extends PpdtEvent {}

class AcceptPictureViewing extends PpdtEvent {}

class SelectStoryMode extends PpdtEvent {
  final StoryInputMode mode;

  const SelectStoryMode(this.mode);

  @override
  List<Object?> get props => [mode];
}

class TickPrepTimer extends PpdtEvent {}

class StartObservation extends PpdtEvent {}

class TickObservationTimer extends PpdtEvent {}

class SubmitPerceptionMeta extends PpdtEvent {
  final String situationSummary;
  final int positiveCharacters;
  final int negativeCharacters;
  final int neutralCharacters;
  final String sketchNotes;

  const SubmitPerceptionMeta({
    required this.situationSummary,
    required this.positiveCharacters,
    required this.negativeCharacters,
    required this.neutralCharacters,
    required this.sketchNotes,
  });

  @override
  List<Object?> get props => [
        situationSummary,
        positiveCharacters,
        negativeCharacters,
        neutralCharacters,
        sketchNotes
      ];
}

class StartWriting extends PpdtEvent {}

class TickWritingTimer extends PpdtEvent {}

class SubmitStory extends PpdtEvent {
  final String storyText;
  final String? handwrittenText;

  const SubmitStory(this.storyText, {this.handwrittenText});

  @override
  List<Object?> get props => [storyText, handwrittenText];
}
