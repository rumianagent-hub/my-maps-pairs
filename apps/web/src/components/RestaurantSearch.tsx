'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { loadMapsApi } from '@/lib/maps';
import { resolvePhotoUrl } from '@/lib/placePhotos';

interface PlaceResult {
  placeId?: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  photoUrl?: string;
}

interface RestaurantSearchProps {
  onSelect: (place: PlaceResult) => Promise<void>;
}

export default function RestaurantSearch({ onSelect }: RestaurantSearchProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);
  const [manualMode, setManualMode] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);
  const autocompleteService = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'your_google_maps_api_key') {
      setManualMode(true);
      return;
    }

    loadMapsApi()
      .then(() => {
        if (cancelled || typeof window === 'undefined' || !(window as any).google) return;
        const googleAny = (window as any).google;
        autocompleteService.current = new googleAny.maps.places.AutocompleteService();
        setMapsReady(true);
      })
      .catch(() => setManualMode(true));

    return () => {
      cancelled = true;
    };
  }, []);

  const searchPlaces = useCallback(async (input: string): Promise<void> => {
    if (!input.trim() || !autocompleteService.current || typeof window === 'undefined') return;
    const googleAny = (window as any).google;
    if (!googleAny?.maps) return;

    setLoading(true);
    try {
      const predictions = await new Promise<any[]>((resolve, reject) => {
        autocompleteService.current.getPlacePredictions(
          { input, types: ['restaurant', 'food', 'cafe', 'bar'] },
          (results: any[], status: string) => {
            if (status === googleAny.maps.places.PlacesServiceStatus.OK && results) resolve(results);
            else reject(new Error(status));
          }
        );
      });

      setSuggestions(
        predictions.map((p) => ({
          placeId: p.place_id,
          name: p.structured_formatting.main_text,
          address: p.structured_formatting.secondary_text,
        }))
      );
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPlaceDetails = async (placeId: string): Promise<PlaceResult> => {
    if (typeof window === 'undefined' || !(window as any).google) {
      throw new Error('Google Maps not ready');
    }

    const googleAny = (window as any).google;
    const place = new googleAny.maps.places.Place({ id: placeId });
    await place.fetchFields({ fields: ['id', 'displayName', 'formattedAddress', 'location', 'photos'] });

    const placePhotoUrl = place.photos?.[0]?.getURI?.({ maxWidth: 480, maxHeight: 260 });

    return {
      placeId: place.id,
      name: place.displayName ?? '',
      address: place.formattedAddress,
      lat: place.location?.lat?.(),
      lng: place.location?.lng?.(),
      photoUrl: resolvePhotoUrl(placePhotoUrl),
    };
  };

  return (
    <div className="space-y-4">
      {!manualMode ? (
        <>
          <div className="relative">
            <input
              type="text"
              className="input-field pr-10"
              placeholder="Search restaurants…"
              value={query}
              onChange={(e) => {
                const val = e.target.value;
                setQuery(val);
                if (val.length > 2) searchPlaces(val);
                else setSuggestions([]);
              }}
              autoFocus
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--accent)] border-t-transparent" />
              </div>
            )}
          </div>

          {suggestions.length > 0 && (
            <div className="card p-0 overflow-hidden divide-y divide-white/10">
              {suggestions.map((s) => (
                <button
                  key={s.placeId}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      let place = s;
                      if (s.placeId && mapsReady) place = await fetchPlaceDetails(s.placeId);
                      await onSelect(place);
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <p className="font-medium text-sm">{s.name}</p>
                  {s.address && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{s.address}</p>}
                </button>
              ))}
            </div>
          )}

          <div className="text-center">
            <button onClick={() => setManualMode(true)} className="text-sm text-[var(--accent-light)] underline">
              Can't find it? Enter manually
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-3">
            <input
              type="text"
              className="input-field"
              placeholder="Restaurant name *"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              autoFocus
            />
            <input
              type="text"
              className="input-field"
              placeholder="Address (optional)"
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
            />
          </div>
          <button
            className="btn-primary"
            onClick={async () => {
              if (!manualName.trim()) return;
              setSaving(true);
              try {
                await onSelect({ name: manualName.trim(), address: manualAddress.trim() || undefined });
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving || !manualName.trim()}
          >
            {saving ? 'Adding…' : '+ Add Restaurant'}
          </button>
          {mapsReady && (
            <div className="text-center">
              <button onClick={() => setManualMode(false)} className="text-sm text-[var(--accent-light)] underline">
                ← Back to search
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
