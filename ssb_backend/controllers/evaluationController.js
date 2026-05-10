const { asyncHandler } = require('../middleware/asyncHandler');
const {
  evaluatePpdt,
  evaluateWat,
  evaluateSrt,
  evaluateTat,
  generateInterviewReply
} = require('../services/aiService');

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

const evaluatePpdtHandler = asyncHandler(async (req, res) => {
  const { story } = req.body;
  if (!story || typeof story !== 'string') throw badRequest('story is required');
  const result = await evaluatePpdt(story);
  res.json(result);
});

const evaluateWatHandler = asyncHandler(async (req, res) => {
  const { responses } = req.body;
  if (!responses || typeof responses !== 'object') throw badRequest('responses must be an object');
  const result = await evaluateWat(responses);
  res.json(result);
});

const evaluateSrtHandler = asyncHandler(async (req, res) => {
  const { responses } = req.body;
  if (!responses || typeof responses !== 'object') throw badRequest('responses must be an object');
  const result = await evaluateSrt(responses);
  res.json(result);
});

const evaluateTatHandler = asyncHandler(async (req, res) => {
  const { imageDescription, story } = req.body;
  if (!story || typeof story !== 'string') throw badRequest('story is required');
  if (!imageDescription || typeof imageDescription !== 'string') {
    throw badRequest('imageDescription is required');
  }
  const result = await evaluateTat(imageDescription, story);
  res.json(result);
});

const interviewReplyHandler = asyncHandler(async (req, res) => {
  const { piq, chatHistory } = req.body;
  if (!piq || typeof piq !== 'object') throw badRequest('piq is required');
  if (!Array.isArray(chatHistory)) throw badRequest('chatHistory must be an array');

  const reply = await generateInterviewReply(piq, chatHistory);
  res.json({ reply });
});

module.exports = {
  evaluatePpdtHandler,
  evaluateWatHandler,
  evaluateSrtHandler,
  evaluateTatHandler,
  interviewReplyHandler
};
