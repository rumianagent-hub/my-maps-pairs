import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function logEvent(
  userId: string | null,
  pairId: string | null,
  eventName: string,
  payload: Record<string, unknown> = {}
): Promise<void> {
  try {
    await addDoc(collection(db, 'events'), {
      userId,
      pairId,
      eventName,
      payload,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    // Analytics failures should never crash the app
    console.warn('[analytics] logEvent failed:', err);
  }
}
