import 'package:flutter/cupertino.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:ssb_ready_app/auth_navigation.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';
import 'package:ssb_ready_app/presentation/bloc/auth/auth_bloc.dart';
import 'package:ssb_ready_app/presentation/screens/auth/login_screen.dart';
import 'package:ssb_ready_app/presentation/screens/auth/signup_screen.dart';
import 'package:ssb_ready_app/presentation/screens/auth/user_type_selection_screen.dart'
    show UserTypeSelectionGate;
import 'package:ssb_ready_app/presentation/screens/dashboard/dashboard_screen.dart';
import 'package:ssb_ready_app/presentation/screens/oir/oir_test_screen.dart';
import 'package:ssb_ready_app/presentation/screens/ppdt/ppdt_result_screen.dart';
import 'package:ssb_ready_app/presentation/screens/ppdt/ppdt_screen.dart';
import 'package:ssb_ready_app/presentation/screens/splash_screen.dart';
import 'package:ssb_ready_app/presentation/screens/wat/wat_screen.dart';
import 'package:ssb_ready_app/presentation/screens/wat/wat_result_screen.dart';
import 'package:ssb_ready_app/presentation/screens/psychology/psychology_hub_screen.dart';
import 'package:ssb_ready_app/presentation/screens/srt/srt_screen.dart';
import 'package:ssb_ready_app/presentation/screens/srt/srt_result_screen.dart';
import 'package:ssb_ready_app/presentation/screens/profile/profile_screen.dart';
import 'package:ssb_ready_app/presentation/screens/premium/lifetime_premium_screen.dart';
import 'package:ssb_ready_app/presentation/screens/psychology/tat_screen.dart';
import 'package:ssb_ready_app/presentation/screens/psychology/tat_result_screen.dart';
import 'package:ssb_ready_app/presentation/screens/interview/interview_hub_screen.dart';
import 'package:ssb_ready_app/presentation/screens/interview/piq_form_screen.dart';
import 'package:ssb_ready_app/presentation/screens/interview/mock_interview_screen.dart';
import 'package:ssb_ready_app/presentation/screens/interview/question_bank_screen.dart';
import 'package:ssb_ready_app/presentation/bloc/sdt/sdt_bloc.dart';
import 'package:ssb_ready_app/presentation/screens/sdt/sdt_screen.dart';
import 'package:ssb_ready_app/presentation/screens/sdt/sdt_result_screen.dart';
import 'package:ssb_ready_app/presentation/screens/history/history_screen.dart';
import 'package:ssb_ready_app/presentation/screens/onboarding/onboarding_screen.dart'
    show OnboardingScreen, kOnboardingDoneKey;
import 'package:ssb_ready_app/presentation/screens/current_affairs/current_affairs_screen.dart';

