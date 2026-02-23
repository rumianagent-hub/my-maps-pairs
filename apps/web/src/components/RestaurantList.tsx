'use client';

import { Restaurant, Vote, VoteType } from '@/types';
import VoteButtons from './VoteButtons';
import MutualBadge from './MutualBadge';

interface RestaurantListProps {
  restaurants: Restaurant[];
  votes: Vote[];
  mutuals: string[];
  userId: string;
  pairId: string;
  onVote: () => Promise<void>;
}

export default function RestaurantList({
  restaurants,
  votes,
  mutuals,
  userId,
  pairId,
  onVote,
}: RestaurantListProps) {
  if (restaurants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-5xl mb-4">🍴</div>
        <h2 className="text-lg font-semibold text-gray-700 mb-2">
          No restaurants yet
        </h2>
        <p className="text-gray-400 text-sm">
          Tap the + button to add your first restaurant.
        </p>
      </div>
    );
  }

  const getUserVote = (restaurantId: string): VoteType | null => {
    const vote = votes.find(
      (v) => v.restaurantId === restaurantId && v.userId === userId
    );
    return vote?.voteType ?? null;
  };

  const getPartnerVote = (restaurantId: string): VoteType | null => {
    const vote = votes.find(
      (v) => v.restaurantId === restaurantId && v.userId !== userId
    );
    return vote?.voteType ?? null;
  };

  // Sort: mutuals first, then by createdAt desc
  const sorted = [...restaurants].sort((a, b) => {
    const aIsMutual = mutuals.includes(a.id);
    const bIsMutual = mutuals.includes(b.id);
    if (aIsMutual && !bIsMutual) return -1;
    if (!aIsMutual && bIsMutual) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-3">
      {mutuals.length > 0 && (
        <div className="text-xs font-semibold text-primary-600 uppercase tracking-wide px-1">
          ❤️ {mutuals.length} mutual match{mutuals.length !== 1 ? 'es' : ''}
        </div>
      )}

      {sorted.map((restaurant) => {
        const isMutual = mutuals.includes(restaurant.id);
        const myVote = getUserVote(restaurant.id);
        const partnerVote = getPartnerVote(restaurant.id);

        return (
          <div
            key={restaurant.id}
            className={`card ${isMutual ? 'border-primary-300 bg-primary-50' : ''}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {restaurant.name}
                  </h3>
                  {isMutual && <MutualBadge />}
                </div>
                {restaurant.address && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {restaurant.address}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <VoteButtons
                restaurantId={restaurant.id}
                pairId={pairId}
                currentVote={myVote}
                onVoted={onVote}
              />

              {/* Partner vote indicator */}
              {partnerVote && (
                <div className="text-sm text-gray-400 flex items-center gap-1">
                  <span>Partner:</span>
                  <span>
                    {partnerVote === 'love'
                      ? '😍'
                      : partnerVote === 'like'
                      ? '👍'
                      : '👎'}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
