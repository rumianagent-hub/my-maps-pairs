'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface PlaceResult {
  placeId?: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
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
  const autocompleteService =
    useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const mapDivRef = useRef<HTMLDivElement | null>(null);

  // Load Google Maps
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'your_google_maps_api_key') {
      setManualMode(true);
      return;
    }

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places'],
    });

    loader
      .load()
      .then(() => {
        autocompleteService.current =
          new google.maps.places.AutocompleteService();
        setMapsReady(true);
      })
      .catch(() => {
        // Gracefully fall back to manual entry
        setManualMode(true);
      });
  }, []);

  // Init PlacesService (needs a DOM node)
  useEffect(() => {
    if (mapsReady && mapDivRef.current && !placesService.current) {
      const map = new google.maps.Map(mapDivRef.current);
      placesService.current = new google.maps.places.PlacesService(map);
    }
  }, [mapsReady]);

  const searchPlaces = useCallback(
    async (input: string): Promise<void> => {
      if (!input.trim() || !autocompleteService.current) return;

      setLoading(true);
      try {
        const predictions = await new Promise<
          google.maps.places.AutocompletePrediction[]
        >((resolve, reject) => {
          autocompleteService.current!.getPlacePredictions(
            {
              input,
              types: ['restaurant', 'food', 'cafe', 'bar'],
            },
            (results, status) => {
              if (
                status === google.maps.places.PlacesServiceStatus.OK &&
                results
              ) {
                resolve(results);
              } else {
                reject(new Error(status));
              }
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
    },
    []
  );

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value;
    setQuery(val);
    if (val.length > 2) {
      searchPlaces(val);
    } else {
      setSuggestions([]);
    }
  };

  const fetchPlaceDetails = (placeId: string): Promise<PlaceResult> => {
    return new Promise((resolve, reject) => {
      if (!placesService.current) {
        reject(new Error('PlacesService not ready'));
        return;
      }
      placesService.current.getDetails(
        { placeId, fields: ['place_id', 'name', 'formatted_address', 'geometry'] },
        (result, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && result) {
            resolve({
              placeId: result.place_id,
              name: result.name ?? '',
              address: result.formatted_address,
              lat: result.geometry?.location?.lat(),
              lng: result.geometry?.location?.lng(),
            });
          } else {
            reject(new Error(status));
          }
        }
      );
    });
  };

  const handleSelectSuggestion = async (s: PlaceResult): Promise<void> => {
    setSaving(true);
    try {
      let place = s;
      if (s.placeId && placesService.current) {
        place = await fetchPlaceDetails(s.placeId);
      }
      await onSelect(place);
    } finally {
      setSaving(false);
    }
  };

  const handleManualSubmit = async (): Promise<void> => {
    if (!manualName.trim()) return;
    setSaving(true);
    try {
      await onSelect({
        name: manualName.trim(),
        address: manualAddress.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  // Hidden map div for PlacesService
  return (
    <div className="space-y-4">
      <div ref={mapDivRef} style={{ display: 'none' }} />

      {!manualMode ? (
        <>
          <div className="relative">
            <input
              type="text"
              className="input-field pr-10"
              placeholder="Search restaurants…"
              value={query}
              onChange={handleQueryChange}
              autoFocus
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent" />
              </div>
            )}
          </div>

          {suggestions.length > 0 && (
            <div className="card p-0 overflow-hidden divide-y divide-gray-100">
              {suggestions.map((s) => (
                <button
                  key={s.placeId}
                  onClick={() => handleSelectSuggestion(s)}
                  disabled={saving}
                  className="w-full text-left px-4 py-3 active:bg-gray-50 transition-colors"
                >
                  <p className="font-medium text-gray-900 text-sm">{s.name}</p>
                  {s.address && (
                    <p className="text-xs text-gray-500 mt-0.5">{s.address}</p>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="text-center">
            <button
              onClick={() => setManualMode(true)}
              className="text-sm text-primary-600 underline"
            >
              Can't find it? Enter manually
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Restaurant name *
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Mama's Kitchen"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address (optional)
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. 123 Main St, Toronto"
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
              />
            </div>
          </div>

          <button
            className="btn-primary"
            onClick={handleManualSubmit}
            disabled={saving || !manualName.trim()}
          >
            {saving ? 'Adding…' : '+ Add Restaurant'}
          </button>

          {mapsReady && (
            <div className="text-center">
              <button
                onClick={() => setManualMode(false)}
                className="text-sm text-primary-600 underline"
              >
                ← Back to search
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
