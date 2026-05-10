const express = require('express');
const { firebaseProtect } = require('../middleware/firebaseAuthMiddleware');
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
} = require('../controllers/firestoreController');

const router = express.Router();

router.use(firebaseProtect);

router.get('/oir/questions', getOirQuestions);
router.post('/oir/results', saveOirResult);
router.get('/oir/history/:userId', getOirHistory);

router.post('/ppdt/results', savePpdtResult);
router.get('/ppdt/history/:userId', getPpdtHistory);

router.post('/wat/results', saveWatResult);
router.get('/wat/history/:userId', getWatHistory);

router.post('/srt/results', saveSrtResult);
router.get('/srt/history/:userId', getSrtHistory);

router.post('/tat/results', saveTatResult);
router.get('/tat/history/:userId', getTatHistory);

router.post('/piq', savePiq);
router.get('/piq/:userId', getPiq);

router.post('/user/profile', upsertUserProfile);
router.get('/user/profile', getUserProfile);
router.patch('/user/type', updateUserType);

module.exports = router;
