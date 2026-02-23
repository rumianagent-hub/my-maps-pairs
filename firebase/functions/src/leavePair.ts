import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { requireAuth, db, logEvent } from './helpers';

/**
 * leavePair() -> { ok: true }
 *
 * Allows a non-owner member to leave their active pair.
 */
export const leavePair = onCall(async (request) => {
  const uid = requireAuth(request);

  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  const activePairId = (userSnap.data()?.activePairId as string | null) ?? null;

  if (!activePairId) {
    throw new HttpsError('failed-precondition', 'You are not currently in a pair.');
  }

  const pairRef = db.collection('pairs').doc(activePairId);
  const pairSnap = await pairRef.get();

  if (!pairSnap.exists) {
    await userRef.set(
      {
        activePairId: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return { ok: true };
  }

  const pair = pairSnap.data()!;
  const members = (pair.members as string[]) ?? [];
  const ownerId = (pair.ownerId as string) || members[0] || '';

  if (!members.includes(uid)) {
    await userRef.set(
      {
        activePairId: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return { ok: true };
  }

  if (uid === ownerId) {
    throw new HttpsError(
      'permission-denied',
      'Hosts cannot leave the pair. End the pair instead.'
    );
  }

  const batch = db.batch();
  batch.update(pairRef, {
    members: admin.firestore.FieldValue.arrayRemove(uid),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  batch.set(
    userRef,
    {
      activePairId: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();
  await logEvent(uid, activePairId, 'pair_left', {});

  return { ok: true };
});
