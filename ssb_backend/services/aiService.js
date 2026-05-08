const { GoogleGenerativeAI } = require('@google/generative-ai');

let modelInstance;

function getModel() {
  if (!modelInstance) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    modelInstance = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
  }
  return modelInstance;
}

const evaluateTest = async (testType, content, extra = '') => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing');
  }

  const model = getModel();

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
    const maxPromptChars = Number(process.env.AI_PROMPT_MAX_CHARS || 12000);
    const result = await model.generateContent(prompt.slice(0, maxPromptChars));
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('AI Service Error:', error.message);
    throw new Error('AI evaluation failed');
  }
};

module.exports = { evaluateTest };
