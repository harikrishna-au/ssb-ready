import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';
import 'package:ssb_ready_app/core/enums/story_input_mode.dart';
import 'package:ssb_ready_app/core/services/backend_api_client.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';
import 'package:ssb_ready_app/core/utils/ocr_image_prepare.dart';
import 'package:ssb_ready_app/presentation/bloc/tat/tat_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/tat/tat_event.dart';
import 'package:ssb_ready_app/presentation/bloc/tat/tat_state.dart';
import 'package:ssb_ready_app/presentation/widgets/animated_instruction_list.dart';

String _formatBytesForDebug(int bytes) {
  if (bytes < 1024) return '$bytes B';
  if (bytes < 1024 * 1024) {
    return '${(bytes / 1024).toStringAsFixed(1)} KB';
  }
  return '${(bytes / (1024 * 1024)).toStringAsFixed(2)} MB';
}

class TatScreen extends StatefulWidget {
  const TatScreen({super.key});

  @override
  State<TatScreen> createState() => _TatScreenState();
}

class _TatScreenState extends State<TatScreen> {
  final TextEditingController _storyController = TextEditingController();
  final TextEditingController _ocrController = TextEditingController();
  final TextEditingController _summaryController = TextEditingController();
  final TextEditingController _sketchNotesController = TextEditingController();
  final TextEditingController _positiveController =
      TextEditingController(text: '1');
  final TextEditingController _negativeController =
      TextEditingController(text: '0');
  final TextEditingController _neutralController =
      TextEditingController(text: '0');
  final List<Offset?> _drawPoints = [];
  final ImagePicker _imagePicker = ImagePicker();
  XFile? _writtenPaperImage;
  bool _ocrBusy = false;
  final BackendApiClient _backendApi = BackendApiClient();
  String? _ocrUploadDebugLine;
  int _animationSeed = 0;

