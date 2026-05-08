const supabase = require('../config/supabase');
const { evaluateTest } = require('../services/aiService');
const { asyncHandler } = require('../middleware/asyncHandler');

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

  const questions = await evaluateTest('INTERVIEW_PREP', piq);
  res.json({ success: true, questions });
});

module.exports = {
  saveOirResult,
  getOirHistory,
  saveStoryTest,
  saveResponseTest,
  savePiq,
  getPiq,
  getInterviewQuestions
};
