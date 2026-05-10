import 'package:flutter/material.dart';
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
import 'package:ssb_ready_app/presentation/screens/psychology/tat_screen.dart';
import 'package:ssb_ready_app/presentation/screens/psychology/tat_result_screen.dart';
import 'package:ssb_ready_app/presentation/screens/interview/interview_hub_screen.dart';
import 'package:ssb_ready_app/presentation/screens/interview/piq_form_screen.dart';
import 'package:ssb_ready_app/presentation/screens/interview/mock_interview_screen.dart';

class App extends StatelessWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listenWhen: (previous, current) =>
          current is AuthAuthenticated || current is AuthUnauthenticated,
      listener: (context, state) {
        final nav = appRootNavigatorKey.currentState;
        if (nav == null) {
          return;
        }

        void go(String name, [Object? args]) {
          nav.pushNamedAndRemoveUntil(name, (_) => false, arguments: args);
        }

        if (state is AuthAuthenticated) {
          final needsCategory =
              state.user.userType == null || state.user.userType!.isEmpty;
          if (needsCategory) {
            go('/user-type-selection', state.user.email);
          } else {
            go('/dashboard');
          }
        } else if (state is AuthUnauthenticated) {
          go('/login');
        }
      },
      child: MaterialApp(
      title: 'SSBReady',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: const ColorScheme.light(
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
          Theme.of(context).textTheme,
        ),
        appBarTheme: const AppBarTheme(
          centerTitle: true,
          elevation: 0,
          surfaceTintColor: Colors.transparent,
          backgroundColor: Colors.transparent,
          foregroundColor: AppColors.textPrimary,
          titleTextStyle: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            elevation: 0,
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 22),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            textStyle: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: AppColors.border),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 18),
            foregroundColor: AppColors.textPrimary,
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          hintStyle: const TextStyle(color: AppColors.textHint),
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
            borderSide: const BorderSide(color: AppColors.primary, width: 1.6),
          ),
        ),
        cardTheme: CardThemeData(
          elevation: 0,
          color: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
        ),
        pageTransitionsTheme: const PageTransitionsTheme(
          builders: {
            TargetPlatform.android: FadeForwardsPageTransitionsBuilder(),
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
        '/tat': (context) => const TatScreen(),
        '/tat-result': (context) => const TatResultScreen(),
        '/interview': (context) => const InterviewHubScreen(),
        '/piq-form': (context) => const PiqFormScreen(),
        '/mock-interview': (context) => const MockInterviewScreen(),
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
  }

  @override
  void didPop(Route route, Route? previousRoute) {
    debugPrint('Popped: ${route.settings.name}');
  }
}
