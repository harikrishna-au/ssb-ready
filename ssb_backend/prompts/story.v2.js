/** PPDT and TAT share one story rubric with different section names. */
const c = require('./common');

const ALIGNMENT_RULES = `Fit with the picture:
- Credit any reasonable reading of a hazy picture. A different but plausible theme is NOT a fault.
- Penalise only: ignoring the main characters or situation, contradicting what is clearly visible, or inventing a scene unrelated to the picture.
- "alignmentMatched": picture elements the story used. "alignmentMissed": important visible elements it ignored.`;

const common = {
  score: c.int(), alignmentQuality: c.int(), alignmentMatched: c.list(), alignmentMissed: c.list(), alignmentNotes: c.str(),
  identified_olqs: c.list(), strengths: c.list(), improvementTips: c.list(), detailedFeedback: c.str(), comparativeInsights: c.str()
};

function make({ id, label, sections }) {
  return {
    id,
    version: `${id}.v2`,
    schemaName: `${id}_evaluation`,
    sections,
    schema: c.obj({ ...Object.fromEntries(sections.map(([k]) => [k, c.int()])), ...common }),
    build: ({ storyText, perception, topStories, pictureBlock, extra = '' }) => `Assess a ${label} story. Rubric: docs/rubrics.md, section ${label}.
Score theme, hero action, OLQs, clarity and stress handling, AND fit with the picture.

${pictureBlock}
${extra}
${ALIGNMENT_RULES}

Scoring guide for "score" (0-10):
- 8-10: a clear hero who acts early and sensibly, a realistic problem, a positive and believable ending, OLQs shown through action; reads as the picture.
- 5-7: complete but generic, passive hero, or weak ending.
- 3-4: no clear problem or action, negative ending, or ignores the picture.
- 0-2: off-task, hostile, or too short to judge.
Section scores use the same 0-10 scale. identified_olqs must come from: ${c.OLQS.join(', ')}.

Candidate perception notes (before writing):
<candidate_perception>${JSON.stringify(perception || {})}</candidate_perception>

Candidate story:
<candidate_story>
${storyText}
</candidate_story>

Benchmark stories for relative comparison only (do not copy):
${JSON.stringify(topStories || [])}`,
    sanitize(json) {
      const out = {
        score: c.clampScore(json.score),
        alignmentQuality: c.clampScore(json.alignmentQuality),
        alignmentMatched: c.strings(json.alignmentMatched),
        alignmentMissed: c.strings(json.alignmentMissed),
        alignmentNotes: c.text(json.alignmentNotes, 600),
        identified_olqs: c.olqs(json.identified_olqs),
        strengths: c.strings(json.strengths),
        improvementTips: c.strings(json.improvementTips),
        detailedFeedback: c.text(json.detailedFeedback, 3000),
        comparativeInsights: c.text(json.comparativeInsights, 1500)
      };
      for (const [k] of sections) out[k] = c.clampScore(json[k]);
      return out;
    }
  };
}

module.exports = {
  ppdt: make({
    id: 'ppdt', label: 'PPDT',
    sections: [['themeQuality', 'Theme quality'], ['heroActionQuality', 'Hero action quality'], ['olqPresenceQuality', 'OLQ presence quality'], ['narrativeClarityQuality', 'Narrative clarity quality'], ['stressHandlingQuality', 'Stress handling quality']]
  }),
  tat: make({
    id: 'tat', label: 'TAT',
    sections: [['themeQuality', 'Theme / projection quality'], ['heroActionQuality', 'Hero action & initiative'], ['emotionalMaturityQuality', 'Emotional maturity'], ['interpersonalOutlookQuality', 'Interpersonal outlook'], ['narrativeCoherenceQuality', 'Narrative coherence'], ['futureOrientationQuality', 'Future orientation / closure']]
  })
};
