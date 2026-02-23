import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { requireAuth, requirePairMember, logEvent, db } from './helpers';

interface PlaceInput {
  placeId?: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  photoUrl?: string;
  photoReference?: string;
}

interface AddRestaurantData {
  pairId: string;
  place: PlaceInput;
}

/**
 * addRestaurant({ pairId, place }) -> { restaurantId }
 *
 * Adds a restaurant to the pair's list.
 * Validates membership and prevents cross-pair access.
 */
export const addRestaurant = onCall<AddRestaurantData>(async (request) => {
  const uid = requireAuth(request);
  const { pairId, place } = request.data;

  if (!pairId || !place?.name) {
    throw new HttpsError(
      'invalid-argument',
      'pairId and place.name are required.'
    );
  }

  // Verify membership
  await requirePairMember(uid, pairId);

  // Check for duplicate (same placeId in this pair)
  if (place.placeId) {
    const existing = await db
      .collection('restaurants')
      .where('pairId', '==', pairId)
      .where('placeId', '==', place.placeId)
      .limit(1)
      .get();

    if (!existing.empty) {
      // Return existing instead of creating a duplicate
      return { restaurantId: existing.docs[0].id };
    }
  }

  const restaurantRef = db.collection('restaurants').doc();

  const restaurantData: Record<string, unknown> = {
    pairId,
    name: place.name.trim(),
    addedBy: uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (place.placeId) { restaurantData.placeId = place.placeId; }
  if (place.address) { restaurantData.address = place.address.trim(); }
  if (place.lat !== undefined) { restaurantData.lat = place.lat; }
  if (place.lng !== undefined) { restaurantData.lng = place.lng; }
  if (place.photoUrl) { restaurantData.photoUrl = place.photoUrl.trim(); }
  if (place.photoReference) { restaurantData.photoReference = place.photoReference.trim(); }

  await restaurantRef.set(restaurantData);
  await logEvent(uid, pairId, 'restaurant_added', { name: place.name });

  return { restaurantId: restaurantRef.id };
});
