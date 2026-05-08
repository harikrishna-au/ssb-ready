import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:ssb_ready_app/app.dart';
import 'package:ssb_ready_app/data/datasources/auth_service.dart';
import 'package:ssb_ready_app/data/datasources/mock_auth_service.dart';
import 'package:ssb_ready_app/data/datasources/firebase_auth_service.dart';
import 'package:ssb_ready_app/data/datasources/oir/mock_oir_data_source.dart';
import 'package:ssb_ready_app/data/repositories/auth_repository_impl.dart';
import 'package:ssb_ready_app/domain/repositories/auth_repository.dart';
import 'package:ssb_ready_app/data/datasources/firebase_test_history_service.dart';
import 'package:ssb_ready_app/data/datasources/mock_test_history_service.dart';
import 'package:ssb_ready_app/domain/repositories/test_history_repository.dart';
import 'package:ssb_ready_app/presentation/bloc/auth/auth_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/oir/oir_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/ppdt/ppdt_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/wat/wat_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/srt/srt_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/tat/tat_bloc.dart';
import 'package:ssb_ready_app/presentation/bloc/interview/interview_bloc.dart';

bool useRealBackend = true;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await dotenv.load(fileName: ".env");
  } catch (e) {
    debugPrint('Warning: Could not load .env file: $e');
  }

  try {
    // Initialize Firebase
    await Firebase.initializeApp();
    useRealBackend = true;
    debugPrint('✓ Using Firebase Authentication');
  } catch (e) {
    debugPrint('✗ Firebase initialization failed: $e');
    debugPrint('✓ Falling back to Mock Authentication');
    useRealBackend = false;
  }

  final prefs = await SharedPreferences.getInstance();

  final authService = useRealBackend
      ? FirebaseAuthService(prefs) as AuthService
      : MockAuthService(prefs) as AuthService;
  final testHistoryRepository = useRealBackend
      ? FirebaseTestHistoryService() as TestHistoryRepository
      : MockTestHistoryService() as TestHistoryRepository;

  runApp(
    MultiRepositoryProvider(
      providers: [
        RepositoryProvider<AuthService>(
          create: (context) => authService,
        ),
        RepositoryProvider<AuthRepository>(
          create: (context) => AuthRepositoryImpl(
            authService: context.read<AuthService>(),
          ),
        ),
        RepositoryProvider<MockOirDataSource>(
          create: (context) => MockOirDataSource(),
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
            )..add(const CheckAuthStatusEvent()),
          ),
          BlocProvider<OirBloc>(
            create: (context) => OirBloc(
              context.read<MockOirDataSource>(),
              context.read<AuthRepository>(),
              context.read<TestHistoryRepository>(),
            ),
          ),
          BlocProvider<PpdtBloc>(
            create: (context) => PpdtBloc(
              context.read<AuthRepository>(),
              context.read<TestHistoryRepository>(),
            ),
          ),
          BlocProvider<WatBloc>(
            create: (context) => WatBloc(
              context.read<AuthRepository>(),
              context.read<TestHistoryRepository>(),
            ),
          ),
          BlocProvider<SrtBloc>(
            create: (context) => SrtBloc(
              context.read<AuthRepository>(),
              context.read<TestHistoryRepository>(),
            ),
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
    ),
  );
}
