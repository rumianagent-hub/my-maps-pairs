import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { requireAuth, requirePairMember, logEvent, serializeDoc, db } from './helpers';

interface DecideForUsData {
  pairId: string;
}

interface VoteEntry {
  restaurantId: string;
  userId: string;
  voteType: string;
}

/**
 * decideForUs({ pairId }) -> { restaurant }
 *
 * Picks a restaurant from the mutual matches, weighted by love votes.
 * - 'love' from both = weight 4
 * - 'love' from one, 'like' from other = weight 2
 * - 'like' from both = weight 1
 */
export const decideForUs = onCall<DecideForUsData>(async (request) => {
  const uid = requireAuth(request);
  const { pairId } = request.data;

  if (!pairId) {
    throw new HttpsError('invalid-argument', 'pairId is required.');
  }

  const pair = await requirePairMember(uid, pairId);
  const members = pair.members as string[];

  if (members.length < 2) {
    throw new HttpsError(
      'failed-precondition',
      'Your pair needs 2 members before deciding.'
    );
  }

  // Fetch restaurants and votes in parallel
  const [restaurantsSnap, votesSnap] = await Promise.all([
    db.collection('restaurants').where('pairId', '==', pairId).get(),
    db.collection('votes').where('pairId', '==', pairId).get(),
  ]);

  const votes: VoteEntry[] = votesSnap.docs.map((d) => {
    const data = d.data();
    return {
      restaurantId: data.restaurantId as string,
      userId: data.userId as string,
      voteType: data.voteType as string,
    };
  });

  // Find mutuals and compute weights
  const candidates: Array<{ restaurantId: string; weight: number }> = [];

  for (const rDoc of restaurantsSnap.docs) {
    const rid = rDoc.id;
    const memberVotes = members.map((memberId) =>
      votes.find((v) => v.restaurantId === rid && v.userId === memberId)
    );

    const allPositive = memberVotes.every(
      (v) => v?.voteType === 'like' || v?.voteType === 'love'
    );

    if (!allPositive) { continue; }

    const loveCount = memberVotes.filter(
      (v) => v?.voteType === 'love'
    ).length;

    const weight = loveCount === 2 ? 4 : loveCount === 1 ? 2 : 1;
    candidates.push({ restaurantId: rid, weight });
  }

  if (candidates.length === 0) {
    throw new HttpsError(
      'failed-precondition',
      'No mutual matches yet. Both of you need to vote on restaurants.'
    );
  }

  // Weighted random selection
  const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
  let random = Math.random() * totalWeight;
  let chosen = candidates[0];

  for (const candidate of candidates) {
    random -= candidate.weight;
    if (random <= 0) {
      chosen = candidate;
      break;
    }
  }

  const chosenDoc = restaurantsSnap.docs.find(
    (d) => d.id === chosen.restaurantId
  )!;

  const restaurant: Record<string, unknown> = {
    id: chosenDoc.id,
    ...serializeDoc(chosenDoc.data()),
  };

  await logEvent(uid, pairId, 'decide_for_us', {
    chosen: restaurant['name'] as string,
  });

  return { restaurant };
});
