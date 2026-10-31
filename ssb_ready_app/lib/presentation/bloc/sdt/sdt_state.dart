import 'package:equatable/equatable.dart';

enum SdtStatus { initial, inProgress, analyzing, completed, error }

/// The 5 SSB SDT perspectives
const List<Map<String, String>> kSdtPerspectives = [
  {
    'key': 'parents',
    'title': 'Your Parents / Guardians',
    'prompt':
        'Write how your parents or guardians describe you — your qualities, habits, strengths, and areas they feel you can improve.',
    'icon': '👨‍👩‍👦',
  },
  {
    'key': 'teachers',
    'title': 'Your Teachers / Superiors',
    'prompt':
        'Write how your teachers, professors, or superiors at work describe you — academically, professionally, and as a person.',
    'icon': '🎓',
  },
  {
    'key': 'friends',
    'title': 'Your Friends',
    'prompt':
        'Write how your close friends describe you — your personality, social traits, and how you behave in a group.',
    'icon': '🤝',
  },
  {
    'key': 'subordinates',
    'title': 'Your Juniors / Subordinates',
    'prompt':
        'Write how your juniors, team members, or people who look up to you describe your leadership and personality.',
    'icon': '⭐',
  },
  {
    'key': 'self',
    'title': 'How You See Yourself',
    'prompt':
        'Write an honest self-description — your true strengths, weaknesses, values, and what you are working to improve.',
    'icon': '🪞',
  },
];

/// Per-perspective duration in seconds (12 min each)
const int kSdtPerspectiveSeconds = 720;

class SdtState extends Equatable {
  final SdtStatus status;
  final int currentIndex;
  final Map<String, String> responses; // key → text
  final int timeRemaining;
  final String? aiAnalysis;
  final String? errorMessage;

  const SdtState({
    this.status = SdtStatus.initial,
    this.currentIndex = 0,
    this.responses = const {},
    this.timeRemaining = kSdtPerspectiveSeconds,
    this.aiAnalysis,
    this.errorMessage,
  });

  SdtState copyWith({
    SdtStatus? status,
    int? currentIndex,
    Map<String, String>? responses,
    int? timeRemaining,
    String? aiAnalysis,
    String? errorMessage,
  }) =>
      SdtState(
        status: status ?? this.status,
        currentIndex: currentIndex ?? this.currentIndex,
        responses: responses ?? this.responses,
        timeRemaining: timeRemaining ?? this.timeRemaining,
        aiAnalysis: aiAnalysis ?? this.aiAnalysis,
        errorMessage: errorMessage ?? this.errorMessage,
      );

  Map<String, String> get currentPerspective =>
      kSdtPerspectives[currentIndex];

  bool get isLastPerspective =>
      currentIndex == kSdtPerspectives.length - 1;

  @override
  List<Object?> get props => [
        status,
        currentIndex,
        responses,
        timeRemaining,
        aiAnalysis,
        errorMessage,
      ];
}