  @override
  void dispose() {
    _storyController.dispose();
    _ocrController.dispose();
    _summaryController.dispose();
    _sketchNotesController.dispose();
    _positiveController.dispose();
    _negativeController.dispose();
    _neutralController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Thematic Apperception Test'),
      ),
      body: BlocConsumer<TatBloc, TatState>(
        listener: (context, state) {
          if (state.phase == TatPhase.writing && state.writingTimeRemaining == 0) {
            context.read<TatBloc>().add(
                  SubmitStory(
                    _storyController.text,
                    handwrittenText:
                        state.storyInputMode == StoryInputMode.paper
                            ? _ocrController.text
                            : null,
                  ),
                );
          } else if (state.phase == TatPhase.completed) {
            Navigator.pushReplacementNamed(context, '/tat-result');
          }
        },
        builder: (context, state) {
          switch (state.phase) {
            case TatPhase.initial:
              return _buildInitialView(context, state);
            case TatPhase.waitingPictureConsent:
              return _buildConsentView(context);
            case TatPhase.modeSelection:
              return _buildModeView(context);
            case TatPhase.prep:
              return _buildPrepView(state);
            case TatPhase.observing:
              return _buildObservingView(context, state);
            case TatPhase.perceptionCapture:
              return _buildPerceptionView(context);
            case TatPhase.writing:
              return _buildWritingView(context, state);
            case TatPhase.analyzing:
              return const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(),
                    SizedBox(height: 16),
                    Text('Analyzing…', style: TextStyle(color: AppColors.textSecondary)),
                  ],
                ),
              );
            default:
              return const Center(child: CircularProgressIndicator());
          }
        },
      ),
    );
  }

  Widget _buildInitialView(BuildContext context, TatState state) {
    const lines = [
      'Each card shows a scene description for 30 seconds (practice uses text instead of a slide).',
      'Then you capture quick perceptions before writing your story.',
      'You have 3 minutes to write — hero, feelings, and outcome matter.',
    ];
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Card ${state.currentImageIndex + 1} of ${state.totalImages}',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 16),
            const Text(
              'Thematic Apperception Test',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 16),
            AnimatedInstructionList(
              key: ValueKey('tat-intro-$_animationSeed'),
              lines: lines,
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: () {
                setState(() => _animationSeed++);
                context.read<TatBloc>().add(BeginTatFlow());
              },
              child: const Text('BEGIN THIS CARD'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildConsentView(BuildContext context) {
    const lines = [
      'Ready to view the scene for 30 seconds?',
      'Focus on characters, tension, and relationships.',
      'The scene disappears when the timer ends.',
    ];
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AnimatedInstructionList(
            key: ValueKey('tat-consent-$_animationSeed'),
            lines: lines,
            titleStyle: const TextStyle(fontSize: 15, height: 1.45),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () => context.read<TatBloc>().add(AcceptPictureViewing()),
            child: const Text('YES, SHOW SCENE'),
          ),
        ],
      ),
    );
  }

  Widget _buildModeView(BuildContext context) {
    const lines = [
      'Choose how you will write your TAT story.',
      'Paper: write longhand, then photo + automatic text extraction.',
      'Typing: compose directly in the app.',
    ];
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AnimatedInstructionList(
            key: ValueKey('tat-mode-$_animationSeed'),
            lines: lines,
            titleStyle: const TextStyle(fontSize: 15, height: 1.45),
          ),
          const SizedBox(height: 20),
          ListTile(
            tileColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            title: const Text('Type in app'),
            onTap: () => context
                .read<TatBloc>()
                .add(const SelectStoryMode(StoryInputMode.typing)),
          ),
          const SizedBox(height: 12),
          ListTile(
            tileColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            title: const Text('Write on paper'),
            onTap: () => context
                .read<TatBloc>()
                .add(const SelectStoryMode(StoryInputMode.paper)),
          ),
        ],
      ),
    );
  }

  Widget _buildPrepView(TatState state) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.hourglass_top, size: 48, color: AppColors.accent),
          const SizedBox(height: 12),
          Text(
            'Prep: 00:${state.prepTimeRemaining.toString().padLeft(2, '0')}',
            style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            state.storyInputMode == StoryInputMode.paper
                ? 'Prepare paper and pen'
                : 'Prepare to type',
          ),
        ],
      ),
    );
  }

  Widget _buildObservingView(BuildContext context, TatState state) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Card ${state.currentImageIndex + 1} / ${state.totalImages}',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              Text(
                '00:${state.observationTimeRemaining.toString().padLeft(2, '0')}',
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: AppColors.accent,
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                color: Colors.white,
                child: SingleChildScrollView(
                  child: Text(
                    state.currentImageDescription,
                    style: const TextStyle(fontSize: 17, height: 1.55),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPerceptionView(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Perception capture',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _summaryController,
            decoration: const InputDecoration(
              labelText: 'Situation summary',
              border: OutlineInputBorder(),
            ),
            maxLines: 2,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _positiveController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Positive',
                    border: OutlineInputBorder(),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _negativeController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Negative',
                    border: OutlineInputBorder(),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _neutralController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Neutral',
                    border: OutlineInputBorder(),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Text('Quick sketch', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Container(
            height: 200,
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: AppColors.border),
              borderRadius: BorderRadius.circular(12),
            ),
            child: GestureDetector(
              onPanUpdate: (details) =>
                  setState(() => _drawPoints.add(details.localPosition)),
              onPanEnd: (_) => setState(() => _drawPoints.add(null)),
              child: CustomPaint(
                painter: _TatSketchPainter(_drawPoints),
                child: const SizedBox.expand(),
              ),
            ),
          ),
          TextButton(
            onPressed: () => setState(() => _drawPoints.clear()),
            child: const Text('Clear sketch'),
          ),
          TextField(
            controller: _sketchNotesController,
            maxLines: 3,
            decoration: const InputDecoration(
              labelText: 'Notes',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () {
              context.read<TatBloc>().add(
                    SubmitPerceptionMeta(
                      situationSummary: _summaryController.text.trim(),
                      positiveCharacters:
                          int.tryParse(_positiveController.text.trim()) ?? 0,
                      negativeCharacters:
                          int.tryParse(_negativeController.text.trim()) ?? 0,
                      neutralCharacters:
                          int.tryParse(_neutralController.text.trim()) ?? 0,
                      sketchNotes:
                          '${_sketchNotesController.text.trim()}\n[strokes: ${_drawPoints.where((p) => p != null).length}]',
                    ),
                  );
            },
            child: const Text('CONTINUE TO STORY'),
          ),
        ],
      ),
    );
  }

  Widget _buildWritingView(BuildContext context, TatState state) {
    final minutes = (state.writingTimeRemaining / 60).floor();
    final seconds =
        (state.writingTimeRemaining % 60).toString().padLeft(2, '0');

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Card ${state.currentImageIndex + 1}/${state.totalImages}',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              Chip(
                avatar: const Icon(Icons.timer, size: 16),
                label: Text('$minutes:$seconds',
                    style: const TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const Text(
            'Write your story',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: Column(
              children: [
                if (state.storyInputMode == StoryInputMode.paper) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceSoft,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Upload written paper',
                            style: TextStyle(fontWeight: FontWeight.w700)),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          children: [
                            OutlinedButton.icon(
                              onPressed: _ocrBusy
                                  ? null
                                  : () => _pickWrittenPaper(ImageSource.camera),
                              icon: const Icon(Icons.camera_alt_outlined),
                              label: const Text('Capture'),
                            ),
                            OutlinedButton.icon(
                              onPressed: _ocrBusy
                                  ? null
                                  : () => _pickWrittenPaper(ImageSource.gallery),
                              icon: const Icon(Icons.photo_library_outlined),
                              label: const Text('Upload'),
                            ),
                            if (_writtenPaperImage != null && !_ocrBusy)
                              TextButton.icon(
                                onPressed: _extractOcr,
                                icon: const Icon(Icons.document_scanner_outlined),
                                label: const Text('Extract again'),
                              ),
                          ],
                        ),
                        if (_ocrBusy) ...[
                          const SizedBox(height: 8),
                          const Text('Reading handwriting…',
                              style: TextStyle(fontSize: 13)),
                        ],
                        if (kDebugMode && _ocrUploadDebugLine != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 6),
                            child: Text(
                              _ocrUploadDebugLine!,
                              style: TextStyle(
                                fontSize: 11,
                                fontFamily: 'monospace',
                                color: AppColors.textSecondary
                                    .withValues(alpha: 0.85),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                Expanded(
                  child: TextField(
                    controller: _storyController,
                    maxLines: null,
                    expands: true,
                    textAlignVertical: TextAlignVertical.top,
                    decoration: InputDecoration(
                      hintText:
                          'What led here? What is happening? What will be the outcome?',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      filled: true,
                      fillColor: Colors.white,
                    ),
                  ),
                ),
                if (state.storyInputMode == StoryInputMode.paper) ...[
                  const SizedBox(height: 12),
                  TextField(
                    controller: _ocrController,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      hintText: 'Extracted text — edit if needed',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: () {
              context.read<TatBloc>().add(
                    SubmitStory(
                      _storyController.text,
                      handwrittenText:
                          state.storyInputMode == StoryInputMode.paper
                              ? _ocrController.text
                              : null,
                    ),
                  );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.secondary,
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
            child: const Text('SUBMIT STORY'),
          ),
        ],
      ),
    );
  }

  Future<void> _pickWrittenPaper(ImageSource source) async {
    final selected = await _imagePicker.pickImage(source: source, imageQuality: 82);
    if (!mounted || selected == null) return;
    setState(() {
      _writtenPaperImage = selected;
      _ocrUploadDebugLine = null;
    });
    await _extractOcr();
  }

  Future<void> _extractOcr() async {
    final file = _writtenPaperImage;
    if (file == null || !mounted) return;

    setState(() => _ocrBusy = true);
    try {
      final raw = await file.readAsBytes();
      final payload = await prepareImageForOcr(raw, pathHint: file.path);
      if (kDebugMode && mounted) {
        final orig = raw.length;
        final prep = payload.bytes.length;
        final savedPct =
            orig > 0 ? ((1 - prep / orig) * 100).clamp(0, 100).round() : 0;
        setState(() {
          _ocrUploadDebugLine =
              'OCR upload (debug): ${_formatBytesForDebug(orig)} → ${_formatBytesForDebug(prep)} (−$savedPct%)';
        });
      }
      final b64 = base64Encode(payload.bytes);
      final response = await _backendApi.post('/api/ppdt/ocr', {
        'imageBase64': b64,
        'mimeType': payload.mimeType,
      });
      final text = (response['text'] as String?)?.trim() ?? '';
      if (!mounted) return;
      if (text.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Could not read text. Try a clearer photo.')),
        );
        return;
      }
      _ocrController.text = text;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Text extracted. Review before submit.')),
      );
    } catch (e) {
      if (!mounted) return;
      if (kDebugMode) setState(() => _ocrUploadDebugLine = null);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('OCR failed: $e')),
      );
    } finally {
      if (mounted) setState(() => _ocrBusy = false);
    }
  }
}

class _TatSketchPainter extends CustomPainter {
  _TatSketchPainter(this.points);

  final List<Offset?> points;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.primary
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round;

    for (var i = 0; i < points.length - 1; i++) {
      final a = points[i];
      final b = points[i + 1];
      if (a != null && b != null) canvas.drawLine(a, b, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _TatSketchPainter oldDelegate) =>
      oldDelegate.points != points;
}
