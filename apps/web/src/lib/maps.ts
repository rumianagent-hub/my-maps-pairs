import { Loader } from '@googlemaps/js-api-loader';

let loaderInstance: Loader | null = null;

export function getMapsLoader(): Loader {
  if (!loaderInstance) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing');
    }

    loaderInstance = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places'],
    });
  }

  return loaderInstance;
}

export async function loadMapsApi(): Promise<typeof google> {
  const loader = getMapsLoader();
  return loader.load();
}
