const story = require('./story.v2');
/** Current prompt for each round. Evaluations store `def.version` so old and new scores can be told apart. */
module.exports = {
  wat: require('./wat.v2'),
  srt: require('./srt.v2'),
  sdt: require('./sdt.v2'),
  ppdt: story.ppdt,
  tat: story.tat,
  lecturette: require('./lecturette.v1'),
  interviewReport: require('./interviewReport.v1')
};
