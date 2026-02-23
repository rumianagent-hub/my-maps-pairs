const GOOGLE_PLACE_PHOTO_ENDPOINT = 'https://maps.googleapis.com/maps/api/place/photo';

const isHttpUrl = (value?: string): boolean => !!value && /^https?:\/\//i.test(value);

export function buildPhotoUrlFromReference(photoReference?: string): string | undefined {
  if (!photoReference) return undefined;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey || apiKey === 'your_google_maps_api_key') return undefined;

  return `${GOOGLE_PLACE_PHOTO_ENDPOINT}?maxwidth=480&photoreference=${encodeURIComponent(photoReference)}&key=${encodeURIComponent(apiKey)}`;
}

/**
 * Accepts either:
 * - full image URL
 * - raw Places photo reference token
 */
export function resolvePhotoUrl(photoValue?: string): string | undefined {
  if (!photoValue) return undefined;
  if (isHttpUrl(photoValue)) return photoValue;
  return buildPhotoUrlFromReference(photoValue);
}
