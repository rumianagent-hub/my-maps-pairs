import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { requireAuth, requirePairMember, serializeDoc, db } from './helpers';

interface GetPairSummaryData {
  pairId: string;
}

interface VoteEntry {
  restaurantId: string;
  userId: string;
  voteType: string;
}

/**
 * getPairSummary({ pairId }) -> { restaurants, votes, mutuals }
 *
 * Returns all restaurants, all votes, and computed mutual matches for the pair.
 * Mutuals: both members voted 'like' or 'love' on the same restaurant.
 */
export const getPairSummary = onCall<GetPairSummaryData>(async (request) => {
  const uid = requireAuth(request);
  const { pairId } = request.data;

  if (!pairId) {
    throw new HttpsError('invalid-argument', 'pairId is required.');
  }

  const pair = await requirePairMember(uid, pairId);
  const members = pair.members as string[];

  // Parallel fetch restaurants and votes
  const [restaurantsSnap, votesSnap] = await Promise.all([
    db
      .collection('restaurants')
      .where('pairId', '==', pairId)
      .orderBy('createdAt', 'asc')
      .get(),
    db.collection('votes').where('pairId', '==', pairId).get(),
  ]);

  const restaurants = restaurantsSnap.docs.map((doc) => ({
    id: doc.id,
    ...serializeDoc(doc.data()),
  }));

  const votes = votesSnap.docs.map((doc) => ({
    id: doc.id,
    ...serializeDoc(doc.data()),
  }));

  // Compute mutual matches
  const votesForMutuals: VoteEntry[] = votesSnap.docs.map((doc) => {
    const d = doc.data();
    return {
      restaurantId: d.restaurantId as string,
      userId: d.userId as string,
      voteType: d.voteType as string,
    };
  });

  const mutuals = computeMutuals(
    restaurants.map((r) => r.id as string),
    votesForMutuals,
    members
  );

  return { restaurants, votes, mutuals };
});

/** Find restaurant IDs where all pair members voted like or love */
function computeMutuals(
  restaurantIds: string[],
  votes: VoteEntry[],
  members: string[]
): string[] {
  if (members.length < 2) {
    return [];
  }

  return restaurantIds.filter((rid) => {
    return members.every((memberId) => {
      const vote = votes.find(
        (v) => v.restaurantId === rid && v.userId === memberId
      );
      return vote?.voteType === 'like' || vote?.voteType === 'love';
    });
  });
}
