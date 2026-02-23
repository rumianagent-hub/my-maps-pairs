'use client';

import { useEffect, useMemo, useState } from 'react';
import { loadMapsApi } from '@/lib/maps';

interface ExplorePlace {
  placeId?: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  types?: string[];
  photoUrl?: string;
  distanceKm?: number;
}

interface ExploreTabProps {
  onAddRestaurant: (place: ExplorePlace) => Promise<void>;
}

const distanceKm = (aLat: number, aLng: number, bLat: number, bLng: number): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const sa = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa));
};

export default function ExploreTab({ onAddRestaurant }: ExploreTabProps) {
  const [places, setPlaces] = useState<ExplorePlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey || apiKey === 'your_google_maps_api_key') {
        setError('Explore is unavailable because the Google Maps key is missing.');
        setLoading(false);
        return;
      }

      if (!navigator.geolocation) {
        setError('Geolocation is not supported by this browser.');
        setLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await loadMapsApi();
            if (cancelled || typeof window === 'undefined' || !(window as any).google) return;

            const googleAny = (window as any).google;
            const center = { lat: pos.coords.latitude, lng: pos.coords.longitude };

            const response = await googleAny.maps.places.Place.searchNearby({
              fields: ['id', 'displayName', 'location', 'businessStatus', 'rating', 'types', 'photos', 'formattedAddress'],
              locationRestriction: {
                center,
                radius: 4000,
              },
              includedTypes: ['restaurant'],
              maxResultCount: 20,
            });

            const nearbyPlaces = response?.places ?? [];
            if (!nearbyPlaces.length) {
              setError('No nearby restaurants found right now.');
              setLoading(false);
              return;
            }

            const mapped = nearbyPlaces
              .map((r: any) => {
                const lat = r.location?.lat?.();
                const lng = r.location?.lng?.();

                return {
                  placeId: r.id,
                  name: r.displayName ?? 'Restaurant',
                  address: r.formattedAddress,
                  lat,
                  lng,
                  rating: r.rating,
                  types: r.types,
                  photoUrl: r.photos?.[0]?.getURI?.({ maxWidth: 480, maxHeight: 260 }),
                  distanceKm: lat && lng ? distanceKm(center.lat, center.lng, lat, lng) : undefined,
                } as ExplorePlace;
              })
              .sort((a: ExplorePlace, b: ExplorePlace) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

            setPlaces(mapped);
            setLoading(false);
          } catch (e: any) {
            if (!cancelled) {
              setError(e?.message || 'Failed to load nearby places.');
              setLoading(false);
            }
          }
        },
        (geoErr) => {
          if (cancelled) return;
          if (geoErr.code === geoErr.PERMISSION_DENIED) {
            setError('Location permission was denied. Enable location to explore nearby restaurants.');
          } else {
            setError('Could not get your location. Please try again.');
          }
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
      );
    };

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="space-y-3">
          <div className="h-24 shimmer" />
          <div className="h-24 shimmer" />
          <div className="h-24 shimmer" />
        </div>
      );
    }

    if (error) {
      return <div className="card text-sm text-[var(--text-secondary)]">{error}</div>;
    }

    return (
      <div className="space-y-3 stagger">
        {places.map((p) => (
          <div key={p.placeId || p.name} className="card card-hover overflow-hidden animate-fade-in">
            {p.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.photoUrl} alt={p.name} className="w-full h-32 object-cover rounded-xl mb-3" />
            )}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{p.name}</h3>
                <p className="text-xs text-[var(--text-secondary)] truncate">{p.address || 'Address unavailable'}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {(p.types?.[0] || 'Restaurant').replaceAll('_', ' ')} · ⭐ {p.rating ?? '—'} · {p.distanceKm?.toFixed(1) ?? '—'} km
                </p>
              </div>
              <button
                className="btn-primary px-3 py-2 text-xs w-auto"
                disabled={addingId === (p.placeId || p.name)}
                onClick={async () => {
                  const id = p.placeId || p.name;
                  setAddingId(id);
                  try {
                    await onAddRestaurant(p);
                  } finally {
                    setAddingId(null);
                  }
                }}
              >
                {addingId === (p.placeId || p.name) ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }, [loading, error, places, addingId, onAddRestaurant]);

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="card glass">
        <h2 className="text-lg font-semibold gradient-text">Explore nearby restaurants</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1">Discover places around you and add them to your pair list instantly.</p>
      </div>
      {content}
    </div>
  );
}
