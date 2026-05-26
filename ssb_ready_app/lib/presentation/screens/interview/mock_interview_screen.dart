import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:ssb_ready_app/presentation/bloc/interview/interview_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/interview/interview_bloc_state.dart';

part 'mock_interview_screen_widgets.dart';

const List<String> _visemeFrameAssets = [
  'assets/nilo/visemes/cartoonVisemes/viseme_id_0.svg',
  'assets/nilo/visemes/cartoonVisemes/viseme_id_1.svg',
  'assets/nilo/visemes/cartoonVisemes/viseme_id_2.svg',
  'assets/nilo/visemes/cartoonVisemes/viseme_id_3.svg',
  'assets/nilo/visemes/cartoonVisemes/viseme_id_4.svg',
  'assets/nilo/visemes/cartoonVisemes/viseme_id_5.svg',
  'assets/nilo/visemes/cartoonVisemes/viseme_id_6.svg',
  'assets/nilo/visemes/cartoonVisemes/viseme_id_7.svg',
  'assets/nilo/visemes/cartoonVisemes/viseme_id_8.svg',
  'assets/nilo/visemes/cartoonVisemes/viseme_id_9.svg',
  'assets/nilo/visemes/cartoonVisemes/viseme_id_10.svg',
  'assets/nilo/visemes/cartoonVisemes/viseme_id_11.svg',
  'assets/nilo/visemes/cartoonVisemes/viseme_id_12.svg',
  'assets/nilo/visemes/cartoonVisemes/viseme_id_13.svg',
  'assets/nilo/visemes/cartoonVisemes/viseme_id_14.svg',
  'assets/nilo/visemes/cartoonVisemes/viseme_id_15.svg',
  'assets/nilo/visemes/cartoonVisemes/viseme_id_16.svg',
  'assets/nilo/visemes/cartoonVisemes/viseme_id_17.svg',
  'assets/nilo/visemes/cartoonVisemes/viseme_id_18.svg',
  'assets/nilo/visemes/cartoonVisemes/viseme_id_19.svg',
  'assets/nilo/visemes/cartoonVisemes/viseme_id_20.svg',
  'assets/nilo/visemes/cartoonVisemes/viseme_id_21.svg',
];

class MockInterviewScreen extends StatefulWidget {
  const MockInterviewScreen({super.key});

  @override
  State<MockInterviewScreen> createState() => _MockInterviewScreenState();
}

