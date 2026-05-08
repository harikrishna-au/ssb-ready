import 'package:equatable/equatable.dart';

abstract class SrtEvent extends Equatable {
  const SrtEvent();

  @override
  List<Object?> get props => [];
}

class StartSrtTest extends SrtEvent {}

class TickTimer extends SrtEvent {}

class SubmitReaction extends SrtEvent {
  final String reaction;
  const SubmitReaction(this.reaction);

  @override
  List<Object?> get props => [reaction];
}

class NextSituation extends SrtEvent {}
