const supabase = require('../config/supabase');
const { evaluateTest } = require('../services/aiService');
const { asyncHandler } = require('../middleware/asyncHandler');

const CIQ_QUESTION_BANK = [
  { section: 'CIQ 1', question: 'Describe your academic performance from class 10 to graduation.' },
  { section: 'CIQ 1', question: 'Share your scores by class/semester and trends over time.' },
  { section: 'CIQ 1', question: 'What are your key academic achievements?' },
  { section: 'CIQ 1', question: 'Which teachers did you like most, and why?' },
  { section: 'CIQ 1', question: 'Which teachers did you struggle with, and why?' },
  { section: 'CIQ 1', question: 'Which subjects did you enjoy most, and why?' },
  { section: 'CIQ 1', question: 'Which subjects were difficult for you, and what did you do to improve?' },
  { section: 'CIQ 1', question: 'Who are your close friends, and what do you value in them?' },
  { section: 'CIQ 1', question: 'Tell one good and one bad quality of a close friend.' },
  { section: 'CIQ 1', question: 'What quality from your friends would you like to learn?' },
  { section: 'CIQ 1', question: 'Which games/sports have you played regularly?' },
  { section: 'CIQ 1', question: 'Which extracurricular activities did you participate in?' },
  { section: 'CIQ 1', question: 'What achievements do you have in sports/activities?' },
  { section: 'CIQ 2', question: 'Tell me about your family members and their occupations.' },
  { section: 'CIQ 2', question: 'Do you stay with family? If not, how often do you visit?' },
  { section: 'CIQ 2', question: 'How do you spend quality time with your family?' },
  { section: 'CIQ 2', question: 'Whom are you closer to at home and why?' },
  { section: 'CIQ 2', question: 'Whom do you approach when you face a problem?' },
  { section: 'CIQ 2', question: 'How do you support your parents at home?' },
  { section: 'CIQ 2', question: 'How do you manage your monthly money and savings?' },
  { section: 'CIQ 2', question: 'How are your relations with neighbors and community?' },
  { section: 'CIQ 3', question: 'Describe your weekday routine.' },
  { section: 'CIQ 3', question: 'Describe your weekend routine.' },
  { section: 'CIQ 3', question: 'How do you utilize spare time productively?' },
  { section: 'CIQ 3', question: 'What are your hobbies and why did you choose them?' },
  { section: 'CIQ 3', question: 'What are your key interests outside academics?' },
  { section: 'CIQ 3', question: 'How do you contribute to family/society during festivals/events?' },
  { section: 'CIQ 3', question: 'Why did you not choose your hobby as a career?' },
  { section: 'CIQ 3', question: 'If you had more free time, what would you do?' },
  { section: 'CIQ 4', question: 'Which sport do you play, and at what level?' },
  { section: 'CIQ 4', question: 'What are your major achievements in that sport?' },
  { section: 'CIQ 4', question: 'Explain key rules/regulations of your sport.' },
  { section: 'CIQ 4', question: 'Mention recent major news related to your sport.' },
  { section: 'CIQ 4', question: 'Who is/was Indian team captain in your sport, and which recent tournament was played?' },
  { section: 'CIQ 4', question: 'Name notable Indian personalities in your sport/activity.' },
  { section: 'CIQ 4', question: 'What did sports teach you about leadership and team spirit?' },
  { section: 'CIQ 4', question: 'What major national/international headlines are relevant today?' },
  { section: 'CIQ 4', question: 'Discuss India’s geopolitical relations with key countries.' },
  { section: 'CIQ 4', question: 'Share key points from today’s newspaper.' },
  { section: 'CIQ 4', question: 'How is physical geography relevant to defence preparedness?' },
  { section: 'CIQ 6', question: 'Mention recent major defence developments in India.' },
  { section: 'CIQ 6', question: 'Explain basic rank structure and important equipment of your preferred service.' },
  { section: 'CIQ 6', question: 'Difference between key arms/services in the force.' },
  { section: 'CIQ 6', question: 'Which arm/service would you like to join, and why?' },
  { section: 'CIQ 6', question: 'Where is training conducted and what is the duration for your entry?' },
  { section: 'CIQ 6', question: 'Why do you want to join the defence services?' },
  { section: 'CIQ 6', question: 'If not recommended this time, what is your action plan?' },
  { section: 'CIQ 6', question: 'What are your alternate career options and why?' },
  { section: 'Self Assessment', question: 'What are your top strengths with real examples?' },
  { section: 'Self Assessment', question: 'What are your weaknesses and what improvement steps have you taken?' }
];

const ONLINE_EXCLUSION_PATTERNS = [
  /rate your performance in psychological/i,
  /rate your performance in gto/i,
  /which test did you like in psychological/i,
  /which test did you like in gto/i,
  /performed better psych or gto/i,
  /previous attempts/i
];

