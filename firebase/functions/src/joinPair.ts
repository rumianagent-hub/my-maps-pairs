import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { requireAuth, logEvent, db } from './helpers';

interface JoinPairData {
  inviteCode: string;
}

/**
 * joinPair({ inviteCode }) -> { pairId }
 *
 * Joins an existing pair by invite code.
 * Enforces: max 2 members per pair, can't join your own pair, can't join if already in one.
 */
export const joinPair = onCall<JoinPairData>(async (request) => {
  const uid = requireAuth(request);
  const data = request.data;

  if (!data.inviteCode || typeof data.inviteCode !== 'string') {
    throw new HttpsError('invalid-argument', 'inviteCode is required.');
  }

  const code = data.inviteCode.trim().toUpperCase();

  // Check if user already has an active pair
  const userSnap = await db.collection('users').doc(uid).get();
  if (userSnap.exists) {
    const userData = userSnap.data()!;
    if (userData.activePairId) {
      throw new HttpsError(
        'already-exists',
        'You are already in a pair. Leave your current pair first.'
      );
    }
  }

  // Find the pair by invite code
  const pairsQuery = await db
    .collection('pairs')
    .where('inviteCode', '==', code)
    .limit(1)
    .get();

  if (pairsQuery.empty) {
    throw new HttpsError('not-found', 'Invite code not found.');
  }

  const pairDoc = pairsQuery.docs[0];
  const pairData = pairDoc.data();

  // Can't join your own pair
  if ((pairData.members as string[]).includes(uid)) {
    throw new HttpsError('already-exists', 'You already created this pair.');
  }

  // Enforce max 2 members
  if (pairData.members.length >= 2) {
    throw new HttpsError(
      'resource-exhausted',
      'This pair is already full (max 2 members).'
    );
  }

  // Add user to the pair
  const batch = db.batch();

  batch.update(pairDoc.ref, {
    members: admin.firestore.FieldValue.arrayUnion(uid),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  batch.set(
    db.collection('users').doc(uid),
    {
      activePairId: pairDoc.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();
  await logEvent(uid, pairDoc.id, 'pair_joined', {});

  return { pairId: pairDoc.id };
});
