import 'package:equatable/equatable.dart';

abstract class OirEvent extends Equatable {
  const OirEvent();

  @override
  List<Object?> get props => [];
}

class StartOirTest extends OirEvent {}

class SubmitAnswer extends OirEvent {
  final int selectedIndex;
  const SubmitAnswer(this.selectedIndex);

  @override
  List<Object?> get props => [selectedIndex];
}

class NextQuestion extends OirEvent {}

class SkipQuestion extends OirEvent {}

class TickTimer extends OirEvent {}
