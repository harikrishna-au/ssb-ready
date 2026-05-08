import 'package:ssb_ready_app/data/models/oir_result_model.dart';
import 'package:ssb_ready_app/data/models/piq_model.dart';
import 'package:ssb_ready_app/data/models/ppdt_result_model.dart';
import 'package:ssb_ready_app/data/models/srt_result_model.dart';
import 'package:ssb_ready_app/data/models/tat_result_model.dart';
import 'package:ssb_ready_app/data/models/wat_result_model.dart';
import 'package:ssb_ready_app/domain/repositories/test_history_repository.dart';

class MockTestHistoryService implements TestHistoryRepository {
  static final List<OirResultModel> _oirResults = <OirResultModel>[];
  static final List<PpdtResultModel> _ppdtResults = <PpdtResultModel>[];
  static final List<WatResultModel> _watResults = <WatResultModel>[];
  static final List<SrtResultModel> _srtResults = <SrtResultModel>[];
  static final List<TatResultModel> _tatResults = <TatResultModel>[];
  static final Map<String, PiqModel> _piqByUserId = <String, PiqModel>{};

  @override
  Future<void> saveOirResult(OirResultModel result) async {
    _oirResults.add(result);
  }

  @override
  Future<void> savePpdtResult(PpdtResultModel result) async {
    _ppdtResults.add(result);
  }

  @override
  Future<void> saveWatResult(WatResultModel result) async {
    _watResults.add(result);
  }

  @override
  Future<void> saveSrtResult(SrtResultModel result) async {
    _srtResults.add(result);
  }

  @override
  Future<void> saveTatResult(TatResultModel result) async {
    _tatResults.add(result);
  }

  @override
  Future<List<OirResultModel>> getOirHistory(String userId) async {
    return _oirResults.where((result) => result.userId == userId).toList()
      ..sort((a, b) => b.completedAt.compareTo(a.completedAt));
  }

  @override
  Future<List<PpdtResultModel>> getPpdtHistory(String userId) async {
    return _ppdtResults.where((result) => result.userId == userId).toList()
      ..sort((a, b) => b.completedAt.compareTo(a.completedAt));
  }

  @override
  Future<List<WatResultModel>> getWatHistory(String userId) async {
    return _watResults.where((result) => result.userId == userId).toList()
      ..sort((a, b) => b.completedAt.compareTo(a.completedAt));
  }

  @override
  Future<List<SrtResultModel>> getSrtHistory(String userId) async {
    return _srtResults.where((result) => result.userId == userId).toList()
      ..sort((a, b) => b.completedAt.compareTo(a.completedAt));
  }

  @override
  Future<List<TatResultModel>> getTatHistory(String userId) async {
    return _tatResults.where((result) => result.userId == userId).toList()
      ..sort((a, b) => b.completedAt.compareTo(a.completedAt));
  }

  @override
  Future<void> savePiq(PiqModel piq) async {
    _piqByUserId[piq.userId] = piq;
  }

  @override
  Future<PiqModel?> getPiq(String userId) async {
    return _piqByUserId[userId];
  }
}
