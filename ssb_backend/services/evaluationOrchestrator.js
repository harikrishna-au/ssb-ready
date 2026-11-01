const { db } = require('../config/db');
const { getOirSetScore } = require('./contentBank');
const { evaluateWat, evaluateSrt, evaluateSdt, generateInterviewReply } = require('./aiService');

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
        promptVersion: evaluation.meta?.promptVersion || null,
        model: evaluation.meta?.model || null,
        completedAt: new Date()
      });
      const leaderboard = await fetchLeaderboard('wat_results', (doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          score: Number(data.score || 0),
          storyPreview: data.userId === userId ? responsesPreview(data.responses || {}) : '',
          feedbackSummary: data.userId === userId ? String(data.aiFeedback || '').slice(0, 180) : ''
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

    case 'SDT': {
      const responses = payload.responses;
      if (!responses || typeof responses !== 'object' || Array.isArray(responses)) {
        const err = new Error('payload.responses must be a non-array object');
        err.statusCode = 400;
        throw err;
      }
      const { analysis, consistencyScore, meta } = await evaluateSdt(responses);
      return {
        testType: 'SDT',
        analysis,
        consistencyScore,
        meta,
        feedbackMarkdown: analysis,
        score: null,
        leaderboard: null,
        persistedId: null
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
        promptVersion: evaluation.meta?.promptVersion || null,
        model: evaluation.meta?.model || null,
        completedAt: new Date()
      });
      const leaderboard = await fetchLeaderboard('srt_results', (doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          score: Number(data.score || 0),
          storyPreview: data.userId === userId ? responsesPreview(data.responses || {}) : '',
          feedbackSummary: data.userId === userId ? String(data.aiFeedback || '').slice(0, 180) : ''
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
      // The score is computed here from answers the server checked. Any client-sent score is ignored.
      let score;
      let totalQuestions;
      let verified = false;
      let ranked = false;
      if (payload.setId) {
        // `total` is the size the server fixed at issue time; ranked only for full-size sets.
        ({ score, total: totalQuestions, ranked } = await getOirSetScore({ userId, setId: String(payload.setId) }));
        verified = true;
      } else if (process.env.OIR_REJECT_UNVERIFIED === 'true') {
        const err = new Error('Please update the app to submit OIR results.');
        err.statusCode = 400;
        throw err;
      } else {
        // Older mobile builds: no served set exists. Keep their own history working, bounded and flagged unverified;
        // these never reach the leaderboard.
        totalQuestions = Math.max(0, Math.min(200, Math.trunc(Number(payload.totalQuestions)) || 0));
        score = Math.max(0, Math.min(totalQuestions, Math.trunc(Number(payload.score)) || 0));
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
      const doc = {
        userId,
        score,
        totalQuestions,
        percentageScore: pct,
        verified,
        ranked,
        aiFeedback: feedbackMarkdown,
        completedAt: new Date()
      };
      let ref;
      if (verified) {
        // One result per served set: the set id is the document id, so a second submit is refused.
        ref = db.collection('oir_results').doc(String(payload.setId));
        try {
          await ref.create({ ...doc, setId: String(payload.setId) });
        } catch (e) {
          if (e.code === 6 || /already exists/i.test(e.message || '')) {
            const err = new Error('This OIR set was already submitted.');
            err.statusCode = 409;
            throw err;
          }
          throw e;
        }
      } else {
        ref = await db.collection('oir_results').add(doc);
      }
      // Filtered in the query, so unranked rows (quick, legacy, partial) can never crowd out ranked ones.
      const snap = await db.collection('oir_results').where('ranked', '==', true).orderBy('percentageScore', 'desc').limit(10).get();
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
