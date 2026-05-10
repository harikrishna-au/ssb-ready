const { asyncHandler } = require('../middleware/asyncHandler');
const { db } = require('../config/firebase');
const { evaluatePpdtPipeline, ocrHandwrittenImage } = require('../services/aiService');

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

const extractWrittenPaperText = asyncHandler(async (req, res) => {
  const { imageBase64, mimeType } = req.body;
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    throw badRequest('imageBase64 is required');
  }
  const mime = typeof mimeType === 'string' && mimeType.startsWith('image/')
    ? mimeType
    : 'image/jpeg';

  const text = await ocrHandwrittenImage(imageBase64, mime);
  res.json({ success: true, text });
});

const runPpdtPipeline = asyncHandler(async (req, res) => {
  const userId = req.firebaseUser.uid;
  const { imageUrl, storyMode, storyText, handwrittenText, perception } = req.body;

  const finalStory = (storyText || handwrittenText || '').trim();
  if (!finalStory) {
    throw badRequest('Story text is required');
  }

  const boardSnapshot = await db
    .collection('ppdt_results')
    .orderBy('score', 'desc')
    .limit(10)
    .get();

  const topStories = boardSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      score: Number(data.score || 0),
      storyPreview: String(data.userStory || '').slice(0, 160),
      feedbackSummary: String(data.aiFeedback || '').slice(0, 180)
    };
  });

  const ai = await evaluatePpdtPipeline({
    storyText: finalStory,
    perception: perception || {},
    topStories
  });

  const docData = {
    userId,
    imageUrl: imageUrl || '',
    storyMode: storyMode || 'typing',
    userStory: finalStory,
    aiFeedback: ai.analysisMarkdown,
    score: Number(ai.score || 0),
    completedAt: new Date(),
    perception: perception || {}
  };

  await db.collection('ppdt_results').add(docData);

  const refreshedSnap = await db
    .collection('ppdt_results')
    .orderBy('score', 'desc')
    .limit(10)
    .get();

  let leaderboard = refreshedSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      score: Number(data.score || 0),
      storyPreview: String(data.userStory || '').slice(0, 160),
      feedbackSummary: String(data.aiFeedback || '').slice(0, 180)
    };
  });

  if (leaderboard.length === 0) {
    leaderboard = [
      {
        score: ai.score,
        storyPreview: finalStory.slice(0, 160),
        feedbackSummary: 'Your story is currently the first ranked submission.'
      }
    ];
  }

  res.json({
    success: true,
    analysisMarkdown: ai.analysisMarkdown,
    score: ai.score,
    leaderboard
  });
});

module.exports = { runPpdtPipeline, extractWrittenPaperText };
