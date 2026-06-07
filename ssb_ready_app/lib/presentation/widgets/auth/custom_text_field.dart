import 'package:flutter/material.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';

class CustomTextField extends StatefulWidget {
  final String label;
  final String hint;
  final TextEditingController controller;
  final TextInputType keyboardType;
  final bool obscureText;
  final String? errorText;
  final Function(String)? onChanged;
  final TextInputAction textInputAction;
  final FocusNode? focusNode;
  final Widget? prefixIcon;
  final Widget? suffixIcon;
  final bool isPassword;
  final VoidCallback? onEditingComplete;

  const CustomTextField({
    super.key,
    required this.label,
    required this.hint,
    required this.controller,
    this.keyboardType = TextInputType.text,
    this.obscureText = false,
    this.errorText,
    this.onChanged,
    this.textInputAction = TextInputAction.next,
    this.focusNode,
    this.prefixIcon,
    this.suffixIcon,
    this.isPassword = false,
    this.onEditingComplete,
  });

  @override
  State<CustomTextField> createState() => _CustomTextFieldState();
}

class _CustomTextFieldState extends State<CustomTextField>
    with SingleTickerProviderStateMixin {
  late bool _isObscured;
  bool _isFocused = false;
  late AnimationController _glowController;
  late Animation<double> _glowAnimation;

  @override
  void initState() {
    super.initState();
    _isObscured = widget.obscureText;
    _glowController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 260),
    );
    _glowAnimation = CurvedAnimation(
      parent: _glowController,
      curve: Curves.easeOutCubic,
    );
  }

  @override
  void dispose() {
    _glowController.dispose();
    super.dispose();
  }

  void _onFocusChange(bool focused) {
    setState(() => _isFocused = focused);
    if (focused) {
      _glowController.forward();
    } else {
      _glowController.reverse();
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasError = widget.errorText != null && widget.errorText!.isNotEmpty;
    final borderColor = hasError
        ? AppColors.error
        : _isFocused
            ? AppColors.primary
            : AppColors.border;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Label
        AnimatedDefaultTextStyle(
          duration: const Duration(milliseconds: 200),
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: hasError
                ? AppColors.error
                : _isFocused
                    ? AppColors.primary
                    : AppColors.textSecondary,
          ),
          child: Text(widget.label),
        ),
        const SizedBox(height: 8),

        // Field with animated glow
        AnimatedBuilder(
          animation: _glowAnimation,
          builder: (context, child) => Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(
                  color: (hasError ? AppColors.error : AppColors.primary)
                      .withValues(alpha: 0.14 * _glowAnimation.value),
                  blurRadius: 20,
                  spreadRadius: 1,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: child,
          ),
          child: Focus(
            onFocusChange: _onFocusChange,
            child: TextField(
              controller: widget.controller,
              keyboardType: widget.keyboardType,
              obscureText: _isObscured,
              textInputAction: widget.textInputAction,
              focusNode: widget.focusNode,
              onChanged: widget.onChanged,
              onEditingComplete: widget.onEditingComplete,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 15,
                fontWeight: FontWeight.w500,
              ),
              decoration: InputDecoration(
                hintText: widget.hint,
                prefixIcon: widget.prefixIcon,
                suffixIcon: (widget.obscureText || widget.isPassword)
                    ? IconButton(
                        onPressed: () =>
                            setState(() => _isObscured = !_isObscured),
                        icon: Icon(
                          _isObscured
                              ? Icons.visibility_off_outlined
                              : Icons.visibility_outlined,
                          color: AppColors.textSecondary,
                          size: 20,
                        ),
                      )
                    : widget.suffixIcon,
                // Override border colors per-field based on state
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide(color: borderColor, width: _isFocused ? 1.8 : 1.0),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide(color: borderColor, width: 1.8),
                ),
              ),
            ),
          ),
        ),

        // Error message
        if (hasError) ...[
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(Icons.error_outline_rounded,
                  size: 13, color: AppColors.error),
              const SizedBox(width: 5),
              Expanded(
                child: Text(
                  widget.errorText!,
                  style: const TextStyle(
                    color: AppColors.error,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}
