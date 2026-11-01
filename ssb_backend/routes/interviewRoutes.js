const express = require('express');
const { guard, AI } = require('../middleware/guard');
const schemas = require('../middleware/schemas');
const { getInterviewQuestionBankHandler } = require('../controllers/testController');
const { interviewReplyHandler } = require('../controllers/evaluationController');

const router = express.Router({ caseSensitive: true });

// /prep requires Supabase PIQ lookup — kept as legacy; unused by current app.
// /reply and /bank need a signed-in user.
router.post('/reply', ...guard({ schema: schemas.interviewReply, limits: AI }), interviewReplyHandler);
router.get('/bank', ...guard({ limits: ['write'] }), getInterviewQuestionBankHandler);

module.exports = router;
