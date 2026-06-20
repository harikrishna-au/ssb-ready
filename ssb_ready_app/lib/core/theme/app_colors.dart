import 'package:flutter/material.dart';

/// SSB Ready — Cinematic Dark design system.
/// All colour values are design tokens; never use raw hex in widgets.
class AppColors {
  AppColors._();

  // ── Base backgrounds ──────────────────────────────────────────────────────
  static const Color background     = Color(0xFF0A0B0F); // deepest bg
  static const Color bgSurface      = Color(0xFF111318); // subtle lift
  static const Color surface        = Color(0xFF1C1E2A); // card bg
  static const Color surfaceSoft    = Color(0xFF242735); // elevated card
  static const Color surfaceHigh    = Color(0xFF2E3147); // pressed / modal
  static const Color glass          = Color(0x1AFFFFFF); // 10% white overlay

  // ── Brand / Primary — Electric Blue ──────────────────────────────────────
  static const Color primary        = Color(0xFF4B7BF5);
  static const Color primaryLight   = Color(0xFF7DA3FF);
  static const Color primaryDark    = Color(0xFF2B55C9);
  static const Color primaryGlow    = Color(0x334B7BF5); // glow behind buttons
  static const Color primaryGreen   = Color(0xFF34D399); // kept for OIR compat

  // ── Secondary — Deep Violet ───────────────────────────────────────────────
  static const Color secondary      = Color(0xFF8B80FF);
  static const Color secondaryLight = Color(0xFFB3ACFF);
  static const Color secondaryDark  = Color(0xFF5A50D4);

  // ── Accent — Gold ─────────────────────────────────────────────────────────
  static const Color accent         = Color(0xFFF5A623);
  static const Color accentSoft     = Color(0x33F5A623);

  // ── Semantic colours ──────────────────────────────────────────────────────
  static const Color success        = Color(0xFF34D399);
  static const Color successSoft    = Color(0x2234D399);
  static const Color warning        = Color(0xFFFBBF24);
  static const Color warningSoft    = Color(0x22FBBF24);
  static const Color error          = Color(0xFFFF5C6B);
  static const Color errorSoft      = Color(0x22FF5C6B);
  static const Color info           = Color(0xFF38BDF8);

  // ── Text ──────────────────────────────────────────────────────────────────
  static const Color textPrimary    = Color(0xFFEDEEF2);
  static const Color textSecondary  = Color(0xFF8B8FA8);
  static const Color textHint       = Color(0xFF545770);
  static const Color textOnPrimary  = Color(0xFFFFFFFF);

  // ── Borders & dividers ────────────────────────────────────────────────────
  static const Color border         = Color(0xFF242735);
  static const Color borderBright   = Color(0xFF363A54);
  static const Color divider        = Color(0xFF1C1E2A);

  // ── Gradients ─────────────────────────────────────────────────────────────
  static const List<Color> heroGradient = [
    Color(0xFF0D1630),
    Color(0xFF0A0B0F),
  ];

  static const List<Color> brandGradient = [
    Color(0xFF4B7BF5),
    Color(0xFF8B80FF),
  ];

  static const List<Color> goldGradient = [
    Color(0xFFF5A623),
    Color(0xFFFF7C5C),
  ];

  static const List<Color> successGradient = [
    Color(0xFF34D399),
    Color(0xFF3ABFF8),
  ];

  /// Module-specific accent colours (consistent per feature throughout app).
  static const Color oirColor       = Color(0xFF4B7BF5); // blue
  static const Color ppdtColor      = Color(0xFF8B80FF); // violet
  static const Color psychColor     = Color(0xFF34D399); // emerald
  static const Color interviewColor = Color(0xFFF5A623); // gold
  static const Color premiumColor   = Color(0xFFFFD166); // bright gold
}
