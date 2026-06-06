import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';
import 'package:ssb_ready_app/core/services/backend_api_client.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';
import 'package:ssb_ready_app/core/utils/ocr_image_prepare.dart';
import 'package:ssb_ready_app/presentation/bloc/ppdt/ppdt_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/ppdt/ppdt_event.dart';
import 'package:ssb_ready_app/presentation/bloc/ppdt/ppdt_state.dart';
import 'package:ssb_ready_app/presentation/widgets/animated_instruction_list.dart';

part 'ppdt_screen_flow.dart';

String _formatBytesForDebug(int bytes) {
  if (bytes < 1024) return '$bytes B';
  if (bytes < 1024 * 1024) {
    return '${(bytes / 1024).toStringAsFixed(1)} KB';
  }
  return '${(bytes / (1024 * 1024)).toStringAsFixed(2)} MB';
}

class PpdtScreen extends StatefulWidget {
  const PpdtScreen({super.key});

  @override
  State<PpdtScreen> createState() => _PpdtScreenState();
}

class _PpdtScreenState extends State<PpdtScreen> {
  final TextEditingController _storyController = TextEditingController();
  final TextEditingController _ocrController = TextEditingController();
  final TextEditingController _summaryController = TextEditingController();
  final List<Offset?> _drawPoints = [];
  final ImagePicker _imagePicker = ImagePicker();
  XFile? _writtenPaperImage;
  bool _ocrBusy = false;
  final BackendApiClient _backendApi = BackendApiClient();