function getInterviewQuestionBank({ onlineOnly = true, limit = 50 } = {}) {
  const filtered = onlineOnly
    ? CIQ_QUESTION_BANK.filter(
        (item) => !ONLINE_EXCLUSION_PATTERNS.some((rx) => rx.test(item.question))
      )
    : CIQ_QUESTION_BANK;
  return filtered.slice(0, Math.max(1, Math.min(Number(limit) || 50, 200)));
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

// --- OIR Endpoints ---
const saveOirResult = asyncHandler(async (req, res) => {
  const { score, totalQuestions } = req.body;
  if (!Number.isFinite(score) || !Number.isFinite(totalQuestions) || totalQuestions <= 0) {
    throw badRequest('score and totalQuestions must be valid numbers');
  }

  const { data, error } = await supabase
    .from('oir_results')
    .insert([{ user_id: req.user.id, score, total_questions: totalQuestions }]);

  if (error) throw badRequest(error.message || 'Failed to save OIR result');
  res.status(201).json({ success: true, data });
});

const getOirHistory = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('oir_results')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) throw badRequest(error.message || 'Failed to fetch OIR history');
  res.json({ success: true, data });
});

// --- PPDT & TAT Endpoints ---
const saveStoryTest = asyncHandler(async (req, res) => {
  const { testType, userStory, imageDescription } = req.body;
  if (!['PPDT', 'TAT'].includes(testType)) throw badRequest('testType must be PPDT or TAT');
  if (!userStory || typeof userStory !== 'string') throw badRequest('userStory is required');

  const aiFeedback = await evaluateTest(testType, userStory, imageDescription);
  const table = testType === 'PPDT' ? 'ppdt_results' : 'tat_results';

  const { data, error } = await supabase
    .from(table)
    .insert([{
      user_id: req.user.id,
      user_story: userStory,
      ai_feedback: aiFeedback,
      image_description: imageDescription || null
    }]);

  if (error) throw badRequest(error.message || 'Failed to save story test');
  res.status(201).json({ success: true, data, aiFeedback });
});

// --- WAT & SRT Endpoints ---
const saveResponseTest = asyncHandler(async (req, res) => {
  const { testType, responses } = req.body;
  if (!['WAT', 'SRT'].includes(testType)) throw badRequest('testType must be WAT or SRT');
  if (!responses) throw badRequest('responses are required');

  const aiFeedback = await evaluateTest(testType, responses);
  const table = testType === 'WAT' ? 'wat_results' : 'srt_results';

  const { data, error } = await supabase
    .from(table)
    .insert([{
      user_id: req.user.id,
      responses,
      ai_feedback: aiFeedback
    }]);

  if (error) throw badRequest(error.message || 'Failed to save response test');
  res.status(201).json({ success: true, data, aiFeedback });
});

// --- PIQ Endpoints ---
const savePiq = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('piqs')
    .upsert({ ...req.body, user_id: req.user.id });

  if (error) throw badRequest(error.message || 'Failed to save PIQ');
  res.json({ success: true, data });
});

const getPiq = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('piqs')
    .select('*')
    .eq('user_id', req.user.id)
    .single();

  if (error && error.code !== 'PGRST116') throw badRequest(error.message || 'Failed to fetch PIQ');
  res.json({ success: true, data: data || {} });
});

// --- Interview Endpoints ---
const getInterviewQuestions = asyncHandler(async (req, res) => {
  const { data: piq } = await supabase.from('piqs').select('*').eq('user_id', req.user.id).single();

  if (!piq) throw badRequest('Fill PIQ first');

  const aiQuestions = await evaluateTest('INTERVIEW_PREP', piq);
  const onlineOnly = req.query.onlineOnly !== 'false';
  const questionBank = getInterviewQuestionBank({
    onlineOnly,
    limit: Number(req.query.limit || 50)
  });
  res.json({
    success: true,
    questions: aiQuestions,
    aiQuestions,
    questionBank,
    source: 'ciq_curated_online_practice'
  });
});

const getInterviewQuestionBankHandler = asyncHandler(async (req, res) => {
  const onlineOnly = req.query.onlineOnly !== 'false';
  const limit = Number(req.query.limit || 50);
  const questionBank = getInterviewQuestionBank({ onlineOnly, limit });
  res.json({
    success: true,
    questionBank,
    source: 'ciq_curated_online_practice'
  });
});

module.exports = {
  saveOirResult,
  getOirHistory,
  saveStoryTest,
  saveResponseTest,
  savePiq,
  getPiq,
  getInterviewQuestions,
  getInterviewQuestionBankHandler
};
