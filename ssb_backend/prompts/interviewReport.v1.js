const c = require('./common');

module.exports = {
  id: 'interviewReport',
  version: 'interviewReport.v1',
  schemaName: 'interview_report',
  schema: c.obj({
    score: c.int(), identified_olqs: c.list(), summary: c.str(), strengths: c.list(), weaknesses: c.list(),
    piqConsistencyScore: c.int(), piqConsistencyNotes: c.list(), drills: c.list()
  }),
  build: ({ piq, transcript }) => `Write the end-of-interview report for a mock SSB personal interview. Rubric: docs/rubrics.md, section Interview.

Candidate PIQ:
${JSON.stringify(piq)}

Interview transcript (IO = interviewer, CANDIDATE = answers):
<transcript>
${transcript.map((t) => `${t.role === 'io' ? 'IO' : 'CANDIDATE'}: ${t.text}`).join('\n')}
</transcript>

score (0-10) is the overall impression: honesty, clarity, specific examples, composure under follow-ups.
- 8-10: specific, consistent, owns weaknesses, answers follow-ups directly.
- 5-7: sensible but general, or some hedging.
- 0-4: evasive, contradictory, very short answers, or mostly unanswered.
piqConsistencyScore (0-10): do the answers agree with the PIQ (education, family, hobbies, plans)? List each mismatch or unsupported claim in piqConsistencyNotes (say "none found" if clean).
strengths and weaknesses: max 4 each, each tied to something the candidate actually said.
drills: exactly 3 concrete practice drills for the next week (one sentence each).
identified_olqs must come from: ${c.OLQS.join(', ')}.
summary: 3-5 sentences. Do not invent answers that are not in the transcript.`,
  sanitize(json) {
    return {
      score: c.clampScore(json.score), identified_olqs: c.olqs(json.identified_olqs), summary: c.text(json.summary, 1500),
      strengths: c.strings(json.strengths, 4, 300), weaknesses: c.strings(json.weaknesses, 4, 300),
      piqConsistencyScore: c.clampScore(json.piqConsistencyScore), piqConsistencyNotes: c.strings(json.piqConsistencyNotes, 6, 300),
      drills: c.strings(json.drills, 3, 300)
    };
  }
};
