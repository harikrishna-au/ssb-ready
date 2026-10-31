import 'package:equatable/equatable.dart';

abstract class SdtEvent extends Equatable {
  const SdtEvent();
  @override
  List<Object?> get props => [];
}

class StartSdtTest extends SdtEvent {
  const StartSdtTest();
}

class SdtNextPerspective extends SdtEvent {
  final String response;
  const SdtNextPerspective(this.response);
  @override
  List<Object?> get props => [response];
}

class SdtSubmitAll extends SdtEvent {
  final String lastResponse;
  const SdtSubmitAll(this.lastResponse);
  @override
  List<Object?> get props => [lastResponse];
}

class SdtTimerTick extends SdtEvent {
  const SdtTimerTick();
}

class SdtTimeExpired extends SdtEvent {
  final String partialResponse;
  const SdtTimeExpired(this.partialResponse);
  @override
  List<Object?> get props => [partialResponse];
}
