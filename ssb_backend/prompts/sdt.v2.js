const c = require('./common');

module.exports = {
  id: 'sdt',
  version: 'sdt.v2',
  schemaName: 'sdt_evaluation',
  schema: c.obj({ consistencyScore: c.int(), identified_olqs: c.list(), analysis: c.str() }),
  build: ({ responses }) => `Evaluate a Self Description Test (SDT). Rubric: docs/rubrics.md, section SDT.
The candidate wrote how five groups see them (parents, teachers, friends, subordinates, self).

${Object.entries(responses).map(([k, v]) => `${k.toUpperCase()}: ${String(v).trim() || '(No response)'}`).join('\n\n')}

consistencyScore (0-10) = how coherent, honest and balanced the five accounts are as one person:
- 8-10: one recognisable person from every angle, a real weakness admitted with a remedy, qualities backed by examples.
- 5-7: broadly consistent but generic, or only praise, or thin examples.
- 3-4: contradictions between groups, or over-glorification, or several empty paragraphs.
- 0-2: mostly empty, or accounts that cannot all be true.
identified_olqs must come from: ${c.OLQS.join(', ')}.
analysis is markdown with these headings: 1. Overall consistency, 2. OLQ indicators, 3. Self-awareness, 4. Red flags, 5. Improvement tips (2 to 3 specific ones).`,
  sanitize(json) {
    return { consistencyScore: c.clampScore(json.consistencyScore), identified_olqs: c.olqs(json.identified_olqs), analysis: c.text(json.analysis, 6000) };
  }
};
