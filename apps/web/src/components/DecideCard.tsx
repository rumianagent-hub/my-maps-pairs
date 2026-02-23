'use client';

import { useState } from 'react';
import { decideForUsFn, RestaurantData } from '@/lib/firebase';

interface DecideCardProps {
  pairId: string;
  mutuals: string[];
  restaurants: RestaurantData[];
}

export default function DecideCard({
  pairId,
  mutuals,
  restaurants,
}: DecideCardProps) {
  const [decided, setDecided] = useState<RestaurantData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);

  const handleDecide = async (): Promise<void> => {
    if (!pairId) return;
    setLoading(true);
    setError(null);
    setDecided(null);

    try {
      const result = await decideForUsFn({ pairId });
      setAnimating(true);
      // brief suspense animation
      await new Promise((r) => setTimeout(r, 600));
      setDecided(result.data.restaurant);
      setAnimating(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not decide');
    } finally {
      setLoading(false);
    }
  };

  const hasMutuals = mutuals.length > 0;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="card text-center">
        <div className="text-4xl mb-3">🎯</div>
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">Decide For Us</h2>
        <p className="text-[var(--text-secondary)] text-sm">
          {hasMutuals
            ? `${mutuals.length} mutual match${mutuals.length !== 1 ? 'es' : ''} — let fate pick from them.`
            : 'No mutual matches yet. Both of you need to vote on some restaurants first.'}
        </p>
      </div>

      {/* Result card */}
      {(loading || animating) && (
        <div className="card flex flex-col items-center py-10 gap-4">
          <div className="text-5xl animate-bounce">🎲</div>
          <p className="text-[var(--text-secondary)] font-medium">Spinning the wheel…</p>
        </div>
      )}

      {decided && !loading && (
        <div className="card border-2 border-[var(--accent)] bg-[var(--accent)]/5 text-center py-8">
          <div className="text-5xl mb-4">🏆</div>
          <p className="text-sm text-[var(--accent-light)] font-semibold uppercase tracking-wide mb-2">
            Tonight you're going to…
          </p>
          <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
            {decided.name}
          </h3>
          {decided.address && (
            <p className="text-[var(--text-secondary)] text-sm">{decided.address}</p>
          )}

          {decided.lat && decided.lng && (
            <a
              href={`https://maps.google.com/?q=${decided.lat},${decided.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 text-[var(--accent-light)] text-sm font-medium underline"
            >
              📍 Open in Google Maps
            </a>
          )}

          <button
            className="mt-6 btn-secondary"
            onClick={() => setDecided(null)}
          >
            🔄 Pick Again
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Decide button */}
      {!loading && !decided && (
        <button
          className="btn-primary text-lg py-4"
          onClick={handleDecide}
          disabled={!hasMutuals || loading}
        >
          🎲 Decide For Us!
        </button>
      )}

      {/* Mutual list preview */}
      {hasMutuals && (
        <div className="card">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
            Pool of mutual matches ({mutuals.length}):
          </h3>
          <div className="space-y-2">
            {mutuals.map((id) => {
              const r = restaurants.find((x) => x.id === id);
              if (!r) return null;
              return (
                <div key={id} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="text-[var(--accent-light)]">❤️</span>
                  <span>{r.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
