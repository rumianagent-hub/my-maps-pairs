'use client';

import { useEffect, useMemo, useState } from 'react';
import { Restaurant, Vote, VoteType } from '@/types';
import VoteButtons from './VoteButtons';
import MutualBadge from './MutualBadge';
import { loadMapsApi } from '@/lib/maps';
import { resolvePhotoUrl } from '@/lib/placePhotos';

interface RestaurantListProps {
  restaurants: Restaurant[];
  votes: Vote[];
  mutuals: string[];
  userId: string;
  pairId: string;
  onVote: () => Promise<void>;
}

const distanceKm = (aLat: number, aLng: number, bLat: number, bLng: number): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const sa = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa));
};

export default function RestaurantList({
  restaurants,
  votes,
  mutuals,
  userId,
  pairId,
  onVote,
}: RestaurantListProps) {
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [hydratedPhotoUrls, setHydratedPhotoUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrateMissingPhotos = async () => {
      const missing = restaurants.filter((restaurant) => {
        const anyRestaurant = restaurant as any;
        const existingPhoto = resolvePhotoUrl(anyRestaurant.photoUrl || anyRestaurant.photoURL || anyRestaurant.photoReference);
        return !existingPhoto && !!anyRestaurant.placeId && !hydratedPhotoUrls[restaurant.id];
      });

      if (!missing.length) return;

      try {
        await loadMapsApi();
        if (cancelled || typeof window === 'undefined' || !(window as any).google) return;
        const googleAny = (window as any).google;

        const updates: Record<string, string> = {};

        await Promise.all(
          missing.map(async (restaurant) => {
            const anyRestaurant = restaurant as any;
            try {
              const place = new googleAny.maps.places.Place({ id: anyRestaurant.placeId });
              await place.fetchFields({ fields: ['photos'] });
              const uri = place.photos?.[0]?.getURI?.({ maxWidth: 480, maxHeight: 260 });
              const resolved = resolvePhotoUrl(uri);
              if (resolved) updates[restaurant.id] = resolved;
            } catch {
              // ignore per-item failures
            }
          })
        );

        if (!cancelled && Object.keys(updates).length > 0) {
          setHydratedPhotoUrls((prev) => ({ ...prev, ...updates }));
        }
      } catch {
        // ignore maps loading errors and keep fallback gradient
      }
    };

    hydrateMissingPhotos();

    return () => {
      cancelled = true;
    };
  }, [restaurants, hydratedPhotoUrls]);

  const getUserVote = (restaurantId: string): VoteType | null => {
    const vote = votes.find((v) => v.restaurantId === restaurantId && v.userId === userId);
    return vote?.voteType ?? null;
  };

  const getPartnerVote = (restaurantId: string): VoteType | null => {
    const vote = votes.find((v) => v.restaurantId === restaurantId && v.userId !== userId);
    return vote?.voteType ?? null;
  };

  const sorted = [...restaurants].sort((a, b) => {
    const aIsMutual = mutuals.includes(a.id);
    const bIsMutual = mutuals.includes(b.id);
    if (aIsMutual && !bIsMutual) return -1;
    if (!aIsMutual && bIsMutual) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const rows = useMemo(
    () =>
      sorted.map((restaurant) => {
        const anyRestaurant = restaurant as any;
        const typeLabel = (anyRestaurant.types?.[0] || 'Restaurant').replaceAll('_', ' ');
        const rating = anyRestaurant.rating;
        const photoUrl =
          resolvePhotoUrl(anyRestaurant.photoUrl || anyRestaurant.photoURL || anyRestaurant.photoReference) ||
          hydratedPhotoUrls[restaurant.id];
        const distance =
          userPosition && restaurant.lat !== undefined && restaurant.lng !== undefined
            ? distanceKm(userPosition.lat, userPosition.lng, restaurant.lat, restaurant.lng)
            : undefined;

        return {
          restaurant,
          typeLabel,
          rating,
          photoUrl,
          distance,
        };
      }),
    [sorted, userPosition, hydratedPhotoUrls]
  );

  if (restaurants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-5xl mb-4">🍴</div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No restaurants yet</h2>
        <p className="text-[var(--text-secondary)] text-sm">Tap the + button to add your first restaurant.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {mutuals.length > 0 && (
        <div className="text-xs font-semibold text-[var(--accent-light)] uppercase tracking-wide px-1">
          ❤️ {mutuals.length} mutual match{mutuals.length !== 1 ? 'es' : ''}
        </div>
      )}

      {rows.map(({ restaurant, typeLabel, rating, photoUrl, distance }) => {
        const isMutual = mutuals.includes(restaurant.id);
        const myVote = getUserVote(restaurant.id);
        const partnerVote = getPartnerVote(restaurant.id);

        return (
          <div
            key={restaurant.id}
            className={`card card-hover overflow-hidden animate-fade-in ${isMutual ? 'border-[var(--accent)]/30 bg-[var(--accent)]/5' : ''}`}
          >
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={restaurant.name} className="w-full h-32 object-cover rounded-xl mb-3" />
            ) : (
              <div className="w-full h-32 rounded-xl mb-3 bg-gradient-to-br from-[var(--bg-elevated)] via-[#222235] to-[var(--bg-secondary)] border border-white/10" />
            )}

            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[var(--text-primary)] truncate">{restaurant.name}</h3>
                  {isMutual && <MutualBadge />}
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{restaurant.address || 'Address unavailable'}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {typeLabel} · ⭐ {rating ?? '—'} · {distance?.toFixed(1) ?? '—'} km
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <VoteButtons restaurantId={restaurant.id} pairId={pairId} currentVote={myVote} onVoted={onVote} />

              {partnerVote && (
                <div className="text-sm text-[var(--text-secondary)] flex items-center gap-1 whitespace-nowrap">
                  <span>Partner:</span>
                  <span>{partnerVote === 'love' ? '😍' : partnerVote === 'like' ? '👍' : '👎'}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
