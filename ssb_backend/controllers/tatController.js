const { asyncHandler } = require('../middleware/asyncHandler');
const { db } = require('../config/firebase');
const { evaluateTatPipeline } = require('../services/aiService');
const { resolveImage } = require('../services/storyImages');

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

const runTatPipeline = asyncHandler(async (req, res) => {
  const userId = req.firebaseUser.uid;
  const {
    imageId,
    imageUrl,
    imageDescription,
    imageIndex,
    storyMode,
    storyText,
    handwrittenText,
    perception
  } = req.body;

  const image = await resolveImage({ imageId, imageUrl });
  const desc = (imageDescription || '').trim();
  if (!image && !desc) {
    throw badRequest('imageId (or imageDescription) is required');
  }

  const finalStory = (storyText || handwrittenText || '').trim();
  if (!finalStory) {
    throw badRequest('Story text is required');
  }

  const idx = Number.isFinite(Number(imageIndex)) ? Number(imageIndex) : 0;

  const boardSnapshot = await db
    .collection('tat_results')
    .orderBy('score', 'desc')
    .limit(10)
    .get();

  const topStories = boardSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      score: Number(data.score || 0),
      // Other candidates' stories are never sent to the model: privacy, and stored prompt injection.
      storyPreview: '',
      feedbackSummary: ''
    };
  });

  const ai = await evaluateTatPipeline({
    storyText: finalStory,
    imageDescription: desc,
    imageIndex: idx,
    perception: perception || {},
    topStories,
    image
  });

  const docData = {
    userId,
    imageId: image?.id || '',
    imageUrl: image?.url || '',
    imageDescription: desc,
    imageIndex: idx,
    storyMode: storyMode || 'typing',
    userStory: finalStory,
    aiFeedback: ai.analysisMarkdown,
    identifiedOlqs: ai.olqs || [],
    score: Number(ai.score || 0),
    completedAt: new Date(),
    perception: perception || {}
  };

  await db.collection('tat_results').add(docData);

  const refreshedSnap = await db
    .collection('tat_results')
    .orderBy('score', 'desc')
    .limit(10)
    .get();

  let leaderboard = refreshedSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      score: Number(data.score || 0),
      storyPreview: data.userId === userId ? String(data.userStory || '').slice(0, 160) : '',
      feedbackSummary: data.userId === userId ? String(data.aiFeedback || '').slice(0, 180) : ''
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
    alignment: ai.alignment,
    image: image ? { id: image.id, url: image.url } : null,
    leaderboard
  });
});

module.exports = { runTatPipeline };
