import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { requireAuth, db, logEvent } from './helpers';

/**
 * deletePair() -> { ok: true }
 *
 * Allows the active pair host to fully delete/end the pair.
 */
export const deletePair = onCall(async (request) => {
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

  if (uid !== ownerId) {
    throw new HttpsError('permission-denied', 'Only the host can end this pair.');
  }

  // Collect related docs (chunk-safe deletions)
  const [restaurantsSnap, votesSnap, eventsSnap] = await Promise.all([
    db.collection('restaurants').where('pairId', '==', activePairId).get(),
    db.collection('votes').where('pairId', '==', activePairId).get(),
    db.collection('events').where('pairId', '==', activePairId).get(),
  ]);

  const allMemberIds = new Set<string>(members);
  allMemberIds.add(uid);

  const docsToDelete = [
    ...restaurantsSnap.docs,
    ...votesSnap.docs,
    ...eventsSnap.docs,
    pairRef,
  ];

  // Firestore max 500 ops/batch
  for (let i = 0; i < docsToDelete.length; i += 450) {
    const batch = db.batch();
    docsToDelete.slice(i, i + 450).forEach((docRefOrSnap) => {
      const ref = 'ref' in docRefOrSnap ? docRefOrSnap.ref : docRefOrSnap;
      batch.delete(ref);
    });
    await batch.commit();
  }

  const memberList = Array.from(allMemberIds);
  for (let i = 0; i < memberList.length; i += 450) {
    const batch = db.batch();
    memberList.slice(i, i + 450).forEach((memberId) => {
      const memberRef = db.collection('users').doc(memberId);
      batch.set(
        memberRef,
        {
          activePairId: null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });
    await batch.commit();
  }

  await logEvent(uid, null, 'pair_deleted', { pairId: activePairId });

  return { ok: true };
});
