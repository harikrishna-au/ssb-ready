import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';
import 'package:ssb_ready_app/presentation/bloc/auth/auth_bloc.dart';
import 'package:ssb_ready_app/presentation/screens/auth/login_screen.dart';
import 'package:ssb_ready_app/presentation/screens/auth/signup_screen.dart';
import 'package:ssb_ready_app/presentation/screens/auth/user_type_selection_screen.dart';
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
    return MaterialApp(
      title: 'SSBReady',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primaryGreen,
          brightness: Brightness.light,
        ),
        textTheme: GoogleFonts.poppinsTextTheme(
          Theme.of(context).textTheme,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            elevation: 2,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      ),
      home: BlocListener<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is AuthAuthenticated) {
            if (state.user.userType?.isEmpty ?? true) {
              Navigator.of(context).pushReplacementNamed(
                '/user-type-selection',
                arguments: state.user.email,
              );
            } else {
              Navigator.of(context).pushReplacementNamed('/dashboard');
            }
          } else if (state is AuthUnauthenticated) {
            Navigator.of(context).pushReplacementNamed('/login');
          }
        },
        child: const SplashScreen(),
      ),
      routes: {
        '/login': (context) => const LoginScreen(),
        '/signup': (context) => const SignupScreen(),
        '/user-type-selection': (context) {
          final email = ModalRoute.of(context)?.settings.arguments as String?;
          return UserTypeSelectionScreen(
            userEmail: email ?? 'user@example.com',
          );
        },
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
