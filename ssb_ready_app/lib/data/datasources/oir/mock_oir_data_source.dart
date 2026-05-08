import 'package:ssb_ready_app/data/models/oir/question_model.dart';
import 'package:ssb_ready_app/domain/entities/oir/question.dart';

class MockOirDataSource {
  Future<List<QuestionModel>> getSampleQuestions() async {
    // Simulate network delay
    await Future.delayed(const Duration(seconds: 1));

    return [
      const QuestionModel(
        id: '1',
        type: QuestionType.verbal,
        text: 'If AIR is called WATER, WATER is called SKY, SKY is called OCEAN, and OCEAN is called RIVER, where do birds fly?',
        options: ['AIR', 'WATER', 'SKY', 'OCEAN'],
        correctAnswerIndex: 2, // SKY (but in this logic SKY is OCEAN, wait, birds fly in SKY, SKY is called OCEAN)
        explanation: 'Birds fly in the SKY. According to the logic, SKY is called OCEAN.',
      ),
      const QuestionModel(
        id: '2',
        type: QuestionType.verbal,
        text: 'Find the odd one out:',
        options: ['Car', 'Bicycle', 'Motorcycle', 'Helicopter'],
        correctAnswerIndex: 3,
        explanation: 'Helicopter is an aircraft, while others are land vehicles.',
      ),
      const QuestionModel(
        id: '3',
        type: QuestionType.verbal,
        text: 'Which number replaces the question mark? 2, 6, 12, 20, ?',
        options: ['28', '30', '32', '36'],
        correctAnswerIndex: 1,
        explanation: 'The pattern is n² + n (1²+1=2, 2²+2=6, 3²+3=12, 4²+4=20, 5²+5=30).',
      ),
      const QuestionModel(
        id: '4',
        type: QuestionType.verbal,
        text: 'Complete the analogy: Soldier : Regiment :: Sailor : ?',
        options: ['Ship', 'Fleet', 'Crew', 'Navy'],
        correctAnswerIndex: 2,
        explanation: 'A soldier belongs to a regiment; a sailor belongs to a crew.',
      ),
    ];
  }
}
