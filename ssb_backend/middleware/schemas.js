const { z } = require('zod');

/**
 * Request body schemas. Unknown top-level keys are stripped (zod default), so a client can never
 * write fields we did not ask for (for example a forged `isPremium`).
 * Limits are generous for real use but bound what one request can store or send to the AI.
 */
const str = (max) => z.string().max(max);
const userId = z.string().min(1).max(128);
const isoDate = z.union([z.string().max(40), z.number()]).refine((v) => !Number.isNaN(new Date(v).getTime()), 'invalid date');
const score = z.number().finite().min(0).max(100);
// Responses to WAT/SRT/SDT: { "1": "text", ... } or { "word": "text" }.
const responses = z.record(str(200), str(2000)).refine((o) => Object.keys(o).length <= 80, 'too many responses');
const flat = z.record(str(100), z.union([str(2000), z.number(), z.boolean(), z.null()])).refine((o) => Object.keys(o).length <= 60, 'too many fields');
const olqs = z.array(str(80)).max(30);

const resultBase = {
  userId,
  completedAt: isoDate.optional(),
  score: score.optional(),
  aiFeedback: str(20000).optional(),
  identifiedOlqs: olqs.optional(),
  evaluation: z.record(str(100), z.unknown()).optional().refine((o) => !o || JSON.stringify(o).length < 20000, 'evaluation too large')
};

const paymentVerify = z.object({ razorpay_order_id: str(100), razorpay_payment_id: str(100), razorpay_signature: str(200) });
const oirCheck = z.object({ setId: str(100), questionId: str(100), index: z.number().int().min(0).max(9) });
const oirResult = z.object({ ...resultBase, totalQuestions: z.number().int().min(0).max(500).optional(), percentageScore: score.optional() });
const storyResult = z.object({
  ...resultBase,
  imageId: str(200).optional(),
  imageUrl: str(1000).optional(),
  imageIndex: z.number().int().min(0).max(50).optional(),
  imageDescription: str(2000).optional(),
  storyMode: str(30).optional(),
  userStory: str(8000).optional(),
  perception: flat.optional()
});
const responsesResult = z.object({ ...resultBase, responses: responses.optional() });

const piq = z.object({ userId }).catchall(z.union([str(2000), z.number(), z.boolean(), z.null()])).refine((o) => Object.keys(o).length <= 80, 'too many fields');

const userProfile = z.object({
  firstName: str(100).optional(),
  lastName: str(100).optional(),
  email: str(254).optional(),
  profileImageUrl: str(1000).nullish(),
  emailVerified: z.boolean().optional(),
  createdAt: isoDate.nullish(),
  userType: str(40).optional()
  // isPremium is deliberately not accepted: entitlement comes from Supabase only.
});
const userType = z.object({ userType: str(40) });

const evalPpdt = z.object({ story: str(8000).min(1) });
const evalResponses = z.object({ responses });
const evalTat = z.object({ story: str(8000).min(1), imageDescription: str(2000).min(1) });

const chatMessage = z.object({ role: str(20), content: str(4000).optional(), text: str(4000).optional() }).passthrough();
const interviewReply = z.object({ piq: flat, chatHistory: z.array(chatMessage).max(60) });

const pipelineRun = z.object({
  testType: str(40).min(1),
  payload: z
    .object({
      responses: responses.optional(),
      score: z.number().finite().min(0).max(1000).optional(),
      totalQuestions: z.number().finite().min(0).max(1000).optional(),
      piq: flat.optional(),
      chatHistory: z.array(chatMessage).max(60).optional()
    })
    .optional()
});

const pictureRef = {
  imageId: str(200).optional(),
  imageUrl: str(1000).optional(),
  storyMode: str(30).optional(),
  storyText: str(8000).optional(),
  handwrittenText: str(8000).optional(),
  perception: flat.optional()
};
const ppdtPipeline = z.object(pictureRef);
const tatPipeline = z.object({ ...pictureRef, imageDescription: str(2000).optional(), imageIndex: z.coerce.number().int().min(0).max(50).optional() });
const ocr = z.object({ imageBase64: str(12_000_000).min(1), mimeType: str(60).optional() });

const accountDelete = z.object({ confirm: z.literal('DELETE') });

module.exports = {
  paymentVerify, oirCheck, oirResult, storyResult, responsesResult, piq, userProfile, userType,
  evalPpdt, evalResponses, evalTat, interviewReply, pipelineRun, ppdtPipeline, tatPipeline, ocr, accountDelete
};
