const OpenAI = require('openai');
const { config } = require('../config');

let openaiClient;

function getClient() {
  if (!config.openai.apiKey) {
    throw new Error('OPENAI_API_KEY is missing');
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: config.openai.apiKey });
  }
  return openaiClient;
}

function parseModelJson(text) {
  if (!text || typeof text !== 'string') throw new Error('AI returned an empty response');

  let cleanJson = text.trim();
  if (cleanJson.startsWith('```json')) cleanJson = cleanJson.slice(7);
  if (cleanJson.startsWith('```')) cleanJson = cleanJson.slice(3);
  if (cleanJson.endsWith('```')) cleanJson = cleanJson.slice(0, -3);
  cleanJson = cleanJson.trim();

  return JSON.parse(cleanJson);
}

async function generateJson(prompt) {
  const client = getClient();
  const model = config.openai.model;
  const maxPromptChars = config.openai.maxPromptChars;

  const completion = await client.chat.completions.create({
    model,
    response_format: { type: 'json_object' },
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content:
          'You are an SSB evaluator. Return only valid JSON matching the requested schema.'
      },
      { role: 'user', content: prompt.slice(0, maxPromptChars) }
    ]
  });

  const text = completion.choices?.[0]?.message?.content || '';
  return parseModelJson(text);
}

function normalizeScore(score) {
  const parsed = Number(score);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(10, Math.round(parsed)));
}

async function evaluatePpdt(story) {
  const prompt = `
You are an expert Services Selection Board (SSB) assessor.
Evaluate the following PPDT story and respond with valid JSON only.
Schema:
{
  "theme": "string",
  "action": "string",
  "identified_olqs": ["string", "string"],
  "feedback": "string",
  "score": number
}
Story: "${story}"
`;

  const json = await generateJson(prompt);
  return {
    theme: String(json.theme || 'Neutral'),
    action: String(json.action || 'No action defined.'),
    identified_olqs: Array.isArray(json.identified_olqs) ? json.identified_olqs.map(String) : [],
    feedback: String(json.feedback || 'No feedback provided.'),
    score: normalizeScore(json.score)
  };
}

function buildWatFeedbackBlock(overall, perWordNotes) {
  const core = String(overall || '').trim();
  if (!Array.isArray(perWordNotes) || perWordNotes.length === 0) {
    return core;
  }
  const lines = perWordNotes.map((n) => {
    const w = String(n.word ?? '').trim();
    const note = String(n.note ?? '').trim();
    const sent = String(n.sentiment ?? '').trim();
    const tag = sent ? ` (${sent})` : '';
    const safeWord = w || '(word)';
    return `- **${safeWord}**${tag}: ${note || '—'}`;
  });
  return `${core}\n\n#### Per-word notes\n${lines.join('\n')}`.trim();
}

function buildSrtFeedbackBlock(overall, perSituationNotes) {
  const core = String(overall || '').trim();
  if (!Array.isArray(perSituationNotes) || perSituationNotes.length === 0) {
    return core;
  }
  const lines = perSituationNotes.map((n) => {
    const idx = Number(n.index);
    const idxLabel = Number.isFinite(idx) ? `${idx + 1}` : '?';
    const preview = String(n.situation_preview ?? '').trim().slice(0, 100);
    const note = String(n.note ?? '').trim();
    const sent = String(n.sentiment ?? '').trim();
    const tag = sent ? ` (${sent})` : '';
    const head = preview
      ? `S${idxLabel} ("${preview}${preview.length >= 100 ? '...' : ''}")`
      : `Situation ${idxLabel}`;
    return `- **${head}**${tag}: ${note || '—'}`;
  });
  return `${core}\n\n#### Per-situation notes\n${lines.join('\n')}`.trim();
}