  /// Set only in debug builds after an OCR image is prepared (compression stats).
  String? _ocrUploadDebugLine;
  int _animationSeed = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        context.read<PpdtBloc>().add(BeginPpdtFlow());
      }
    });
  }

  @override
  void dispose() {
    _storyController.dispose();
    _ocrController.dispose();
    _summaryController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop || !context.mounted) return;
        await _confirmExit();
      },
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          title: const Text('PPDT Practice'),
          leading: IconButton(
            tooltip: 'Exit PPDT',
            icon: const Icon(Icons.close),
            onPressed: _confirmExit,
          ),
        ),
        body: BlocConsumer<PpdtBloc, PpdtState>(
          listener: (context, state) {
            if (state.phase == PpdtPhase.writing &&
                state.writingTimeRemaining == 0) {
              context.read<PpdtBloc>().add(SubmitStory(_storyController.text));
            } else if (state.phase == PpdtPhase.completed) {
              Navigator.pushReplacementNamed(context, '/ppdt-result');
            }
          },
          builder: (context, state) {
            if (state.phase == PpdtPhase.initial) {
              return _buildInitialView(context);
            } else if (state.phase == PpdtPhase.waitingPictureConsent) {
              return _buildPictureConsentView(context);
            } else if (state.phase == PpdtPhase.modeSelection) {
              return _buildModeSelectionView(context);
            } else if (state.phase == PpdtPhase.prep) {
              return _buildPrepView(state);
            } else if (state.phase == PpdtPhase.observing) {
              return _buildObservingView(context, state);
            } else if (state.phase == PpdtPhase.perceptionCapture) {
              return _buildPerceptionView(context, state);
            } else if (state.phase == PpdtPhase.writing) {
              return _buildWritingView(context, state);
            }
            return const Center(child: CircularProgressIndicator());
          },
        ),
      ),
    );
  }

  Future<bool> _confirmExit() async {
    if (!mounted) return false;
    final shouldExit = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Exit PPDT?'),
        content: const Text(
            'Are you sure you want to exit this practice screen? Your current progress will be lost.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Stay'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Exit'),
          ),
        ],
      ),
    );

    if (shouldExit == true && mounted) {
      Navigator.pop(context);
      return true;
    }
    return false;
  }

  Widget _buildPerceptionView(BuildContext context, PpdtState state) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Perception Capture',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 10),
          const Text('Add what you observed before writing your story.'),
          const SizedBox(height: 4),
          Text(
            'Time remaining: 00:${state.perceptionTimeRemaining.toString().padLeft(2, '0')}',
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _summaryController,
            decoration: const InputDecoration(
              labelText: 'Situation summary',
              border: OutlineInputBorder(),
            ),
            maxLines: 2,
          ),
          const SizedBox(height: 12),
          const Text('Quick sketch pad',
              style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Container(
            height: 220,
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: AppColors.border),
              borderRadius: BorderRadius.circular(12),
            ),
            child: GestureDetector(
              onPanUpdate: (details) {
                setState(() => _drawPoints.add(details.localPosition));
              },
              onPanEnd: (_) => setState(() => _drawPoints.add(null)),
              child: CustomPaint(
                painter: _SketchPainter(_drawPoints),
                child: const SizedBox.expand(),
              ),
            ),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: () => setState(() => _drawPoints.clear()),
            child: const Text('Clear Sketch'),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () {
              context.read<PpdtBloc>().add(
                    SubmitPerceptionMeta(
                      situationSummary: _summaryController.text.trim(),
                      positiveCharacters: 0,
                      negativeCharacters: 0,
                      neutralCharacters: 0,
                      sketchNotes:
                          '[Sketch strokes: ${_drawPoints.where((p) => p != null).length}]',
                    ),
                  );
            },
            child: const Text('CONTINUE TO STORY'),
          )
        ],
      ),
    );
  }

  Widget _buildWritingView(BuildContext context, PpdtState state) {
    final minutes = (state.writingTimeRemaining / 60).floor();
    final seconds =
        (state.writingTimeRemaining % 60).toString().padLeft(2, '0');

    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Write your story',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
              ),
              Chip(
                avatar: const Icon(Icons.timer, size: 16),
                label: Text(
                  '$minutes:$seconds',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                side: BorderSide.none,
                backgroundColor: state.writingTimeRemaining < 60
                    ? AppColors.error.withValues(alpha: 0.12)
                    : AppColors.secondary.withValues(alpha: 0.12),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Expanded(
            child: Column(
              children: [
                if (state.storyInputMode == StoryInputMode.paper) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceSoft,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Upload your written paper',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Take a clear photo or pick from gallery — text is extracted automatically.',
                          style: TextStyle(
                              fontSize: 12, color: AppColors.textSecondary),
                        ),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
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
                                  : () =>
                                      _pickWrittenPaper(ImageSource.gallery),
                              icon: const Icon(Icons.photo_library_outlined),
                              label: const Text('Upload'),
                            ),
                            if (_writtenPaperImage != null && !_ocrBusy)
                              TextButton.icon(
                                onPressed: _extractTextFromWrittenPaper,
                                icon:
                                    const Icon(Icons.document_scanner_outlined),
                                label: const Text('Extract again'),
                              ),
                          ],
                        ),
                        if (_ocrBusy) ...[
                          const SizedBox(height: 12),
                          const Row(
                            children: [
                              SizedBox(
                                width: 18,
                                height: 18,
                                child:
                                    CircularProgressIndicator(strokeWidth: 2),
                              ),
                              SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  'Reading your handwriting…',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                        if (_writtenPaperImage != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            'Selected: ${_writtenPaperImage!.name}',
                            style: const TextStyle(fontSize: 12),
                          ),
                        ],
                        if (kDebugMode && _ocrUploadDebugLine != null) ...[
                          const SizedBox(height: 6),
                          Text(
                            _ocrUploadDebugLine!,
                            style: TextStyle(
                              fontSize: 11,
                              height: 1.3,
                              color: AppColors.textSecondary
                                  .withValues(alpha: 0.85),
                              fontFamily: 'monospace',
                            ),
                          ),
                        ],
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
                          'Describe what led up to the situation, what is currently happening, and what the outcome will be...',
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
                      hintText:
                          'Handwritten story appears here after capture/upload. You can edit before submit.',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ]
              ],
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () {
              context.read<PpdtBloc>().add(
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
            child: const Text('SUBMIT STORY', style: TextStyle(fontSize: 16)),
          ),
        ],
      ),
    );
  }

  void _restartIntroAnimation() {
    setState(() => _animationSeed++);
  }

  Future<void> _pickWrittenPaper(ImageSource source) async {
    final selected =
        await _imagePicker.pickImage(source: source, imageQuality: 82);
    if (!mounted || selected == null) return;
    setState(() {
      _writtenPaperImage = selected;
      _ocrUploadDebugLine = null;
    });
    await _extractTextFromWrittenPaper();
  }

  Future<void> _extractTextFromWrittenPaper() async {
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
              content:
                  Text('Could not read text from image. Try a clearer photo.')),
        );
        return;
      }
      _ocrController.text = text;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Story text extracted. Review and edit if needed.')),
      );
    } catch (e) {
      if (!mounted) return;
      if (kDebugMode) {
        setState(() => _ocrUploadDebugLine = null);
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('OCR failed: $e')),
      );
    } finally {
      if (mounted) setState(() => _ocrBusy = false);
    }
  }
}

class _SketchPainter extends CustomPainter {
  final List<Offset?> points;

  _SketchPainter(this.points);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.primary
      ..strokeWidth = 2.2
      ..strokeCap = StrokeCap.round;

    for (int i = 0; i < points.length - 1; i++) {
      final p1 = points[i];
      final p2 = points[i + 1];
      if (p1 != null && p2 != null) {
        canvas.drawLine(p1, p2, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant _SketchPainter oldDelegate) =>
      oldDelegate.points != points;
}
