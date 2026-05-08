import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:ssb_ready_app/data/models/oir_result_model.dart';
import 'package:ssb_ready_app/data/models/ppdt_result_model.dart';
import 'package:ssb_ready_app/data/models/wat_result_model.dart';
import 'package:ssb_ready_app/data/models/srt_result_model.dart';
import 'package:ssb_ready_app/data/models/tat_result_model.dart';
import 'package:ssb_ready_app/data/models/piq_model.dart';
import 'package:ssb_ready_app/domain/repositories/test_history_repository.dart';

class FirebaseTestHistoryService implements TestHistoryRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  @override
  Future<void> saveOirResult(OirResultModel result) async {
    await _firestore.collection('oir_results').add(result.toJson());
  }

  @override
  Future<void> savePpdtResult(PpdtResultModel result) async {
    await _firestore.collection('ppdt_results').add(result.toJson());
  }

  @override
  Future<void> saveWatResult(WatResultModel result) async {
    await _firestore.collection('wat_results').add(result.toJson());
  }

  @override
  Future<void> saveSrtResult(SrtResultModel result) async {
    await _firestore.collection('srt_results').add(result.toJson());
  }

  @override
  Future<List<OirResultModel>> getOirHistory(String userId) async {
    final snapshot = await _firestore
        .collection('oir_results')
        .where('userId', isEqualTo: userId)
        .orderBy('completedAt', descending: true)
        .get();

    return snapshot.docs.map((doc) => OirResultModel.fromJson(doc.data(), doc.id)).toList();
  }

  @override
  Future<List<PpdtResultModel>> getPpdtHistory(String userId) async {
    final snapshot = await _firestore
        .collection('ppdt_results')
        .where('userId', isEqualTo: userId)
        .orderBy('completedAt', descending: true)
        .get();

    return snapshot.docs.map((doc) => PpdtResultModel.fromJson(doc.data(), doc.id)).toList();
  }

  @override
  Future<List<WatResultModel>> getWatHistory(String userId) async {
    final snapshot = await _firestore
        .collection('wat_results')
        .where('userId', isEqualTo: userId)
        .orderBy('completedAt', descending: true)
        .get();

    return snapshot.docs.map((doc) => WatResultModel.fromJson(doc.data(), doc.id)).toList();
  }

  @override
  Future<List<SrtResultModel>> getSrtHistory(String userId) async {
    final snapshot = await _firestore
        .collection('srt_results')
        .where('userId', isEqualTo: userId)
        .orderBy('completedAt', descending: true)
        .get();

    return snapshot.docs.map((doc) => SrtResultModel.fromJson(doc.data(), doc.id)).toList();
  }

  @override
  Future<void> saveTatResult(TatResultModel result) async {
    await _firestore.collection('tat_results').add(result.toJson());
  }

  @override
  Future<List<TatResultModel>> getTatHistory(String userId) async {
    final snapshot = await _firestore
        .collection('tat_results')
        .where('userId', isEqualTo: userId)
        .orderBy('completedAt', descending: true)
        .get();

    return snapshot.docs.map((doc) => TatResultModel.fromJson(doc.data(), doc.id)).toList();
  }

  @override
  Future<void> savePiq(PiqModel piq) async {
    await _firestore.collection('piqs').doc(piq.userId).set(piq.toJson());
  }

  @override
  Future<PiqModel?> getPiq(String userId) async {
    final doc = await _firestore.collection('piqs').doc(userId).get();
    if (doc.exists && doc.data() != null) {
      return PiqModel.fromJson(doc.data()!);
    }
    return null;
  }
}