class App extends StatelessWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listenWhen: (previous, current) =>
          current is AuthAuthenticated ||
          current is AuthUnauthenticated ||
          current is AuthSessionExpired,
      listener: (context, state) {
        final nav = appRootNavigatorKey.currentState;
        if (nav == null) return;

        void go(String name, [Object? args]) {
          nav.pushNamedAndRemoveUntil(name, (_) => false, arguments: args);
        }

        if (state is AuthAuthenticated) {
          final needsCategory =
              state.user.userType == null || state.user.userType!.isEmpty;
          if (needsCategory) {
            go('/user-type-selection', state.user.email);
          } else {
            // Show onboarding the first time a user logs in
            SharedPreferences.getInstance().then((prefs) {
              final done = prefs.getBool(kOnboardingDoneKey) ?? false;
              if (!done) {
                go('/onboarding');
              } else {
                go('/dashboard');
              }
            });
            return; // navigation handled asynchronously above
          }
        } else if (state is AuthUnauthenticated) {
          go('/login');
        } else if (state is AuthSessionExpired) {
          // Token revoked or password changed from another device.
          go('/login');
          // Show an explanatory snackbar on the next frame, after navigation.
          WidgetsBinding.instance.addPostFrameCallback((_) {
            final ctx = appRootNavigatorKey.currentContext;
            if (ctx == null || !ctx.mounted) return;
            ScaffoldMessenger.of(ctx).showSnackBar(
              const SnackBar(
                content: Text(
                  'Your session has expired. Please sign in again.',
                ),
                backgroundColor: Colors.orange,
                duration: Duration(seconds: 5),
              ),
            );
          });
        }
      },
      child: MaterialApp(
      title: 'SSB Ready: Prep & Mock Tests',
      debugShowCheckedModeBanner: false,
      scrollBehavior: const _AppScrollBehavior(),
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorScheme: const ColorScheme.dark(
          primary: AppColors.primary,
          secondary: AppColors.secondary,
          surface: AppColors.surface,
          error: AppColors.error,
          onPrimary: Colors.white,
          onSecondary: Colors.white,
          onSurface: AppColors.textPrimary,
          onError: Colors.white,
        ),
        scaffoldBackgroundColor: AppColors.background,
        textTheme: GoogleFonts.interTextTheme(
          ThemeData.dark().textTheme,
        ).apply(
          bodyColor: AppColors.textPrimary,
          displayColor: AppColors.textPrimary,
        ),
        appBarTheme: const AppBarTheme(
          centerTitle: false,
          elevation: 0,
          scrolledUnderElevation: 0,
          surfaceTintColor: Colors.transparent,
          backgroundColor: Colors.transparent,
          foregroundColor: AppColors.textPrimary,
          systemOverlayStyle: SystemUiOverlayStyle(
            statusBarColor: Colors.transparent,
            statusBarIconBrightness: Brightness.light,
            statusBarBrightness: Brightness.dark,
            systemNavigationBarColor: Colors.transparent,
            systemNavigationBarIconBrightness: Brightness.light,
          ),
          titleTextStyle: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.3,
          ),
          iconTheme: IconThemeData(color: AppColors.textPrimary),
          actionsIconTheme: IconThemeData(color: AppColors.textSecondary),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            elevation: 0,
            shadowColor: Colors.transparent,
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
            minimumSize: const Size(0, 52),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            textStyle: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.2,
            ),
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: AppColors.borderBright),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 18),
            minimumSize: const Size(0, 52),
            foregroundColor: AppColors.textPrimary,
            textStyle: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            foregroundColor: AppColors.primary,
            textStyle: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColors.surface,
          hintStyle: const TextStyle(color: AppColors.textHint, fontSize: 14),
          labelStyle: const TextStyle(color: AppColors.textSecondary),
          floatingLabelStyle: TextStyle(color: AppColors.primary),
          prefixIconColor: AppColors.textSecondary,
          suffixIconColor: AppColors.textSecondary,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 14,
          ),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: AppColors.border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: AppColors.border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: AppColors.primary, width: 1.8),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: AppColors.error),
          ),
          focusedErrorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: AppColors.error, width: 1.8),
          ),
          errorStyle: const TextStyle(color: AppColors.error, fontSize: 12),
        ),
        cardTheme: CardThemeData(
          elevation: 0,
          color: AppColors.surface,
          surfaceTintColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: const BorderSide(color: AppColors.border, width: 0.8),
          ),
        ),
        chipTheme: ChipThemeData(
          backgroundColor: AppColors.surfaceSoft,
          selectedColor: AppColors.primary.withValues(alpha: 0.18),
          labelStyle: const TextStyle(
              color: AppColors.textPrimary, fontSize: 12, fontWeight: FontWeight.w500),
          side: const BorderSide(color: AppColors.border),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        ),
        dividerTheme: const DividerThemeData(
          color: AppColors.border,
          thickness: 0.8,
          space: 1,
        ),
        listTileTheme: const ListTileThemeData(
          tileColor: Colors.transparent,
          iconColor: AppColors.textSecondary,
          titleTextStyle: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 15,
            fontWeight: FontWeight.w500,
          ),
          subtitleTextStyle: TextStyle(
            color: AppColors.textSecondary,
            fontSize: 13,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(14)),
          ),
          contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        ),
        snackBarTheme: SnackBarThemeData(
          backgroundColor: AppColors.surfaceHigh,
          contentTextStyle: const TextStyle(
              color: AppColors.textPrimary, fontSize: 14, fontWeight: FontWeight.w500),
          actionTextColor: AppColors.primary,
          behavior: SnackBarBehavior.floating,
          elevation: 0,
          insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
        dialogTheme: DialogThemeData(
          backgroundColor: AppColors.bgSurface,
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          titleTextStyle: const TextStyle(
            color: AppColors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.3,
          ),
          contentTextStyle: const TextStyle(
            color: AppColors.textSecondary,
            fontSize: 14,
            height: 1.5,
          ),
        ),
        bottomSheetTheme: const BottomSheetThemeData(
          backgroundColor: AppColors.bgSurface,
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          modalBackgroundColor: AppColors.bgSurface,
          modalElevation: 0,
          dragHandleColor: AppColors.borderBright,
          dragHandleSize: Size(40, 4),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
        ),
        progressIndicatorTheme: const ProgressIndicatorThemeData(
          color: AppColors.primary,
          linearTrackColor: AppColors.surfaceSoft,
          circularTrackColor: AppColors.surfaceSoft,
        ),
        pageTransitionsTheme: const PageTransitionsTheme(
          builders: {
            TargetPlatform.android: _SlideUpPageTransitionsBuilder(),
            TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
          },
        ),
      ),
      navigatorKey: appRootNavigatorKey,
      home: const SplashScreen(),
      routes: {
        '/login': (context) => const LoginScreen(),
        '/signup': (context) => const SignupScreen(),
        '/user-type-selection': (context) => const UserTypeSelectionGate(),
        '/dashboard': (context) => const DashboardScreen(),
        '/oir-test': (context) => const OirTestScreen(),
        '/ppdt': (context) => const PpdtScreen(),
        '/ppdt-result': (context) => const PpdtResultScreen(),
        '/wat': (context) => const WatScreen(),
        '/wat-result': (context) => const WatResultScreen(),
        '/psychology': (context) => const PsychologyHubScreen(),
        '/srt': (context) => const SrtScreen(),
        '/srt-result': (context) => const SrtResultScreen(),
        '/profile': (context) => const ProfileScreen(),
        '/premium': (context) => const LifetimePremiumScreen(),
        '/tat': (context) => const TatScreen(),
        '/tat-result': (context) => const TatResultScreen(),
        '/interview': (context) => const InterviewHubScreen(),
        '/piq-form': (context) => const PiqFormScreen(),
        '/mock-interview': (context) => const MockInterviewScreen(),
        '/question-bank': (context) => const QuestionBankScreen(),
        '/history': (context) => const HistoryScreen(),
        '/onboarding': (context) => const OnboardingScreen(),
        '/current-affairs': (context) => const CurrentAffairsScreen(),
        '/sdt': (context) => BlocProvider<SdtBloc>(
              create: (_) => SdtBloc(),
              child: const SdtScreen(),
            ),
        '/sdt-result': (context) => const SdtResultScreen(),
      },
      navigatorObservers: [_AuthNavigatorObserver()],
    ),
    );
  }
}

