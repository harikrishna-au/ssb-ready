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

class _CustomTextFieldState extends State<CustomTextField> {
  late bool _isObscured;
  bool _isFocused = false;

  @override
  void initState() {
    super.initState();
    _isObscured = widget.obscureText;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.label,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            boxShadow: _isFocused
                ? [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.12),
                      blurRadius: 20,
                      spreadRadius: 1,
                      offset: const Offset(0, 6),
                    ),
                  ]
                : const [],
          ),
          child: Focus(
            onFocusChange: (focused) => setState(() => _isFocused = focused),
            child: TextField(
              controller: widget.controller,
              keyboardType: widget.keyboardType,
              obscureText: _isObscured,
              textInputAction: widget.textInputAction,
              focusNode: widget.focusNode,
              onChanged: widget.onChanged,
              onEditingComplete: widget.onEditingComplete,
              decoration: InputDecoration(
                hintText: widget.hint,
                prefixIcon: widget.prefixIcon,
                suffixIcon: (widget.obscureText || widget.isPassword)
                    ? GestureDetector(
                        onTap: () {
                          setState(() {
                            _isObscured = !_isObscured;
                          });
                        },
                        child: Icon(
                          _isObscured ? Icons.visibility_off : Icons.visibility,
                          color: AppColors.textSecondary,
                        ),
                      )
                    : widget.suffixIcon,
                errorText: widget.errorText,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
