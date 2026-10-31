const c = require('./common');

module.exports = {
  id: 'lecturette',
  version: 'lecturette.v1',
  schemaName: 'lecturette_evaluation',
  schema: c.obj({
    score: c.int(), structure: c.int(), content: c.int(), delivery: c.int(),
    identified_olqs: c.list(), feedback: c.str(), strengths: c.list(), improvementTips: c.list()
  }),
  build: ({ topic, transcript, seconds, words }) => `Evaluate a Lecturette (3-minute talk to a GTO group). Rubric: docs/rubrics.md, section Lecturette.
Topic: ${topic}
Speaking time used: ${seconds} seconds. Words spoken: ${words} (a steady pace is about 100 to 150 words per minute).
The text below is an automatic speech transcript, so ignore small recognition errors and missing punctuation.

<transcript>
${transcript}
</transcript>

Score each 0-10:
- structure: opening that frames the topic, two or three distinct points, a conclusion.
- content: relevant facts and examples, depth, links to India or the armed forces where they fit, balanced view.
- delivery: only what a transcript can show (pace, fillers like "umm", repetition, trailing off, using the time). Do not guess at voice or eye contact.
"score" is the overall 0-10 (about 40% content, 35% structure, 25% delivery).
- 8-10: clear structure, specific facts, uses most of the time, few fillers.
- 5-7: understandable but generic, loose structure, or too short.
- 0-2: off topic or almost nothing said.
identified_olqs must come from: ${c.OLQS.join(', ')}.
feedback is 3-5 sentences. strengths and improvementTips are short lists (max 4 each).`,
  sanitize(json) {
    return {
      score: c.clampScore(json.score), structure: c.clampScore(json.structure), content: c.clampScore(json.content), delivery: c.clampScore(json.delivery),
      identified_olqs: c.olqs(json.identified_olqs), feedback: c.text(json.feedback, 1500),
      strengths: c.strings(json.strengths, 4), improvementTips: c.strings(json.improvementTips, 4)
    };
  }
};