async function evaluateWat(responses) {
  if (!responses || typeof responses !== 'object' || Object.keys(responses).length === 0) {
    return {
      identified_olqs: [],
      feedback: 'No responses were submitted for evaluation.',
      score: 0
    };
  }

  const payloadJson = JSON.stringify(responses);
  const prompt = `
You are an expert SSB psychologist evaluating practice Word Association Test (WAT) responses.

INPUT (each key is the stimulus word; value is the candidate's sentence):
${payloadJson}

Rubric (holistic + per word):
- Prefer constructive, responsible, and socially adaptable themes over hostility, helplessness, or blame-shifting.
- Reward spontaneity and clarity; flag contradictory, overly violent, or escapist themes.
- Map observable traits to OLQs only when clearly evidenced (e.g. courage of conviction, sense of responsibility, social adaptability).
- Empty or nearly empty sentences should score poorly for that word and be called out in per_word_notes.

OFFICER LIKE QUALITIES (reference only — pick those genuinely reflected): courage, straight-forwardness, decisiveness, determination, stamina, dependability, enthusiasm, loyalty, sense of responsibility, sense of humour, social adaptability, co-operation, self-confidence, initiative, liveliness, reasoning ability, organisation ability, power of expression.

Return valid JSON only:
{
  "identified_olqs": ["string"],
  "feedback": "3–6 sentences: overall pattern of positivity/defence orientation, major strengths, and top risks.",
  "score": number,
  "per_word_notes": [
    {
      "word": "must match a stimulus key from INPUT",
      "note": "one or two crisp sentences",
      "sentiment": "positive|neutral|negative|concern"
    }
  ]
}

Rules:
- Include exactly one object in per_word_notes for EVERY stimulus word in INPUT (same words).
- Score is 0–10 for the whole battery (not averaged mechanically; use judgment).
`;

  const json = await generateJson(prompt);
  const perWord = Array.isArray(json.per_word_notes) ? json.per_word_notes : [];
  const feedback = buildWatFeedbackBlock(json.feedback, perWord);
  return {
    identified_olqs: Array.isArray(json.identified_olqs) ? json.identified_olqs.map(String) : [],
    feedback,
    score: normalizeScore(json.score)
  };
}

async function evaluateSrt(responses) {
  if (!responses || typeof responses !== 'object' || Object.keys(responses).length === 0) {
    return {
      identified_olqs: [],
      feedback: 'No responses were submitted for evaluation.',
      score: 0
    };
  }

  const situations = Object.keys(responses || {});
  const enumerated = situations.map((situation, index) => ({
    index,
    situation,
    reaction: responses[situation] ?? ''
  }));
  const prompt = `
You are an expert SSB psychologist evaluating practice Situation Reaction Test (SRT) responses.

Each item has: situation text and the candidate's reaction (may be empty if timed out).

DATA:
${JSON.stringify(enumerated, null, 0)}

Rubric:
- Prefer practical, lawful, leader-like actions: assume responsibility, inform/help others, use resources sensibly.
- Penalize avoidance, aggression without proportionality, cheating, or abdicating leadership.
- Emotional maturity and social adaptability matter as much as “correctness.”
- Empty reactions are invalid attempts — note them explicitly.

OFFICER LIKE QUALITIES (reference): initiative, courage, determination, sense of responsibility, dependability, cooperation, social adaptability, reasoning ability, organising ability, self-confidence.

Return valid JSON only:
{
  "identified_olqs": ["string"],
  "feedback": "3–6 sentences: overall leadership pattern, judgment quality, and consistency.",
  "score": number,
  "per_situation_notes": [
    {
      "index": number,
      "situation_preview": "first ~80 chars of that situation",
      "note": "one or two sentences on this reaction",
      "sentiment": "positive|neutral|negative|concern"
    }
  ]
}

Rules:
- per_situation_notes must have exactly one entry per index from 0 to ${Math.max(enumerated.length - 1, 0)} inclusive.
- Score is 0–10 overall judgment on the full set.
`;

  const json = await generateJson(prompt);
  const perSit = Array.isArray(json.per_situation_notes) ? json.per_situation_notes : [];
  const feedback = buildSrtFeedbackBlock(json.feedback, perSit);
  return {
    identified_olqs: Array.isArray(json.identified_olqs) ? json.identified_olqs.map(String) : [],
    feedback,
    score: normalizeScore(json.score)
  };
}

async function evaluateTat(imageDescription, story) {
  const prompt = `
You are an expert Services Selection Board (SSB) assessor.
Evaluate the TAT story using the image description and respond with valid JSON only.
Schema:
{
  "theme": "string",
  "action": "string",
  "identified_olqs": ["string", "string"],
  "feedback": "string",
  "score": number
}
Image description: "${imageDescription}"
Story: "${story}"
`;

  const json = await generateJson(prompt);
  return {
    theme: String(json.theme || ''),
    action: String(json.action || ''),
    identified_olqs: Array.isArray(json.identified_olqs) ? json.identified_olqs.map(String) : [],
    feedback: String(json.feedback || ''),
    score: normalizeScore(json.score)
  };
}

