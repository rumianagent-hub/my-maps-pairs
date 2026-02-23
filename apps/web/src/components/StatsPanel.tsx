'use client';

import { Restaurant, Vote } from '@/types';

interface StatsPanelProps {
  restaurants: Restaurant[];
  votes: Vote[];
  mutuals: string[];
  userId: string;
}

interface StatCardProps {
  icon: string;
  value: string | number;
  label: string;
  highlight?: boolean;
}

function StatCard({ icon, value, label, highlight }: StatCardProps) {
  return (
    <div
      className={`card text-center ${
        highlight ? 'border-[var(--accent)]/30 bg-[var(--accent)]/5' : ''
      }`}
    >
      <div className="text-3xl mb-1">{icon}</div>
      <div
        className={`text-3xl font-bold mb-1 ${
          highlight ? 'text-[var(--accent-light)]' : 'text-[var(--text-primary)]'
        }`}
      >
        {value}
      </div>
      <div className="text-xs text-[var(--text-secondary)]">{label}</div>
    </div>
  );
}

export default function StatsPanel({
  restaurants,
  votes,
  mutuals,
  userId,
}: StatsPanelProps) {
  const myVotes = votes.filter((v) => v.userId === userId);
  const partnerVotes = votes.filter((v) => v.userId !== userId);

  const myLoves = myVotes.filter((v) => v.voteType === 'love').length;
  const myLikes = myVotes.filter((v) => v.voteType === 'like').length;
  const myDislikes = myVotes.filter((v) => v.voteType === 'dislike').length;
  const partnerTotal = partnerVotes.length;

  const matchRate =
    restaurants.length > 0
      ? Math.round((mutuals.length / restaurants.length) * 100)
      : 0;

  const unvotedByMe = restaurants.filter(
    (r) => !myVotes.find((v) => v.restaurantId === r.id)
  ).length;

  // Most loved restaurant
  const loveVotes = votes.filter((v) => v.voteType === 'love');
  const loveCounts: Record<string, number> = {};
  loveVotes.forEach((v) => {
    loveCounts[v.restaurantId] = (loveCounts[v.restaurantId] ?? 0) + 1;
  });
  const topRestaurantId = Object.entries(loveCounts).sort(
    ([, a], [, b]) => b - a
  )[0]?.[0];
  const topRestaurant = restaurants.find((r) => r.id === topRestaurantId);

  if (restaurants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-5xl mb-4">📊</div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No data yet</h2>
        <p className="text-[var(--text-secondary)] text-sm">
          Add restaurants and vote to see your stats.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-[var(--text-primary)]">Your Stats</h2>

      {/* Main grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon="🍽️"
          value={restaurants.length}
          label="Restaurants"
        />
        <StatCard
          icon="❤️"
          value={mutuals.length}
          label="Mutual Matches"
          highlight
        />
        <StatCard
          icon="🎯"
          value={`${matchRate}%`}
          label="Match Rate"
        />
        <StatCard
          icon="⏳"
          value={unvotedByMe}
          label="Awaiting Your Vote"
        />
      </div>

      {/* Your voting breakdown */}
      <div className="card">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
          Your Votes Breakdown
        </h3>
        <div className="space-y-2">
          {[
            { emoji: '😍', label: 'Love', count: myLoves, color: 'bg-red-500' },
            { emoji: '👍', label: 'Like', count: myLikes, color: 'bg-green-500' },
            { emoji: '👎', label: 'Dislike', count: myDislikes, color: 'bg-gray-500' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="text-lg w-8">{item.emoji}</span>
              <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full ${item.color} rounded-full transition-all`}
                  style={{
                    width:
                      myVotes.length > 0
                        ? `${(item.count / myVotes.length) * 100}%`
                        : '0%',
                  }}
                />
              </div>
              <span className="text-sm text-[var(--text-secondary)] w-8 text-right">
                {item.count}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-3">
          Partner has voted on {partnerTotal} restaurant
          {partnerTotal !== 1 ? 's' : ''}.
        </p>
      </div>

      {/* Top pick */}
      {topRestaurant && (
        <div className="card border-yellow-500/30 bg-yellow-500/5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
            ⭐ Most Loved
          </h3>
          <p className="font-bold text-[var(--text-primary)]">{topRestaurant.name}</p>
          {topRestaurant.address && (
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {topRestaurant.address}
            </p>
          )}
          <p className="text-xs text-yellow-400 mt-1">
            {loveCounts[topRestaurant.id]} love vote
            {loveCounts[topRestaurant.id] !== 1 ? 's' : ''} between you both
          </p>
        </div>
      )}
    </div>
  );
}
