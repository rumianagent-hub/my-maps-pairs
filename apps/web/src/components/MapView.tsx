'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { RestaurantData } from '@/lib/firebase';

interface MapViewProps {
  restaurants: RestaurantData[];
  mutuals: string[];
}

export default function MapView({ restaurants, mutuals }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [mapsReady, setMapsReady] = useState(false);
  const [noKey, setNoKey] = useState(false);

  // Load Google Maps JS
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'your_google_maps_api_key') {
      setNoKey(true);
      return;
    }

    const loader = new Loader({ apiKey, version: 'weekly' });
    loader.load().then(() => setMapsReady(true)).catch(() => setNoKey(true));
  }, []);

  // Init map
  useEffect(() => {
    if (!mapsReady || !mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      zoom: 12,
      center: { lat: 43.6532, lng: -79.3832 }, // Toronto default
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
  }, [mapsReady]);

  // Place markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasCoords = false;

    const withCoords = restaurants.filter(
      (r) => r.lat !== undefined && r.lng !== undefined
    );

    withCoords.forEach((r) => {
      const isMutual = mutuals.includes(r.id);
      const pos = { lat: r.lat!, lng: r.lng! };

      const marker = new google.maps.Marker({
        position: pos,
        map: mapInstanceRef.current!,
        title: r.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: isMutual ? 12 : 8,
          fillColor: isMutual ? '#ef4444' : '#6b7280',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="font-weight:600">${r.name}${isMutual ? ' ❤️' : ''}</div>${
          r.address ? `<div style="font-size:12px;color:#666">${r.address}</div>` : ''
        }`,
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current!, marker);
      });

      markersRef.current.push(marker);
      bounds.extend(pos);
      hasCoords = true;
    });

    if (hasCoords) {
      mapInstanceRef.current.fitBounds(bounds);
    }
  }, [restaurants, mutuals, mapsReady]);

  if (noKey) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-6 py-8">
        <div className="text-4xl mb-3">🗺️</div>
        <p className="text-gray-700 font-medium mb-1">Map Unavailable</p>
        <p className="text-gray-400 text-sm">
          Add a{' '}
          <code className="bg-gray-100 px-1 rounded text-xs">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          </code>{' '}
          to enable the map view.
        </p>

        {/* Fallback: list of restaurants with addresses */}
        {restaurants.length > 0 && (
          <div className="mt-6 w-full text-left space-y-2">
            {restaurants.map((r) => (
              <div key={r.id} className="card py-2 px-3">
                <p className="font-medium text-sm text-gray-900">{r.name}</p>
                {r.address && (
                  <p className="text-xs text-gray-500">{r.address}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!mapsReady) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div ref={mapRef} className="w-full" style={{ height: 'calc(100vh - 160px)' }} />
      <div className="px-4 py-3 bg-white border-t border-gray-100">
        <p className="text-xs text-gray-500">
          🔴 = mutual match &nbsp; ⚫ = not yet matched
        </p>
      </div>
    </div>
  );
}
