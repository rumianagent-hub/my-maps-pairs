import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { requireAuth, generateInviteCode, logEvent, db } from './helpers';

/**
 * createPair() -> { pairId, inviteCode }
 *
 * Creates a new pair for the authenticated user.
 * Enforces: one active pair per user (can't create if already in one).
 */
export const createPair = onCall(async (request) => {
  const uid = requireAuth(request);

  // Check if user already has an active pair
  const userSnap = await db.collection('users').doc(uid).get();
  if (userSnap.exists) {
    const userData = userSnap.data()!;
    if (userData.activePairId) {
      const { https } = await import('firebase-functions/v2');
      throw new https.HttpsError(
        'already-exists',
        'You are already in a pair. Leave your current pair first.'
      );
    }
  }

  // Generate a unique invite code
  let inviteCode = generateInviteCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await db
      .collection('pairs')
      .where('inviteCode', '==', inviteCode)
      .limit(1)
      .get();
    if (existing.empty) {
      break;
    }
    inviteCode = generateInviteCode();
    attempts++;
  }

  // Create the pair doc
  const pairRef = db.collection('pairs').doc();
  const batch = db.batch();

  batch.set(pairRef, {
    members: [uid],
    inviteCode,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Update the user's activePairId
  batch.set(
    db.collection('users').doc(uid),
    {
      activePairId: pairRef.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();
  await logEvent(uid, pairRef.id, 'pair_created', { inviteCode });

  return { pairId: pairRef.id, inviteCode };
});
