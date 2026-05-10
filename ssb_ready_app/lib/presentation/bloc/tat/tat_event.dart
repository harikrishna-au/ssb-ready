import 'package:equatable/equatable.dart';
import 'package:ssb_ready_app/core/enums/story_input_mode.dart';

abstract class TatEvent extends Equatable {
  const TatEvent();

  @override
  List<Object?> get props => [];
}

class BeginTatFlow extends TatEvent {}

class AcceptPictureViewing extends TatEvent {}

class SelectStoryMode extends TatEvent {
  final StoryInputMode mode;

  const SelectStoryMode(this.mode);

  @override
  List<Object?> get props => [mode];
}

class TickPrepTimer extends TatEvent {}

class StartObservation extends TatEvent {}

class TickObservationTimer extends TatEvent {}

class SubmitPerceptionMeta extends TatEvent {
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
        sketchNotes,
      ];
}

class StartWriting extends TatEvent {}

class TickWritingTimer extends TatEvent {}

class SubmitStory extends TatEvent {
  final String storyText;
  final String? handwrittenText;

  const SubmitStory(this.storyText, {this.handwrittenText});

  @override
  List<Object?> get props => [storyText, handwrittenText];
}

/// After viewing results, load the next TAT card (if any).
class StartNextTatPicture extends TatEvent {}
