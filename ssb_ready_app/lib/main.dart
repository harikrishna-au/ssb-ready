import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:ssb_ready_app/app_loader.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Full-bleed: extend app content under status bar and nav bar
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);

  // Dark transparent overlays so the app background shows through
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    statusBarBrightness: Brightness.dark,
    systemNavigationBarColor: Colors.transparent,
    systemNavigationBarDividerColor: Colors.transparent,
    systemNavigationBarIconBrightness: Brightness.light,
    systemNavigationBarContrastEnforced: false,
  ));

  // Lock to portrait
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  runApp(const AppLoader());
}
