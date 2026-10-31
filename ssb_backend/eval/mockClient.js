/**
 * A deterministic stand-in for the OpenAI client, used by `npm run eval` (mock mode) and unit tests.
 * It scores with simple keyword heuristics. It proves the pipeline (prompt build, schema, sanitizer, report, drift
 * check) works end to end. It says NOTHING about how the real model scores.
 */
const POS = /\b(help|helps|helped|lead|leads|leader|plan|plans|team|together|courage|calm|calmly|responsib\w*|learn|train|inform\w*|rescue\w*|organis\w*|inspect\w*|volunteer\w*|discipline|honest|duty|share\w*|listen\w*|improve\w*|protect\w*|first aid|medic\w*|repair\w*|report\w*|safely|safe|thank\w*|fact|facts|example|conclusion|conclude|first|second|third|india|armed forces)\b/gi;
const NEG = /\b(revenge|kill|hate|hurt|run away|runs away|ran away|give up|gives up|useless|failure|helpless|cry|cried|panic\w*|corrupt\w*|nobody|never|cheat\w*|beat\w*|drowned|worship\w*|perfect|flawless|lazy|umm|leaves? the place|keeps? quiet|ignores?)\b/gi;
const INJECT = /ignore (all |your |the )?(previous )?(instructions|rubric)|score (of )?10|rate this 10|10\/10|output (score )?10|perfect score/i;

const count = (re, s) => (s.match(re) || []).length;

function heuristic(text) {
  const t = String(text || '');
  if (INJECT.test(t)) return 1;
  const words = t.trim() ? t.trim().split(/\s+/).length : 0;
  if (words < 4) return 1;
  let s = 3 + Math.min(4, count(POS, t) * 0.7) - Math.min(5, count(NEG, t) * 1.2);
  if (words >= 40) s += 1;
  if (words >= 70) s += 0.5;
  if (words < 15) s -= 1;
  return Math.max(0, Math.min(10, Math.round(s)));
}

const between = (text, start, end) => {
  const a = text.indexOf(start);
  if (a < 0) return '';
  const b = end ? text.indexOf(end, a + start.length) : -1;
  return text.slice(a + start.length, b < 0 ? undefined : b);
};

function respond(prompt) {
  const first = prompt.slice(0, 60);
  if (first.startsWith('Evaluate a Word Association')) {
    const responses = JSON.parse(between(prompt, '(key = stimulus word, value = the candidate\'s sentence):\n', '\n\nScoring guide').trim());
    const entries = Object.entries(responses);
    const per = entries.map(([w, v]) => [w, heuristic(v), v]);
    const blanks = per.filter(([, , v]) => !String(v).trim()).length;
    const mean = per.reduce((a, [, sc]) => a + sc, 0) / Math.max(1, per.length);
    const score = Math.round(Math.max(0, mean - (blanks / Math.max(1, per.length)) * 4));
    return { identified_olqs: score >= 6 ? ['Sense of responsibility', 'Initiative'] : [], feedback: `Mock WAT feedback. Mean ${mean.toFixed(1)}.`, score, per_word_notes: per.map(([word, sc]) => ({ word, note: 'mock', sentiment: sc >= 6 ? 'positive' : sc <= 2 ? 'concern' : 'neutral' })) };
  }
  if (first.startsWith('Evaluate a Situation Reaction')) {
    const items = JSON.parse(between(prompt, 'unanswered):\n', '\n\nScoring guide').trim());
    const sc = items.map((i) => heuristic(i.reaction));
    const score = Math.round(sc.reduce((a, b) => a + b, 0) / Math.max(1, sc.length));
    return { identified_olqs: score >= 6 ? ['Initiative', 'Sense of responsibility'] : [], feedback: 'Mock SRT feedback.', score, per_situation_notes: items.map((i, k) => ({ index: i.index, situation_preview: i.situation, note: 'mock', sentiment: sc[k] >= 6 ? 'positive' : 'neutral' })) };
  }
  if (first.startsWith('Evaluate a Self Description')) {
    const body = prompt.split('\n\n').filter((p) => /^(PARENTS|TEACHERS|FRIENDS|SUBORDINATES|SELF):/.test(p));
    const texts = body.map((b) => b.replace(/^\w+:\s*/, ''));
    const joined = texts.join(' ');
    let s = Math.round(texts.reduce((a, t) => a + heuristic(t), 0) / Math.max(1, texts.length));
    const blank = texts.filter((t) => t === '(No response)').length;
    s -= blank * 2;
    if (/\bno weakness|perfect\b/i.test(joined)) s = Math.min(s, 3);
    if (/\blazy and never\b|\bnever speak\b|\bloud and dominate\b/i.test(joined)) s = Math.min(s, 3);
    if (/weakness|improve|work on|overthink|impatien|stubborn|careless|lazy about/i.test(joined)) s += 1;
    return { consistencyScore: Math.max(0, Math.min(10, s)), identified_olqs: [], analysis: '1. Overall consistency\nmock' };
  }
  if (/^Assess a (PPDT|TAT) story/.test(first)) {
    const story = between(prompt, '<candidate_story>\n', '\n</candidate_story>');
    const s = heuristic(story);
    const sec = Object.fromEntries(['themeQuality', 'heroActionQuality', 'olqPresenceQuality', 'narrativeClarityQuality', 'stressHandlingQuality', 'emotionalMaturityQuality', 'interpersonalOutlookQuality', 'narrativeCoherenceQuality', 'futureOrientationQuality'].map((k) => [k, s]));
    return { ...sec, score: s, alignmentQuality: s, alignmentMatched: [], alignmentMissed: [], alignmentNotes: 'mock', identified_olqs: s >= 6 ? ['Initiative'] : [], strengths: [], improvementTips: [], detailedFeedback: 'mock', comparativeInsights: 'mock' };
  }
  if (first.startsWith('Evaluate a Lecturette')) {
    const transcript = between(prompt, '<transcript>\n', '\n</transcript>');
    const s = heuristic(transcript);
    return { score: s, structure: s, content: s, delivery: s, identified_olqs: [], feedback: 'mock', strengths: [], improvementTips: [] };
  }
  throw new Error('mock client: unrecognised prompt');
}

function createMockClient(model = 'mock-heuristic-1') {
  return {
    chat: {
      completions: {
        create: async ({ messages }) => {
          const u = messages.find((m) => m.role === 'user').content;
          const prompt = typeof u === 'string' ? u : u.find((p) => p.type === 'text').text;
          return { model, choices: [{ message: { content: JSON.stringify(respond(prompt)) } }] };
        }
      }
    }
  };
}

module.exports = { createMockClient, heuristic };
