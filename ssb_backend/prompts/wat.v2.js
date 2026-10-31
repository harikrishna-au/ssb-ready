const c = require('./common');

module.exports = {
  id: 'wat',
  version: 'wat.v2',
  schemaName: 'wat_evaluation',
  schema: c.obj({
    identified_olqs: c.list(),
    feedback: c.str(),
    score: c.int(),
    per_word_notes: c.list(c.obj({ word: c.str(), note: c.str(), sentiment: c.enumOf(c.SENTIMENTS) }))
  }),
  build: ({ responses }) => `Evaluate a Word Association Test (WAT). Rubric: docs/rubrics.md, section WAT.

INPUT (key = stimulus word, value = the candidate's sentence):
${JSON.stringify(responses)}

Scoring guide (0-10 for the whole set):
- 8-10: nearly every sentence is positive, active, specific and shows responsibility or co-operation; no blanks.
- 5-7: mostly constructive but generic, a few neutral/defensive lines, or a few blanks.
- 3-4: many passive, vague or negative lines, or a third or more blank.
- 0-2: hostile, escapist or mostly blank.
Rules: reward spontaneity and clarity; flag violent, helpless or blame-shifting themes; credit an OLQ only with clear evidence; a blank sentence is a poor answer for that word.
identified_olqs must come from: ${c.OLQS.join(', ')}.
Give exactly one per_word_notes entry for every stimulus word in INPUT. feedback is 3-6 sentences on the overall pattern, main strengths and top risks.`,
  sanitize(json, { responses }) {
    const words = Object.keys(responses);
    const byWord = new Map((Array.isArray(json.per_word_notes) ? json.per_word_notes : []).map((n) => [String(n.word).trim(), n]));
    return {
      identified_olqs: c.olqs(json.identified_olqs),
      feedback: c.text(json.feedback, 1500),
      score: c.clampScore(json.score),
      per_word_notes: words
        .filter((w) => byWord.has(w))
        .map((w) => ({ word: w, note: c.text(byWord.get(w).note, 240), sentiment: c.sentiment(byWord.get(w).sentiment) }))
    };
  }
};
