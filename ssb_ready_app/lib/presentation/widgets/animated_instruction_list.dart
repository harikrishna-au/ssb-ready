import 'package:flutter/material.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';

/// Staggered fade-in lines for calmer onboarding copy.
class AnimatedInstructionList extends StatefulWidget {
  const AnimatedInstructionList({
    super.key,
    required this.lines,
    this.titleStyle = const TextStyle(
      fontSize: 15,
      height: 1.5,
      color: AppColors.textSecondary,
    ),
  });

  final List<String> lines;
  final TextStyle titleStyle;

  @override
  State<AnimatedInstructionList> createState() => _AnimatedInstructionListState();
}

class _AnimatedInstructionListState extends State<AnimatedInstructionList> {
  int _visibleCount = 0;

  @override
  void initState() {
    super.initState();
    _startStagger();
  }

  Future<void> _startStagger() async {
    for (int i = 0; i < widget.lines.length; i++) {
      await Future.delayed(const Duration(milliseconds: 220));
      if (!mounted) return;
      setState(() => _visibleCount = i + 1);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(widget.lines.length, (index) {
        final visible = index < _visibleCount;
        return AnimatedSlide(
          duration: Duration(milliseconds: 350 + (index * 70)),
          curve: Curves.easeOutCubic,
          offset: visible ? Offset.zero : const Offset(0, 0.15),
          child: AnimatedOpacity(
            duration: Duration(milliseconds: 380 + (index * 70)),
            curve: Curves.easeOut,
            opacity: visible ? 1 : 0,
            child: Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Text(
                '${index + 1}. ${widget.lines[index]}',
                style: widget.titleStyle,
                textAlign: TextAlign.center,
              ),
            ),
          ),
        );
      }),
    );
  }
}
