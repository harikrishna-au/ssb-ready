const { db } = require('../config/firebase');
const { asyncHandler } = require('../middleware/asyncHandler');

function ensureOwner(req, userId) {
  if (!userId || userId !== req.firebaseUser.uid) {
    const error = new Error('Forbidden: userId mismatch');
    error.statusCode = 403;
    throw error;
  }
}

function docToJson(doc) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    ...data,
    completedAt:
      data.completedAt && typeof data.completedAt.toDate === 'function'
        ? data.completedAt.toDate().toISOString()
        : data.completedAt || null
  };
}

const getOirQuestions = asyncHandler(async (_req, res) => {
  const snapshot = await db.collection('oir_questions').orderBy('createdAt', 'asc').get();
  const items = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: data.id || doc.id,
      text: data.text,
      options: data.options || [],
      correct_answer_index: data.correct_answer_index,
      type: data.type,
      image_url: data.image_url || null,
      explanation: data.explanation || null
    };
  });
  res.json({ success: true, data: items });
});

const saveCollectionDoc = (collection) =>
  asyncHandler(async (req, res) => {
    ensureOwner(req, req.body.userId);
    const payload = { ...req.body };
    if (payload.completedAt) payload.completedAt = new Date(payload.completedAt);
    const ref = await db.collection(collection).add(payload);
    res.status(201).json({ success: true, id: ref.id });
  });

const getCollectionHistory = (collection) =>
  asyncHandler(async (req, res) => {
    const userId = req.params.userId;
    ensureOwner(req, userId);
    const snapshot = await db
      .collection(collection)
      .where('userId', '==', userId)
      .orderBy('completedAt', 'desc')
      .get();
    res.json({ success: true, data: snapshot.docs.map(docToJson) });
  });

const savePiq = asyncHandler(async (req, res) => {
  ensureOwner(req, req.body.userId);
  await db.collection('piqs').doc(req.body.userId).set(req.body, { merge: true });
  res.json({ success: true });
});

const getPiq = asyncHandler(async (req, res) => {
  const userId = req.params.userId;
  ensureOwner(req, userId);
  const doc = await db.collection('piqs').doc(userId).get();
  res.json({ success: true, data: doc.exists ? doc.data() : null });
});

const upsertUserProfile = asyncHandler(async (req, res) => {
  const uid = req.firebaseUser.uid;
  const payload = { ...req.body, id: uid, email: req.firebaseUser.email || req.body.email || '' };
  await db.collection('users').doc(uid).set(payload, { merge: true });
  res.json({ success: true });
});

const getUserProfile = asyncHandler(async (req, res) => {
  const uid = req.firebaseUser.uid;
  const doc = await db.collection('users').doc(uid).get();
  res.json({ success: true, data: doc.exists ? doc.data() : null });
});

const updateUserType = asyncHandler(async (req, res) => {
  const uid = req.firebaseUser.uid;
  await db.collection('users').doc(uid).set({ userType: req.body.userType || '' }, { merge: true });
  res.json({ success: true });
});

module.exports = {
  getOirQuestions,
  saveOirResult: saveCollectionDoc('oir_results'),
  savePpdtResult: saveCollectionDoc('ppdt_results'),
  saveWatResult: saveCollectionDoc('wat_results'),
  saveSrtResult: saveCollectionDoc('srt_results'),
  saveTatResult: saveCollectionDoc('tat_results'),
  getOirHistory: getCollectionHistory('oir_results'),
  getPpdtHistory: getCollectionHistory('ppdt_results'),
  getWatHistory: getCollectionHistory('wat_results'),
  getSrtHistory: getCollectionHistory('srt_results'),
  getTatHistory: getCollectionHistory('tat_results'),
  savePiq,
  getPiq,
  upsertUserProfile,
  getUserProfile,
  updateUserType
};