async function generateInterviewReply(piq, chatHistory) {
  const prompt = `
You are an SSB Interviewing Officer.
Generate only the next IO reply as plain text.
Candidate PIQ: ${JSON.stringify(piq)}
Conversation history: ${JSON.stringify(chatHistory)}
`;

  const client = getClient();
  const model = config.openai.model;
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.7,
    messages: [
      {
        role: 'system',
        content:
          'You are a professional SSB Interviewing Officer. Ask realistic, concise follow-up questions.'
      },
      { role: 'user', content: prompt }
    ]
  });
  return (completion.choices?.[0]?.message?.content || '').trim() || 'I see. Tell me more about that.';
}

async function evaluatePpdtPipeline({ storyText, perception, topStories }) {
  const prompt = `
You are an SSB psychologist assessing a PPDT story for screening stage 1.
Do deep structured scoring.

Candidate perception details:
${JSON.stringify(perception)}

Candidate story:
${storyText}

Top benchmark stories (for relative comparison):
${JSON.stringify(topStories)}

Return only valid JSON:
{
  "score": number,
  "themeQuality": number,
  "heroActionQuality": number,
  "olqPresenceQuality": number,
  "narrativeClarityQuality": number,
  "stressHandlingQuality": number,
  "strengths": ["string"],
  "improvementTips": ["string"],
  "detailedFeedback": "string",
  "comparativeInsights": "string"
}
`;

  const json = await generateJson(prompt);
  const score = normalizeScore(json.score);
  const strengths = Array.isArray(json.strengths) ? json.strengths.map(String) : [];
  const tips = Array.isArray(json.improvementTips) ? json.improvementTips.map(String) : [];
  const detailed = String(json.detailedFeedback || '');
  const compare = String(json.comparativeInsights || '');

  const analysisMarkdown = `
## PPDT Detailed Assessment

**Overall Score:** ${score}/10

### Section Scores
- Theme quality: ${normalizeScore(json.themeQuality)}/10
- Hero action quality: ${normalizeScore(json.heroActionQuality)}/10
- OLQ presence quality: ${normalizeScore(json.olqPresenceQuality)}/10
- Narrative clarity quality: ${normalizeScore(json.narrativeClarityQuality)}/10
- Stress handling quality: ${normalizeScore(json.stressHandlingQuality)}/10

### Strengths
${strengths.length ? strengths.map((s) => `- ${s}`).join('\n') : '- No strong points extracted clearly.'}

### Improvement Tips
${tips.length ? tips.map((t) => `- ${t}`).join('\n') : '- Focus on a proactive hero and clear positive ending.'}

### Detailed Feedback
${detailed || 'No detailed feedback available.'}

### Comparison Against Better Stories
${compare || 'No comparison available.'}
`.trim();

  return { score, analysisMarkdown };
}

async function evaluateTatPipeline({
  storyText,
  imageDescription,
  imageIndex,
  perception,
  topStories
}) {
  const prompt = `
You are an SSB psychologist assessing a Thematic Apperception Test (TAT) story.
This is psychology stage narrative projection — score depth of themes, hero initiative, emotional maturity, and interpersonal outlook.

Scene prompt (what the candidate saw):
${imageDescription}
(Card index in practice app: ${imageIndex})

Candidate perception notes (before writing):
${JSON.stringify(perception)}

Candidate story:
${storyText}

Top benchmark stories on this leaderboard for comparison:
${JSON.stringify(topStories)}

Return only valid JSON:
{
  "score": number,
  "themeQuality": number,
  "heroActionQuality": number,
  "emotionalMaturityQuality": number,
  "interpersonalOutlookQuality": number,
  "narrativeCoherenceQuality": number,
  "futureOrientationQuality": number,
  "strengths": ["string"],
  "improvementTips": ["string"],
  "detailedFeedback": "string",
  "comparativeInsights": "string"
}
`;

  const json = await generateJson(prompt);
  const score = normalizeScore(json.score);
  const strengths = Array.isArray(json.strengths) ? json.strengths.map(String) : [];
  const tips = Array.isArray(json.improvementTips) ? json.improvementTips.map(String) : [];
  const detailed = String(json.detailedFeedback || '');
  const compare = String(json.comparativeInsights || '');

  const analysisMarkdown = `
## TAT Detailed Assessment

**Overall Score:** ${score}/10

### Section Scores
- Theme / projection quality: ${normalizeScore(json.themeQuality)}/10
- Hero action & initiative: ${normalizeScore(json.heroActionQuality)}/10
- Emotional maturity: ${normalizeScore(json.emotionalMaturityQuality)}/10
- Interpersonal outlook: ${normalizeScore(json.interpersonalOutlookQuality)}/10
- Narrative coherence: ${normalizeScore(json.narrativeCoherenceQuality)}/10
- Future orientation / closure: ${normalizeScore(json.futureOrientationQuality)}/10

### Strengths
${strengths.length ? strengths.map((s) => `- ${s}`).join('\n') : '- No strong strengths extracted clearly.'}

### Improvement Tips
${tips.length ? tips.map((t) => `- ${t}`).join('\n') : '- Strengthen the hero’s decisive action and positive resolution.'}

### Detailed Feedback
${detailed || 'No detailed feedback available.'}

### Comparison With Stronger Stories
${compare || 'No comparison available.'}
`.trim();

  return { score, analysisMarkdown };
}

