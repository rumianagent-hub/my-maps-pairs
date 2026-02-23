'use client';

import { getDb } from './firebase';

export async function logEvent(
  userId: string | null,
  pairId: string | null,
  eventName: string,
  payload: Record<string, unknown> = {}
): Promise<void> {
  // Firestore rules require userId to match request.auth.uid for client writes.
  if (!userId) return;

  try {
    const db = await getDb();
    if (!db) return;
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
    await addDoc(collection(db, 'events'), {
      userId,
      pairId,
      eventName,
      payload,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[analytics] logEvent failed:', err);
  }
}
