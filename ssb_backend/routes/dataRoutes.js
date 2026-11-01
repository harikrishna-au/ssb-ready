const express = require('express');
const { guard, AI } = require('../middleware/guard');
const schemas = require('../middleware/schemas');
const {
  getOirQuestions,
  saveOirResult,
  savePpdtResult,
  saveWatResult,
  saveSrtResult,
  saveTatResult,
  getOirHistory,
  getPpdtHistory,
  getWatHistory,
  getSrtHistory,
  getTatHistory,
  savePiq,
  getPiq,
  upsertUserProfile,
  getUserProfile,
  updateUserType
} = require('../controllers/dataController');

const router = express.Router({ caseSensitive: true });


router.get('/oir/questions', ...guard({ limits: ['write'] }), getOirQuestions);
router.post('/oir/results', ...guard({ limits: ['write'], schema: schemas.oirResult }), saveOirResult);
router.get('/oir/history/:userId', ...guard({ limits: ['write'] }), getOirHistory);

router.post('/ppdt/results', ...guard({ limits: ['write'], schema: schemas.storyResult }), savePpdtResult);
router.get('/ppdt/history/:userId', ...guard({ limits: ['write'] }), getPpdtHistory);

router.post('/wat/results', ...guard({ limits: ['write'], schema: schemas.responsesResult }), saveWatResult);
router.get('/wat/history/:userId', ...guard({ limits: ['write'] }), getWatHistory);

router.post('/srt/results', ...guard({ limits: ['write'], schema: schemas.responsesResult }), saveSrtResult);
router.get('/srt/history/:userId', ...guard({ limits: ['write'] }), getSrtHistory);

router.post('/tat/results', ...guard({ limits: ['write'], schema: schemas.storyResult }), saveTatResult);
router.get('/tat/history/:userId', ...guard({ limits: ['write'] }), getTatHistory);

router.post('/piq', ...guard({ limits: ['write'], schema: schemas.piq }), savePiq);
router.get('/piq/:userId', ...guard({ limits: ['write'] }), getPiq);

router.post('/user/profile', ...guard({ limits: ['write'], schema: schemas.userProfile }), upsertUserProfile);
router.get('/user/profile', ...guard({ limits: ['write'] }), getUserProfile);
router.patch('/user/type', ...guard({ limits: ['write'], schema: schemas.userType }), updateUserType);

module.exports = router;