/**
 * Transcribe handwritten story text from a photo using vision-capable chat model.
 * @param {string} base64Image - Raw base64 (no data: prefix)
 * @param {string} mimeType - e.g. image/jpeg, image/png
 */
async function ocrHandwrittenImage(base64Image, mimeType = 'image/jpeg') {
  if (!base64Image || typeof base64Image !== 'string') {
    throw new Error('imageBase64 is required');
  }

  const client = getClient();
  const model = config.openai.visionModel;

  const dataUrl = `data:${mimeType};base64,${base64Image.replace(/\s/g, '')}`;

  const completion = await client.chat.completions.create({
    model,
    temperature: 0,
    max_tokens: 4096,
    messages: [
      {
        role: 'system',
        content:
          'You transcribe handwritten English text from candidate photos (PPDT stories). ' +
          'Return only the transcribed text. Preserve paragraph breaks with blank lines. ' +
          'If a word is unreadable, write [illegible]. No preamble or commentary.'
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              'Transcribe every line of handwritten story text in this image. ' +
              'Ignore margins and doodles unless they are clearly part of the story.'
          },
          {
            type: 'image_url',
            image_url: { url: dataUrl, detail: 'high' }
          }
        ]
      }
    ]
  });

  const text = (completion.choices?.[0]?.message?.content || '').trim();
  if (!text) {
    throw new Error('OCR produced empty text');
  }
  return text;
}

const evaluateTest = async (testType, content, extra = '') => {
  const client = getClient();
  const model = config.openai.model;

  let prompt = '';

  switch (testType) {
    case 'WAT':
      prompt = `You are an expert SSB Psychologist. Evaluate these Word Association Test responses: ${JSON.stringify(content)}. Provide a structured assessment of the candidate's personality and identify key OLQs (Officer Like Qualities).`;
      break;
    case 'SRT':
      prompt = `You are an expert SSB Psychologist. Evaluate these Situation Reaction Test responses: ${JSON.stringify(content)}. Focus on logical reasoning, decisiveness, and social adaptability.`;
      break;
    case 'PPDT':
    case 'TAT':
      prompt = `You are an expert SSB Psychologist. Evaluate this ${testType} story: "${content}". The scene was described as: "${extra}". Identify the theme, action of the hero, and underlying personality traits/OLQs.`;
      break;
    case 'INTERVIEW_PREP':
      prompt = `Based on the following candidate PIQ data: ${JSON.stringify(content)}, generate 5 personalized, probing interview questions that an Interviewing Officer (IO) might ask during an SSB interview. Focus on weak areas or interesting details.`;
      break;
    default:
      prompt = `Evaluate this SSB response: ${JSON.stringify(content)}`;
  }

  try {
    const maxPromptChars = config.openai.maxPromptChars;
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.4,
      messages: [
        { role: 'system', content: 'You are an expert SSB psychologist.' },
        { role: 'user', content: prompt.slice(0, maxPromptChars) }
      ]
    });
    return completion.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('AI Service Error:', error.message);
    throw new Error('AI evaluation failed');
  }
};

module.exports = {
  evaluateTest,
  evaluatePpdt,
  evaluateWat,
  evaluateSrt,
  evaluateTat,
  generateInterviewReply,
  evaluatePpdtPipeline,
  evaluateTatPipeline,
  ocrHandwrittenImage
};
