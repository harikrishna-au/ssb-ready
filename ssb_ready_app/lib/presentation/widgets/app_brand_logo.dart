import 'package:flutter/material.dart';

/// Central logo asset used on splash, auth screens, and branding spots.
class AppBrandLogo extends StatelessWidget {
  const AppBrandLogo({
    super.key,
    this.size = 96,
    this.borderRadius = 28,
  });

  final double size;
  final double borderRadius;

  static const String assetPath = 'assets/images/app_logo.png';

  @override
  Widget build(BuildContext context) {
    final dpr = MediaQuery.devicePixelRatioOf(context);
    final px = (size * dpr).round().clamp(64, 512);

    return SizedBox(
      width: size,
      height: size,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: Image.asset(
          assetPath,
          fit: BoxFit.contain,
          gaplessPlayback: true,
          filterQuality: FilterQuality.medium,
          cacheWidth: px,
          cacheHeight: px,
          errorBuilder: (context, error, stackTrace) {
            return ColoredBox(
              color: Colors.white.withValues(alpha: 0.12),
              child: Icon(
                Icons.shield_outlined,
                size: size * 0.45,
                color: Colors.white,
              ),
            );
          },
        ),
      ),
    );
  }
}
