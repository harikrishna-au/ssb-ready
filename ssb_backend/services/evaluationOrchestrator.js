const { db } = require('../config/firebase');
const { evaluateWat, evaluateSrt, generateInterviewReply } = require('./aiService');

/**
 * Markdown aligned with app `WatEvaluationModel` / `SrtEvaluationModel` `toMarkdown()`.
 */
function watSrtToMarkdown(evaluation, label) {
  const olqs = Array.isArray(evaluation.identified_olqs) ? evaluation.identified_olqs : [];
  const olqLines = olqs.length ? olqs.map((o) => `- ${o}`).join('\n') : '- None clearly identified.';
  return `### AI Assessment (${label})
**Score:** ${evaluation.score}/10

#### Demonstrated OLQs
${olqLines}

#### Feedback
${evaluation.feedback || ''}`;
}

function responsesPreview(responses) {
  const entries = Object.entries(responses || {});
  if (entries.length === 0) return '';
  return entries
    .map(([k, v]) => `"${k}": ${v}`)
    .join(' | ')
    .slice(0, 160);
}

async function fetchLeaderboard(collection, mapRow) {
  const snap = await db.collection(collection).orderBy('score', 'desc').limit(10).get();
  return snap.docs.map((doc) => mapRow(doc));
}

/**
 * @param {string} userId
 * @param {string} testType  WAT | SRT | OIR | INTERVIEW_REPLY
 * @param {object} payload
 */
async function runEvaluationPipeline(userId, testType, payload) {
  switch (testType) {
    case 'WAT': {
      const responses = payload.responses;
      if (!responses || typeof responses !== 'object' || Array.isArray(responses)) {
        const err = new Error('payload.responses must be a non-array object');
        err.statusCode = 400;
        throw err;
      }
      const evaluation = await evaluateWat(responses);
      const feedbackMarkdown = watSrtToMarkdown(evaluation, 'WAT');
      const ref = await db.collection('wat_results').add({
        userId,
        responses,
        aiFeedback: feedbackMarkdown,
        score: evaluation.score,
        evaluation,
        completedAt: new Date()
      });
      const leaderboard = await fetchLeaderboard('wat_results', (doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          score: Number(data.score || 0),
          storyPreview: responsesPreview(data.responses || {}),
          feedbackSummary: String(data.aiFeedback || '').slice(0, 180)
        };
      });
      return {
        testType: 'WAT',
        evaluation,
        feedbackMarkdown,
        score: evaluation.score,
        leaderboard,
        persistedId: ref.id
      };
    }

    case 'SRT': {
      const responses = payload.responses;
      if (!responses || typeof responses !== 'object' || Array.isArray(responses)) {
        const err = new Error('payload.responses must be a non-array object');
        err.statusCode = 400;
        throw err;
      }
      const evaluation = await evaluateSrt(responses);
      const feedbackMarkdown = watSrtToMarkdown(evaluation, 'SRT');
      const ref = await db.collection('srt_results').add({
        userId,
        responses,
        aiFeedback: feedbackMarkdown,
        score: evaluation.score,
        evaluation,
        completedAt: new Date()
      });
      const leaderboard = await fetchLeaderboard('srt_results', (doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          score: Number(data.score || 0),
          storyPreview: responsesPreview(data.responses || {}),
          feedbackSummary: String(data.aiFeedback || '').slice(0, 180)
        };
      });
      return {
        testType: 'SRT',
        evaluation,
        feedbackMarkdown,
        score: evaluation.score,
        leaderboard,
        persistedId: ref.id
      };
    }

    case 'OIR': {
      const score = Number(payload.score);
      const totalQuestions = Number(payload.totalQuestions);
      if (!Number.isFinite(score) || !Number.isFinite(totalQuestions)) {
        const err = new Error('payload.score and payload.totalQuestions must be numbers');
        err.statusCode = 400;
        throw err;
      }
      const pct = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
      const feedbackMarkdown = `## OIR Result
**Score:** ${score} / ${totalQuestions} (${pct}%)

${
  pct >= 80
    ? 'Strong performance. Sustain this level with mixed timed drills.'
    : pct >= 60
      ? 'Solid base. Target weak areas with section-wise practice.'
      : 'Build accuracy first, then speed. Review verbal and non-verbal fundamentals.'
}`;
      const ref = await db.collection('oir_results').add({
        userId,
        score,
        totalQuestions,
        percentageScore: pct,
        aiFeedback: feedbackMarkdown,
        completedAt: new Date()
      });
      const snap = await db.collection('oir_results').orderBy('percentageScore', 'desc').limit(10).get();
      const leaderboard = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          score: Number(data.percentageScore ?? 0),
          storyPreview: `OIR ${data.score ?? 0}/${data.totalQuestions ?? 0}`.slice(0, 160),
          feedbackSummary: String(data.aiFeedback || '').slice(0, 180)
        };
      });
      return {
        testType: 'OIR',
        evaluation: {
          score,
          totalQuestions,
          percentage: pct
        },
        feedbackMarkdown,
        score: pct,
        leaderboard,
        persistedId: ref.id
      };
    }

    case 'INTERVIEW_REPLY': {
      const { piq, chatHistory } = payload;
      if (!piq || typeof piq !== 'object') {
        const err = new Error('payload.piq is required');
        err.statusCode = 400;
        throw err;
      }
      if (!Array.isArray(chatHistory)) {
        const err = new Error('payload.chatHistory must be an array');
        err.statusCode = 400;
        throw err;
      }
      const reply = await generateInterviewReply(piq, chatHistory);
      return {
        testType: 'INTERVIEW_REPLY',
        reply,
        feedbackMarkdown: null,
        score: null,
        leaderboard: null,
        persistedId: null
      };
    }

    default: {
      const err = new Error(`Unsupported testType: ${testType}`);
      err.statusCode = 400;
      throw err;
    }
  }
}

module.exports = { runEvaluationPipeline };
