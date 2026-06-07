import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_preferences/shared_preferences.dart';

part 'current_affairs_event.dart';
part 'current_affairs_state.dart';

/// Key for tracking which date the quiz was last completed.
const String _kLastQuizDate = 'ca_last_quiz_date';

class CurrentAffairsBloc
    extends Bloc<CurrentAffairsEvent, CurrentAffairsState> {
  CurrentAffairsBloc() : super(const CurrentAffairsState()) {
    on<LoadDailyQuiz>(_onLoad);
    on<AnswerQuestion>(_onAnswer);
    on<NextQuestion>(_onNext);
  }

  // ─── Embedded question bank (rotated by day-of-year) ────────────────────────
  // 5 questions per "set"; we have 4 sets → 20 unique questions cycling weekly.
  static const List<List<CaQuestion>> _questionSets = [
    // Set A
    [
      CaQuestion(
        question: 'Which country hosted the G20 Summit in 2023?',
        options: ['Brazil', 'India', 'South Africa', 'Italy'],
        correctIndex: 1,
        explanation:
            'India hosted the G20 Summit in New Delhi on 9–10 September 2023 under the theme "Vasudhaiva Kutumbakam".',
      ),
      CaQuestion(
        question: 'Operation Sindoor was launched by India in response to the Pahalgam terror attack. Which year did it occur?',
        options: ['2024', '2025', '2026', '2023'],
        correctIndex: 1,
        explanation:
            'Operation Sindoor was conducted by Indian Armed Forces in May 2025 targeting terror infrastructure in Pakistan and PoK.',
      ),
      CaQuestion(
        question:
            'Which Indian became the first to win the Nobel Peace Prize twice?',
        options: [
          'Mother Teresa',
          'Amartya Sen',
          'No Indian has won it twice',
          'Kailash Satyarthi'
        ],
        correctIndex: 2,
        explanation:
            'No Indian has won the Nobel Peace Prize twice. Mother Teresa won it once in 1979.',
      ),
      CaQuestion(
        question: 'ISRO\'s Gaganyaan mission is India\'s first ___.',
        options: [
          'Mars orbiter',
          'Human spaceflight mission',
          'Solar observation mission',
          'Lunar rover mission',
        ],
        correctIndex: 1,
        explanation:
            'Gaganyaan is India\'s first crewed orbital spacecraft, aiming to send Indian astronauts to low Earth orbit.',
      ),
      CaQuestion(
        question:
            'Which country became the first to land on the Moon\'s south pole in 2023?',
        options: ['USA', 'China', 'Russia', 'India'],
        correctIndex: 3,
        explanation:
            'India\'s Chandrayaan-3 mission successfully landed near the lunar south pole on 23 August 2023, a first for any country.',
      ),
    ],
    // Set B
    [
      CaQuestion(
        question:
            'The Agni-V missile is classified as what type of weapon?',
        options: [
          'Short-range ballistic missile',
          'Intercontinental ballistic missile',
          'Cruise missile',
          'Anti-satellite weapon',
        ],
        correctIndex: 1,
        explanation:
            'Agni-V is India\'s intercontinental ballistic missile with a range exceeding 5,000 km, capable of carrying nuclear warheads.',
      ),
      CaQuestion(
        question:
            'Which edition of the Aero India show was held in Bengaluru in 2023?',
        options: ['13th', '14th', '15th', '12th'],
        correctIndex: 2,
        explanation:
            'Aero India 2023 was the 14th edition — actually held in February 2023 at Air Force Station Yelahanka, Bengaluru.',
      ),
      CaQuestion(
        question: 'INS Vikrant, India\'s first indigenous aircraft carrier, was commissioned in which year?',
        options: ['2020', '2021', '2022', '2023'],
        correctIndex: 2,
        explanation:
            'INS Vikrant was commissioned by PM Narendra Modi on 2 September 2022 in Kochi, Kerala.',
      ),
      CaQuestion(
        question:
            'The "Defence Acquisition Procedure 2020" replaced which earlier document?',
        options: ['DPP 2013', 'DPP 2016', 'DAP 2011', 'DPP 2008'],
        correctIndex: 1,
        explanation:
            'DAP 2020 replaced the Defence Procurement Procedure (DPP) 2016 to streamline defence procurement and boost domestic manufacturing.',
      ),
      CaQuestion(
        question:
            'Which exercise is a bilateral naval exercise between India and the USA?',
        options: ['Tasman Saber', 'Malabar', 'Yudh Abhyas', 'Shakti'],
        correctIndex: 1,
        explanation:
            'Exercise Malabar is a trilateral naval exercise involving India, the USA, and Japan, promoting interoperability in the Indo-Pacific.',
      ),
    ],
    // Set C
    [
      CaQuestion(
        question:
            'The Quad grouping includes India, USA, Japan, and which other country?',
        options: ['France', 'UK', 'Australia', 'South Korea'],
        correctIndex: 2,
        explanation:
            'The Quad (Quadrilateral Security Dialogue) consists of India, USA, Japan, and Australia — focused on a free and open Indo-Pacific.',
      ),
      CaQuestion(
        question:
            'Which Indian state shares the longest international border?',
        options: [
          'Jammu & Kashmir',
          'Arunachal Pradesh',
          'West Bengal',
          'Rajasthan',
        ],
        correctIndex: 3,
        explanation:
            'Rajasthan shares the longest international border with Pakistan (1,037 km), followed by J&K and Gujarat.',
      ),
      CaQuestion(
        question: 'DRDO\'s TEJAS is what type of aircraft?',
        options: [
          'Transport aircraft',
          'Light Combat Aircraft',
          'Heavy bomber',
          'Unmanned aerial vehicle',
        ],
        correctIndex: 1,
        explanation:
            'Tejas is India\'s Light Combat Aircraft (LCA) developed by DRDO\'s ADA and manufactured by HAL.',
      ),
      CaQuestion(
        question:
            'Which organisation conducts the Combined Defence Services (CDS) examination?',
        options: ['UPSC', 'SSB', 'DRDO', 'MoD'],
        correctIndex: 0,
        explanation:
            'The Union Public Service Commission (UPSC) conducts the CDS examination for entry into the Indian Armed Forces.',
      ),
      CaQuestion(
        question: 'India\'s Defence budget for 2024–25 was approximately:',
        options: ['₹4.55 lakh crore', '₹6.21 lakh crore', '₹5.93 lakh crore', '₹7.10 lakh crore'],
        correctIndex: 2,
        explanation:
            'India\'s Defence Budget for 2024–25 was ₹6.21 lakh crore, a significant increase to support modernisation and border infrastructure.',
      ),
    ],
    // Set D
    [
      CaQuestion(
        question: 'The Siachen Glacier is the world\'s ___.',
        options: [
          'Largest glacier',
          'Highest battlefield',
          'Coldest inhabited place',
          'Longest river glacier',
        ],
        correctIndex: 1,
        explanation:
            'Siachen Glacier is the world\'s highest battlefield at an altitude of 5,400 m (17,700 ft), where India and Pakistan have maintained military presence since 1984.',
      ),
      CaQuestion(
        question:
            'The Line of Actual Control (LAC) separates India from which country?',
        options: ['Pakistan', 'Nepal', 'China', 'Bangladesh'],
        correctIndex: 2,
        explanation:
            'The LAC is the effective border between India and China, spanning approximately 3,488 km across three sectors.',
      ),
      CaQuestion(
        question:
            'Which SSB centre conducts the selection for Army candidates?',
        options: [
          'AFSB Dehradun',
          'SSB Allahabad',
          'SSB Bengaluru',
          'Multiple SSB centres across India',
        ],
        correctIndex: 3,
        explanation:
            'Army SSB centres include Allahabad (1 SSB), Bhopal (14 SSB), Bangalore (17 SSB), and Kapurthala (21 SSB).',
      ),
      CaQuestion(
        question: 'Which is India\'s first indigenously built nuclear submarine?',
        options: ['INS Arihant', 'INS Chakra', 'INS Vikrant', 'INS Sindhurakshak'],
        correctIndex: 0,
        explanation:
            'INS Arihant is India\'s first indigenously built nuclear-powered ballistic missile submarine, commissioned in 2016.',
      ),
      CaQuestion(
        question: 'The National Defence Academy (NDA) is located in:',
        options: ['Dehradun', 'Khadakwasla', 'Chennai', 'Pune'],
        correctIndex: 1,
        explanation:
            'The NDA is located at Khadakwasla, near Pune, Maharashtra. It is a joint services academy that trains officer candidates for all three branches of the Indian Armed Forces.',
      ),
    ],
  ];

  // ─── Helpers ────────────────────────────────────────────────────────────────

  static String _dateKey(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  static String _dateLabel(DateTime d) {
    const months = [
      '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${d.day} ${months[d.month]} ${d.year}';
  }

  static List<CaQuestion> _questionsForDate(DateTime d) {
    // Rotate question set based on day-of-year
    final dayOfYear = d.difference(DateTime(d.year, 1, 1)).inDays;
    final setIndex = (dayOfYear ~/ 1) % _questionSets.length;
    return _questionSets[setIndex];
  }

  // ─── Handlers ────────────────────────────────────────────────────────────────

  Future<void> _onLoad(
      LoadDailyQuiz event, Emitter<CurrentAffairsState> emit) async {
    final prefs = await SharedPreferences.getInstance();
    final today = DateTime.now();
    final todayKey = _dateKey(today);
    final lastKey = prefs.getString(_kLastQuizDate) ?? '';

    if (lastKey == todayKey) {
      // Already done today
      emit(state.copyWith(
        status: CaQuizStatus.alreadyDone,
        dateLabel: _dateLabel(today),
        questions: _questionsForDate(today),
      ));
      return;
    }

    emit(state.copyWith(
      status: CaQuizStatus.inProgress,
      questions: _questionsForDate(today),
      currentIndex: 0,
      score: 0,
      dateLabel: _dateLabel(today),
      clearSelected: true,
    ));
  }

  Future<void> _onAnswer(
      AnswerQuestion event, Emitter<CurrentAffairsState> emit) async {
    final q = state.currentQuestion;
    if (q == null || state.status == CaQuizStatus.answered) return;

    final correct = event.selectedIndex == q.correctIndex;
    emit(state.copyWith(
      status: CaQuizStatus.answered,
      selectedIndex: event.selectedIndex,
      score: correct ? state.score + 1 : state.score,
    ));
  }

  Future<void> _onNext(
      NextQuestion event, Emitter<CurrentAffairsState> emit) async {
    final nextIndex = state.currentIndex + 1;

    if (nextIndex >= state.questions.length) {
      // Quiz done — save today's date
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_kLastQuizDate, _dateKey(DateTime.now()));
      emit(state.copyWith(
        status: CaQuizStatus.completed,
        currentIndex: nextIndex,
        clearSelected: true,
      ));
    } else {
      emit(state.copyWith(
        status: CaQuizStatus.inProgress,
        currentIndex: nextIndex,
        clearSelected: true,
      ));
    }
  }
}
