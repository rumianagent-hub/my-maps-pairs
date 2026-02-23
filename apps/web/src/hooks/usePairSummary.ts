'use client';

import { useEffect, useMemo, useState } from 'react';
import { getDb, PairSummaryResponse, RestaurantData, VoteData } from '@/lib/firebase';

interface UsePairSummaryResult {
  summary: PairSummaryResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface GenericDoc {
  id: string;
  [key: string]: any;
}

const toRestaurant = (doc: GenericDoc): RestaurantData => ({
  id: doc.id,
  pairId: doc.pairId,
  placeId: doc.placeId,
  name: doc.name,
  address: doc.address,
  lat: doc.lat,
  lng: doc.lng,
  addedBy: doc.addedBy,
  createdAt: normalizeTs(doc.createdAt),
});

const toVote = (doc: GenericDoc): VoteData => ({
  id: doc.id,
  restaurantId: doc.restaurantId,
  pairId: doc.pairId,
  userId: doc.userId,
  voteType: doc.voteType,
  updatedAt: normalizeTs(doc.updatedAt),
});

const normalizeTs = (value: any): string => {
  if (!value) return new Date(0).toISOString();
  if (typeof value === 'string') return value;
  if (value?.toDate) return value.toDate().toISOString();
  return new Date(value).toISOString();
};

function computeMutuals(restaurantIds: string[], votes: VoteData[], members: string[]): string[] {
  if (members.length < 2) return [];

  return restaurantIds.filter((rid) =>
    members.every((memberId) => {
      const vote = votes.find((v) => v.restaurantId === rid && v.userId === memberId);
      return vote?.voteType === 'like' || vote?.voteType === 'love';
    })
  );
}

export function usePairSummary(pairId: string | null): UsePairSummaryResult {
  const [summary, setSummary] = useState<PairSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unsubPair: (() => void) | null = null;
    let unsubRestaurants: (() => void) | null = null;
    let unsubVotes: (() => void) | null = null;
    const memberUnsubs: Array<() => void> = [];

    if (!pairId) {
      setSummary(null);
      return;
    }

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const db = await getDb();
        if (!db) return;

        const { doc, collection, query, where, orderBy, onSnapshot } = await import('firebase/firestore');

        let pairData: any = null;
        let restaurants: RestaurantData[] = [];
        let votes: VoteData[] = [];
        const memberMap = new Map<string, any>();

        const publish = () => {
          if (!pairData || cancelled) return;
          const members: string[] = pairData.members ?? [];
          const ownerId: string = pairData.ownerId || members[0] || '';
          const mutuals = computeMutuals(restaurants.map((r) => r.id), votes, members);

          const memberDocs = members.map((memberId) => {
            const user = memberMap.get(memberId) ?? {};
            return {
              uid: memberId,
              displayName: user.displayName || 'Member',
              photoURL: user.photoURL || '',
              email: user.email || '',
            };
          });

          setSummary({
            restaurants,
            votes,
            mutuals,
            inviteCode: pairData.inviteCode || '',
            ownerId,
            members: memberDocs,
          });
          setLoading(false);
        };

        unsubPair = onSnapshot(
          doc(db, 'pairs', pairId),
          (pairSnap) => {
            if (!pairSnap.exists()) {
              setSummary(null);
              setLoading(false);
              setError('Pair session no longer exists.');
              return;
            }

            pairData = pairSnap.data();
            const memberIds: string[] = pairData.members ?? [];

            while (memberUnsubs.length) {
              const unsub = memberUnsubs.pop();
              unsub?.();
            }
            memberMap.clear();

            memberIds.forEach((memberId) => {
              const unsub = onSnapshot(doc(db, 'users', memberId), (userSnap) => {
                memberMap.set(memberId, userSnap.exists() ? userSnap.data() : {});
                publish();
              });
              memberUnsubs.push(unsub);
            });

            publish();
          },
          (err) => {
            setError(err.message || 'Failed to subscribe to pair');
            setLoading(false);
          }
        );

        unsubRestaurants = onSnapshot(
          query(collection(db, 'restaurants'), where('pairId', '==', pairId), orderBy('createdAt', 'asc')),
          (snap) => {
            restaurants = snap.docs.map((d) => toRestaurant({ id: d.id, ...d.data() }));
            publish();
          },
          (err) => {
            setError(err.message || 'Failed to subscribe to restaurants');
            setLoading(false);
          }
        );

        unsubVotes = onSnapshot(
          query(collection(db, 'votes'), where('pairId', '==', pairId)),
          (snap) => {
            votes = snap.docs.map((d) => toVote({ id: d.id, ...d.data() }));
            publish();
          },
          (err) => {
            setError(err.message || 'Failed to subscribe to votes');
            setLoading(false);
          }
        );
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? 'Failed to load pair data');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      unsubPair?.();
      unsubRestaurants?.();
      unsubVotes?.();
      memberUnsubs.forEach((u) => u());
    };
  }, [pairId]);

  const refresh = useMemo(() => async () => {}, []);

  return { summary, loading, error, refresh };
}
