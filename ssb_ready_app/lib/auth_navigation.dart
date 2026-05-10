import 'package:flutter/material.dart';

/// Global navigator key so auth routing works even when `home` was replaced
/// by `/login` (BlocListener on `home` alone would be disposed).
final GlobalKey<NavigatorState> appRootNavigatorKey = GlobalKey<NavigatorState>();
