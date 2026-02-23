'use client';

import { useState } from 'react';
import { VoteType } from '@/types';
import { castVoteFn } from '@/lib/firebase';
import clsx from 'clsx';

interface VoteButtonsProps {
  restaurantId: string;
  pairId: string;
  currentVote: VoteType | null;
  onVoted: () => Promise<void>;
}

const VOTES: { type: VoteType; emoji: string; label: string }[] = [
  { type: 'love', emoji: '😍', label: 'Love it' },
  { type: 'like', emoji: '👍', label: 'Like it' },
  { type: 'dislike', emoji: '👎', label: 'Nope' },
];

export default function VoteButtons({
  restaurantId,
  pairId: _pairId,
  currentVote,
  onVoted,
}: VoteButtonsProps) {
  const [casting, setCasting] = useState<VoteType | null>(null);

  const handleVote = async (voteType: VoteType): Promise<void> => {
    if (casting) return;
    setCasting(voteType);
    try {
      await castVoteFn({ restaurantId, voteType });
      await onVoted();
    } catch (err) {
      console.error('Vote failed:', err);
    } finally {
      setCasting(null);
    }
  };

  return (
    <div className="flex gap-2">
      {VOTES.map((v) => {
        const isActive = currentVote === v.type;
        const isLoading = casting === v.type;

        return (
          <button
            key={v.type}
            onClick={() => handleVote(v.type)}
            disabled={!!casting}
            title={v.label}
            className={clsx(
              'flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-all',
              isActive
                ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-400 scale-105'
                : 'bg-gray-100 text-gray-600 active:scale-95',
              casting && !isLoading && 'opacity-50'
            )}
          >
            <span className={isLoading ? 'animate-pulse' : ''}>{v.emoji}</span>
            {isActive && (
              <span className="text-xs">{v.label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
