import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();

  final firestore = FirebaseFirestore.instance;
  final collection = firestore.collection('oir_questions');

  final questions = <Map<String, dynamic>>[
    {
      'id': 'oir_1',
      'text':
          'If AIR is called WATER, WATER is called SKY, SKY is called OCEAN, and OCEAN is called RIVER, where do birds fly?',
      'options': ['AIR', 'WATER', 'SKY', 'OCEAN'],
      'correct_answer_index': 2,
      'type': 'verbal',
      'explanation':
          'Birds fly in the SKY. According to the given naming, SKY is called OCEAN.',
    },
    {
      'id': 'oir_2',
      'text': 'Find the odd one out:',
      'options': ['Car', 'Bicycle', 'Motorcycle', 'Helicopter'],
      'correct_answer_index': 3,
      'type': 'verbal',
      'explanation':
          'Helicopter is an aircraft, while others are land vehicles.',
    },
    {
      'id': 'oir_3',
      'text': 'Which number replaces the question mark? 2, 6, 12, 20, ?',
      'options': ['28', '30', '32', '36'],
      'correct_answer_index': 1,
      'type': 'verbal',
      'explanation':
          'The pattern is n^2 + n: 1^2+1=2, 2^2+2=6, 3^2+3=12, 4^2+4=20, 5^2+5=30.',
    },
    {
      'id': 'oir_4',
      'text': 'Complete the analogy: Soldier : Regiment :: Sailor : ?',
      'options': ['Ship', 'Fleet', 'Crew', 'Navy'],
      'correct_answer_index': 2,
      'type': 'verbal',
      'explanation':
          'A soldier belongs to a regiment; a sailor belongs to a crew.',
    },
  ];

  final batch = firestore.batch();
  for (final question in questions) {
    final docRef = collection.doc(question['id'] as String);
    batch.set(
        docRef,
        {
          ...question,
          'createdAt': FieldValue.serverTimestamp(),
        },
        SetOptions(merge: true));
  }

  try {
    await batch.commit();
    debugPrint('Seeded ${questions.length} OIR questions successfully.');
  } catch (e) {
    debugPrint('Failed to seed OIR questions: $e');
  }
}
