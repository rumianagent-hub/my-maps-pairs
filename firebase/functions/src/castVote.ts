import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { requireAuth, requirePairMember, logEvent, db } from './helpers';

interface CastVoteData {
  restaurantId: string;
  voteType: 'like' | 'love' | 'dislike';
}

const VALID_VOTE_TYPES = ['like', 'love', 'dislike'];

/**
 * castVote({ restaurantId, voteType }) -> { ok: true }
 *
 * Casts or updates a vote for the authenticated user on a restaurant.
 * Uses an upsert pattern: one vote per user per restaurant.
 */
export const castVote = onCall<CastVoteData>(async (request) => {
  const uid = requireAuth(request);
  const { restaurantId, voteType } = request.data;

  if (!restaurantId) {
    throw new HttpsError('invalid-argument', 'restaurantId is required.');
  }

  if (!VALID_VOTE_TYPES.includes(voteType)) {
    throw new HttpsError(
      'invalid-argument',
      'voteType must be like, love, or dislike.'
    );
  }

  // Fetch the restaurant to get its pairId
  const restaurantSnap = await db
    .collection('restaurants')
    .doc(restaurantId)
    .get();

  if (!restaurantSnap.exists) {
    throw new HttpsError('not-found', 'Restaurant not found.');
  }

  const restaurant = restaurantSnap.data()!;

  // Verify the user belongs to this restaurant's pair
  await requirePairMember(uid, restaurant.pairId as string);

  // Upsert vote: deterministic vote doc id = pairId_restaurantId_userId
  const voteId = `${restaurant.pairId as string}_${restaurantId}_${uid}`;
  const voteRef = db.collection('votes').doc(voteId);

  await voteRef.set({
    restaurantId,
    pairId: restaurant.pairId,
    userId: uid,
    voteType,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logEvent(uid, restaurant.pairId as string, 'vote_cast', {
    restaurantId,
    voteType,
  });

  return { ok: true };
});
