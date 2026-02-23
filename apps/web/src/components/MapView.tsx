'use client';

import { useEffect, useRef, useState } from 'react';
import { RestaurantData } from '@/lib/firebase';
import { loadMapsApi } from '@/lib/maps';

interface MapViewProps {
  restaurants: RestaurantData[];
  mutuals: string[];
}

const DARK_MAP_STYLE: any[] = [
  { elementType: 'geometry', stylers: [{ color: '#0f1118' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f1118' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a93a8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1c2233' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#c0c8dd' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1528' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#7c7c8a' }] },
];

export default function MapView({ restaurants, mutuals }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const [noKey, setNoKey] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'your_google_maps_api_key') {
      setNoKey(true);
      return;
    }

    loadMapsApi()
      .then(() => {
        if (!cancelled && typeof window !== 'undefined' && (window as any).google) {
          setMapsReady(true);
        }
      })
      .catch(() => !cancelled && setNoKey(true));

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mapsReady || !mapRef.current || mapInstanceRef.current || typeof window === 'undefined') return;
    const googleAny = (window as any).google;
    if (!googleAny?.maps) return;

    mapInstanceRef.current = new googleAny.maps.Map(mapRef.current, {
      zoom: 12,
      center: { lat: 43.6532, lng: -79.3832 },
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: DARK_MAP_STYLE,
    });
  }, [mapsReady]);

  useEffect(() => {
    if (!mapsReady || !mapInstanceRef.current || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        mapInstanceRef.current.panTo(coords);
        mapInstanceRef.current.setZoom(14);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocationDenied(true);
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }, [mapsReady]);

  useEffect(() => {
    if (!mapsReady || !mapInstanceRef.current || typeof window === 'undefined') return;
    const googleAny = (window as any).google;
    if (!googleAny?.maps) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
      userMarkerRef.current = null;
    }

    const bounds = new googleAny.maps.LatLngBounds();
    let hasCoords = false;

    restaurants
      .filter((r) => r.lat !== undefined && r.lng !== undefined)
      .forEach((r) => {
        const isMutual = mutuals.includes(r.id);
        const pos = { lat: r.lat, lng: r.lng };

        const marker = new googleAny.maps.Marker({
          position: pos,
          map: mapInstanceRef.current,
          title: r.name,
          icon: {
            path: googleAny.maps.SymbolPath.CIRCLE,
            scale: isMutual ? 12 : 8,
            fillColor: isMutual ? '#8b5cf6' : '#7c7c8a',
            fillOpacity: 1,
            strokeColor: '#f5f5f7',
            strokeWeight: 2,
          },
        });

        const infoWindow = new googleAny.maps.InfoWindow({
          content: `<div style="padding:8px 10px;color:#f5f5f7;background:#111119"><div style="font-weight:600">${r.name}${
            isMutual ? ' ❤️' : ''
          }</div>${r.address ? `<div style="font-size:12px;color:#7c7c8a">${r.address}</div>` : ''}</div>`,
        });

        marker.addListener('click', () => infoWindow.open(mapInstanceRef.current, marker));

        markersRef.current.push(marker);
        bounds.extend(pos);
        hasCoords = true;
      });

    if (userLocation) {
      userMarkerRef.current = new googleAny.maps.Marker({
        position: userLocation,
        map: mapInstanceRef.current,
        title: 'You are here',
        icon: {
          path: googleAny.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#bfdbfe',
          strokeWeight: 3,
        },
        zIndex: 999,
      });

      bounds.extend(userLocation);
      hasCoords = true;
    }

    if (hasCoords) mapInstanceRef.current.fitBounds(bounds);
  }, [restaurants, mutuals, mapsReady, userLocation]);

  const recenterToMyLocation = () => {
    if (!mapInstanceRef.current || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        mapInstanceRef.current.panTo(coords);
        mapInstanceRef.current.setZoom(15);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocationDenied(true);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  if (noKey) {
    return <div className="p-4 text-sm text-[var(--text-secondary)]">Map unavailable (missing Google Maps API key).</div>;
  }

  if (!mapsReady) {
    return <div className="h-64 mx-4 my-4 rounded-xl shimmer" />;
  }

  return (
    <div className="relative">
      <div ref={mapRef} className="w-full" style={{ height: 'calc(100vh - 176px)' }} />

      {!locationDenied && (
        <button
          onClick={recenterToMyLocation}
          className="absolute right-4 bottom-20 z-[5] px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-white/15 text-xs text-[var(--text-primary)] shadow-lg"
        >
          📍 My Location
        </button>
      )}

      <div className="px-4 py-3 bg-[var(--bg-card)] border-t border-white/10 text-xs text-[var(--text-secondary)]">
        🟣 = mutual match · ⚪ = not yet matched · 🔵 = your location
      </div>
    </div>
  );
}
