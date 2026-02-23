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
 * getPairSummary({ pairId }) -> { restaurants, votes, mutuals, inviteCode, ownerId, members }
 *
 * Returns all restaurants, all votes, computed mutual matches,
 * and member profile metadata for the pair.
 */
export const getPairSummary = onCall<GetPairSummaryData>(async (request) => {
  const uid = requireAuth(request);
  const { pairId } = request.data;

  if (!pairId) {
    throw new HttpsError('invalid-argument', 'pairId is required.');
  }

  const pair = await requirePairMember(uid, pairId);
  const members = (pair.members as string[]) ?? [];
  const ownerId = (pair.ownerId as string) || members[0] || '';

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

  const memberDocs = await Promise.all(
    members.map(async (memberId) => {
      const userSnap = await db.collection('users').doc(memberId).get();
      const user = userSnap.exists ? userSnap.data() ?? {} : {};
      return {
        uid: memberId,
        displayName: (user.displayName as string) || 'Member',
        photoURL: (user.photoURL as string) || '',
        email: (user.email as string) || '',
      };
    })
  );

  return {
    restaurants,
    votes,
    mutuals,
    inviteCode: (pair.inviteCode as string) || '',
    ownerId,
    members: memberDocs,
  };
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