class _AuthNavigatorObserver extends NavigatorObserver {
  @override
  void didPush(Route route, Route? previousRoute) {
    debugPrint('Pushed: ${route.settings.name}');
    _updateOverlay(route.settings.name);
  }

  @override
  void didPop(Route route, Route? previousRoute) {
    debugPrint('Popped: ${route.settings.name}');
    _updateOverlay(previousRoute?.settings.name);
  }

  @override
  void didReplace({Route? newRoute, Route? oldRoute}) {
    _updateOverlay(newRoute?.settings.name);
  }

  void _updateOverlay(String? routeName) {
    // Keep overlays transparent on all routes — dark icons everywhere
    SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      statusBarBrightness: Brightness.dark,
      systemNavigationBarColor: Colors.transparent,
      systemNavigationBarIconBrightness: Brightness.light,
    ));
  }
}

// ── Smooth slide-up + fade page transition (Android) ─────────────────────────
class _SlideUpPageTransitionsBuilder extends PageTransitionsBuilder {
  const _SlideUpPageTransitionsBuilder();

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    const begin = Offset(0.0, 0.04);
    const end = Offset.zero;
    const curve = Curves.easeOutCubic;

    final tween = Tween(begin: begin, end: end).chain(CurveTween(curve: curve));
    final fadeTween = Tween<double>(begin: 0.0, end: 1.0)
        .chain(CurveTween(curve: const Interval(0.0, 0.6, curve: Curves.easeOut)));

    return FadeTransition(
      opacity: animation.drive(fadeTween),
      child: SlideTransition(
        position: animation.drive(tween),
        child: child,
      ),
    );
  }
}

// ── Scroll behavior: remove the glow overscroll effect on Android ─────────────
class _AppScrollBehavior extends ScrollBehavior {
  const _AppScrollBehavior();

  @override
  Widget buildOverscrollIndicator(
      BuildContext context, Widget child, ScrollableDetails details) {
    return child; // no glow
  }

  @override
  ScrollPhysics getScrollPhysics(BuildContext context) =>
      const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics());
}
