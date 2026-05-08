import 'package:ssb_ready_app/data/models/oir_result_model.dart';
import 'package:ssb_ready_app/data/models/ppdt_result_model.dart';
import 'package:ssb_ready_app/data/models/wat_result_model.dart';
import 'package:ssb_ready_app/data/models/srt_result_model.dart';
import 'package:ssb_ready_app/data/models/tat_result_model.dart';
import 'package:ssb_ready_app/data/models/piq_model.dart';

abstract class TestHistoryRepository {
  Future<void> saveOirResult(OirResultModel result);
  Future<void> savePpdtResult(PpdtResultModel result);
  Future<void> saveWatResult(WatResultModel result);
  Future<void> saveSrtResult(SrtResultModel result);
  Future<void> saveTatResult(TatResultModel result);
  
  Future<List<OirResultModel>> getOirHistory(String userId);
  Future<List<PpdtResultModel>> getPpdtHistory(String userId);
  Future<List<WatResultModel>> getWatHistory(String userId);
  Future<List<SrtResultModel>> getSrtHistory(String userId);
  Future<List<TatResultModel>> getTatHistory(String userId);
  
  Future<void> savePiq(PiqModel piq);
  Future<PiqModel?> getPiq(String userId);
}