class _MockInterviewScreenState extends State<MockInterviewScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  Timer? _blinkTimer;
  Timer? _visemeTimer;
  bool _blinkOn = false;
  int _visemeIdx = 0;
  bool _ttsSpeaking = false;
  bool _showEndConfirm = false;
  bool _interviewStarted = false;
  final FlutterTts _tts = FlutterTts();
  final SpeechToText _speechToText = SpeechToText();
  String _lastSpokenAssistantMsg = '';
  bool _speechReady = false;
  bool _isListening = false;

  @override
  void initState() {
    super.initState();
    _scheduleBlink();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    await _initTts();
    await _initSpeech();
    if (!mounted) return;
    context.read<InterviewBloc>().add(LoadPiq());
  }

  Future<void> _initSpeech() async {
    try {
      _speechReady = await _speechToText.initialize(
        onError: (e) {
          if (!mounted) return;
          setState(() {
            _speechReady = false;
            _isListening = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Speech recognition error: ${e.errorMsg}')),
          );
        },
        onStatus: (status) {
          if (!mounted) return;
          if (status == 'done' || status == 'notListening') {
            setState(() => _isListening = false);
          }
        },
      );
    } catch (_) {
      _speechReady = false;
    }
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _blinkTimer?.cancel();
    _visemeTimer?.cancel();
    unawaited(_speechToText.stop());
    _tts.stop();
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _initTts() async {
    await _tts.setLanguage('en-US');
    await _tts.setSpeechRate(0.46);
    await _tts.setPitch(1.0);
    await _tts.setVolume(1.0);
    await _tts.awaitSpeakCompletion(true);
    _tts.setStartHandler(() {
      if (!mounted) return;
      setState(() => _ttsSpeaking = true);
      _startVisemeAnimation();
    });
    _tts.setCompletionHandler(_onTtsIdle);
    _tts.setCancelHandler(_onTtsIdle);
    _tts.setErrorHandler((_) => _onTtsIdle());
  }

  void _onTtsIdle() {
    _ttsSpeaking = false;
    _stopVisemeAnimation();
    if (!mounted) return;
    setState(() {});
  }

  Future<void> _speakAssistantMessage(String text) async {
    final clean = text.trim();
    if (clean.isEmpty || clean == _lastSpokenAssistantMsg) return;
    _lastSpokenAssistantMsg = clean;
    try {
      await _tts.stop();
      if (!mounted) return;
      setState(() => _ttsSpeaking = false);
      _stopVisemeAnimation();
      await _tts.speak(clean);
    } catch (_) {
      _onTtsIdle();
    }
  }

  void _scheduleBlink() {
    _blinkTimer?.cancel();
    final next = Duration(milliseconds: 2800 + (DateTime.now().millisecond % 1800));
    _blinkTimer = Timer(next, () {
      if (!mounted) return;
      setState(() => _blinkOn = true);
      Timer(const Duration(milliseconds: 180), () {
        if (!mounted) return;
        setState(() => _blinkOn = false);
        _scheduleBlink();
      });
    });
  }

  void _startVisemeAnimation() {
    _visemeTimer?.cancel();
    const tickMs = 95;
    _visemeTimer = Timer.periodic(const Duration(milliseconds: tickMs), (_) {
      if (!mounted || !_ttsSpeaking) return;
      setState(() {
        _visemeIdx = (_visemeIdx + 1) % _visemeFrameAssets.length;
      });
    });
  }

  void _stopVisemeAnimation() {
    _visemeTimer?.cancel();
    _visemeTimer = null;
    if (_visemeIdx != 0 && mounted) {
      setState(() => _visemeIdx = 0);
    }
  }

  void _sendMessage() {
    if (_messageController.text.trim().isEmpty) return;
    context.read<InterviewBloc>().add(SendInterviewMessage(_messageController.text.trim()));
    _messageController.clear();
    FocusScope.of(context).unfocus();
  }

  Future<void> _toggleMicListen() async {
    if (!mounted) return;
    if (context.read<InterviewBloc>().state.status == InterviewStatus.loading) return;

    if (!_speechReady) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Voice input is not ready. Allow microphone access for this app in system settings.'),
        ),
      );
      return;
    }

    if (_isListening) {
      await _speechToText.stop();
      if (mounted) setState(() => _isListening = false);
      return;
    }

    if (_ttsSpeaking) {
      await _tts.stop();
      _onTtsIdle();
    }

    setState(() => _isListening = true);
    try {
      await _speechToText.listen(
        onResult: (result) {
          if (!mounted) return;
          final text = result.recognizedWords;
          setState(() {
            _messageController.text = text;
            _messageController.selection = TextSelection.collapsed(offset: text.length);
          });
        },
        listenFor: const Duration(seconds: 90),
        pauseFor: const Duration(seconds: 4),
        localeId: 'en_US',
        listenOptions: SpeechListenOptions(
          partialResults: true,
          cancelOnError: true,
          listenMode: ListenMode.dictation,
        ),
      );
    } catch (e) {
      if (mounted) {
        setState(() => _isListening = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not start listening: $e')),
        );
      }
    }
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  void _setShowEndConfirm(bool value) {
    if (!mounted) return;
    setState(() => _showEndConfirm = value);
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<InterviewBloc, InterviewState>(
      buildWhen: (prev, curr) =>
          prev.status != curr.status || prev.chatHistory.length != curr.chatHistory.length,
      builder: (context, popState) {
        final sessionActive =
            popState.status != InterviewStatus.error && popState.chatHistory.isNotEmpty;
        return PopScope(
          canPop: !sessionActive,
          onPopInvokedWithResult: (didPop, _) async {
            if (didPop || !context.mounted) return;
            final leave = await showDialog<bool>(
              context: context,
              builder: (dialogContext) => AlertDialog(
                title: const Text('Leave interview?'),
                content: const Text(
                  'You will exit the AI interview screen. You can start again from the interview hub.',
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.of(dialogContext).pop(false),
                    child: const Text('Stay'),
                  ),
                  FilledButton(
                    onPressed: () => Navigator.of(dialogContext).pop(true),
                    child: const Text('Leave'),
                  ),
                ],
              ),
            );
            if (leave == true && context.mounted) {
              await _speechToText.stop();
              await _tts.stop();
              if (context.mounted) Navigator.of(context).pop();
            }
          },
          child: Scaffold(
      appBar: AppBar(
        title: const Text('Nilo AI Interview'),
        backgroundColor: Colors.purple[800],
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            tooltip: 'End Interview',
            onPressed: () => _setShowEndConfirm(true),
            icon: const Icon(Icons.stop_circle_outlined),
          )
        ],
      ),
      body: BlocConsumer<InterviewBloc, InterviewState>(
        listener: (context, state) {
          if (!_interviewStarted &&
              state.status == InterviewStatus.loaded &&
              state.piq != null) {
            _interviewStarted = true;
            context.read<InterviewBloc>().add(StartMockInterview());
          }

          if (state.status != InterviewStatus.interviewing && state.status != InterviewStatus.loading) {
            if (_ttsSpeaking) {
              unawaited(_tts.stop());
            }
          }

          if (state.status == InterviewStatus.interviewing || state.status == InterviewStatus.loading) {
            WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
          }

          if (state.chatHistory.isNotEmpty) {
            final last = state.chatHistory.last;
            if (last['role'] == 'assistant') {
              _speakAssistantMessage(last['content'] ?? '');
            }
          }
        },
        builder: (context, state) {
          if (state.status == InterviewStatus.error) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(state.errorMessage ?? 'Error occurred'),
                  const SizedBox(height: 16),
                  ElevatedButton(onPressed: () => Navigator.pop(context), child: const Text('Back')),
                ],
              ),
            );
          }

          return Column(
            children: [
              _buildAvatarPanel(state),
              if (state.questionBank.isNotEmpty) _buildQuestionBank(state.questionBank),
              Expanded(
                child: ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.all(16),
                  itemCount: state.chatHistory.length + (state.status == InterviewStatus.loading ? 1 : 0),
                  itemBuilder: (context, index) {
                    if (index == state.chatHistory.length) {
                      return _buildTypingIndicator();
                    }
                    final msg = state.chatHistory[index];
                    final isUser = msg['role'] == 'user';
                    return _buildChatBubble(msg['content'] ?? '', isUser);
                  },
                ),
              ),
              _buildInputArea(state),
            ],
          );
        },
      ),
      floatingActionButton: _showEndConfirm ? _buildEndInterviewDialog() : null,
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
          ),
        );
      },
    );
  }
}
