import admin from 'firebase-admin';

export async function requireFirebase(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Missing auth token' });
  try {
    const decoded   = await admin.auth().verifyIdToken(token);
    req.firebaseUid = decoded.uid;
    req.userPhone   = decoded.phone_number || '';
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
