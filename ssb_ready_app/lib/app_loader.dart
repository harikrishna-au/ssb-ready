import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:ssb_ready_app/app.dart';
import 'package:ssb_ready_app/core/theme/app_colors.dart';
import 'package:ssb_ready_app/data/datasources/auth_service.dart';
import 'package:ssb_ready_app/data/datasources/firebase_auth_service.dart';
import 'package:ssb_ready_app/data/datasources/oir/firestore_oir_data_source.dart';
import 'package:ssb_ready_app/data/repositories/auth_repository_impl.dart';
import 'package:ssb_ready_app/domain/repositories/auth_repository.dart';
import 'package:ssb_ready_app/data/datasources/firebase_test_history_service.dart';
import 'package:ssb_ready_app/domain/repositories/test_history_repository.dart';
import 'package:ssb_ready_app/presentation/bloc/auth/auth_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/oir/oir_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/ppdt/ppdt_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/wat/wat_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/srt/srt_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/tat/tat_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/interview/interview_bloc.dart';

/// Paints an immediate lightweight frame, then loads Firebase / prefs off the
/// critical path to first paint. Helps avoid emulator "System UI isn't
/// responding" when [main] blocked for seconds before [runApp].
class AppLoader extends StatefulWidget {
  const AppLoader({super.key});

  @override
  State<AppLoader> createState() => _AppLoaderState();
}

class _AppLoaderState extends State<AppLoader> {
  Widget? _app;
  String? _error;

  @override
  void initState() {
    super.initState();
    // Let the loader paint one frame before any I/O (helps weak emulators).
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _bootstrap();
      }
    });
  }

  Future<void> _bootstrap() async {
    try {
      try {
        await dotenv.load(fileName: '.env');
      } catch (e) {
        debugPrint('Warning: Could not load .env file: $e');
      }

      final initResults = await Future.wait<Object>([
        Firebase.initializeApp(),
        SharedPreferences.getInstance(),
      ]);
      FirebaseAuthService.applyAuthLocaleFromPlatform();
      final prefs = initResults[1] as SharedPreferences;

      final authService = FirebaseAuthService(prefs) as AuthService;
      final testHistoryRepository =
          FirebaseTestHistoryService() as TestHistoryRepository;

      if (!mounted) {
        return;
      }

      setState(() {
        _app = MultiRepositoryProvider(
          providers: [
            RepositoryProvider<AuthService>(
              create: (context) => authService,
            ),
            RepositoryProvider<AuthRepository>(
              create: (context) => AuthRepositoryImpl(
                authService: context.read<AuthService>(),
              ),
            ),
            RepositoryProvider<FirestoreOirDataSource>(
              create: (context) => FirestoreOirDataSource(),
            ),
            RepositoryProvider<TestHistoryRepository>(
              create: (context) => testHistoryRepository,
            ),
          ],
          child: MultiBlocProvider(
            providers: [
              BlocProvider<AuthBloc>(
                create: (context) => AuthBloc(
                  context.read<AuthRepository>(),
                ),
              ),
              BlocProvider<OirBloc>(
                create: (context) => OirBloc(
                  context.read<FirestoreOirDataSource>(),
                ),
              ),
              BlocProvider<PpdtBloc>(
                create: (context) => PpdtBloc(
                  context.read<AuthRepository>(),
                  context.read<TestHistoryRepository>(),
                ),
              ),
              BlocProvider<WatBloc>(
                create: (context) => WatBloc(),
              ),
              BlocProvider<SrtBloc>(
                create: (context) => SrtBloc(),
              ),
              BlocProvider<TatBloc>(
                create: (context) => TatBloc(
                  context.read<AuthRepository>(),
                  context.read<TestHistoryRepository>(),
                ),
              ),
              BlocProvider<InterviewBloc>(
                create: (context) => InterviewBloc(
                  context.read<AuthRepository>(),
                  context.read<TestHistoryRepository>(),
                ),
              ),
            ],
            child: const App(),
          ),
        );
      });

      debugPrint('✓ Using Firebase backend');
    } catch (e, st) {
      debugPrint('Bootstrap failed: $e\n$st');
      if (mounted) {
        setState(() => _error = e.toString());
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = _app;
    if (app != null) {
      return app;
    }

    final err = _error;
    if (err != null) {
      return MaterialApp(
        debugShowCheckedModeBanner: false,
        home: Scaffold(
          body: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                'Could not start the app.\n$err',
                textAlign: TextAlign.center,
              ),
            ),
          ),
        ),
      );
    }

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: AppColors.primary),
      ),
      home: const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: 56,
                height: 56,
                child: CircularProgressIndicator(
                  strokeWidth: 3,
                  color: AppColors.primary,
                ),
              ),
              SizedBox(height: 20),
              Text(
                'Starting…',
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
