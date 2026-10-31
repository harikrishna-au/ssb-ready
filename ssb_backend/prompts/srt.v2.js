const c = require('./common');

module.exports = {
  id: 'srt',
  version: 'srt.v2',
  schemaName: 'srt_evaluation',
  schema: c.obj({
    identified_olqs: c.list(),
    feedback: c.str(),
    score: c.int(),
    per_situation_notes: c.list(c.obj({ index: c.int(), situation_preview: c.str(), note: c.str(), sentiment: c.enumOf(c.SENTIMENTS) }))
  }),
  build: ({ items }) => `Evaluate a Situation Reaction Test (SRT). Rubric: docs/rubrics.md, section SRT.

DATA (index, situation, the candidate's reaction; empty = unanswered):
${JSON.stringify(items)}

Scoring guide (0-10 for the whole set):
- 8-10: reactions are practical, lawful and proportionate; the hero takes charge, helps or informs others, and follows through; few or no blanks.
- 5-7: sensible but generic ("he will handle it"), or leadership is inconsistent, or some blanks.
- 3-4: avoidance, passing the buck, or heavy blanks.
- 0-2: aggression out of proportion, cheating, abandoning others, or mostly blank.
Empty reactions are invalid attempts: say so in the note for that index.
identified_olqs must come from: ${c.OLQS.join(', ')}.
Give exactly one per_situation_notes entry per index 0 to ${Math.max(items.length - 1, 0)}. feedback is 3-6 sentences on leadership pattern, judgement quality and consistency.`,
  sanitize(json, { items }) {
    const notes = new Map((Array.isArray(json.per_situation_notes) ? json.per_situation_notes : []).map((n) => [Number(n.index), n]));
    return {
      identified_olqs: c.olqs(json.identified_olqs),
      feedback: c.text(json.feedback, 1500),
      score: c.clampScore(json.score),
      per_situation_notes: items
        .filter((it) => notes.has(it.index))
        .map((it) => ({
          index: it.index,
          situation_preview: c.text(it.situation, 100),
          note: c.text(notes.get(it.index).note, 240),
          sentiment: c.sentiment(notes.get(it.index).sentiment)
        }))
    };
  }
};
