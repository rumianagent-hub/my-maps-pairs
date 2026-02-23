import * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v2';
import type { CallableRequest } from 'firebase-functions/v2/https';

const db = admin.firestore();

/** Generate a random uppercase alphanumeric invite code */
export function generateInviteCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Assert the request has an authenticated user — returns uid */
export function requireAuth(request: CallableRequest): string {
  if (!request.auth) {
    throw new https.HttpsError('unauthenticated', 'You must be signed in.');
  }
  return request.auth.uid;
}

/** Assert the user is a member of the given pair */
export async function requirePairMember(
  uid: string,
  pairId: string
): Promise<admin.firestore.DocumentData> {
  const pairSnap = await db.collection('pairs').doc(pairId).get();
  if (!pairSnap.exists) {
    throw new https.HttpsError('not-found', 'Pair not found.');
  }
  const pair = pairSnap.data()!;
  if (!(pair.members as string[]).includes(uid)) {
    throw new https.HttpsError(
      'permission-denied',
      'You are not a member of this pair.'
    );
  }
  return pair;
}

/** Log an analytics event to the events collection */
export async function logEvent(
  uid: string,
  pairId: string | null,
  eventName: string,
  payload: Record<string, unknown> = {}
): Promise<void> {
  await db.collection('events').add({
    userId: uid,
    pairId,
    eventName,
    payload,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/** Convert Firestore Timestamps to ISO strings for JSON transport */
export function serializeDoc(
  data: admin.firestore.DocumentData
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (
      value !== null &&
      typeof value === 'object' &&
      '_seconds' in (value as object)
    ) {
      result[key] = new Date(
        (value as { _seconds: number })._seconds * 1000
      ).toISOString();
    } else {
      result[key] = value;
    }
  }
  return result;
}

export { db };
