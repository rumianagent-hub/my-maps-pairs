import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1');
export const googleProvider = new GoogleAuthProvider();

// Connect to emulators in development
if (
  process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_USE_EMULATORS === 'true'
) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}

// Typed callable functions
export const createPairFn = httpsCallable<
  Record<string, never>,
  { pairId: string; inviteCode: string }
>(functions, 'createPair');

export const joinPairFn = httpsCallable<
  { inviteCode: string },
  { pairId: string }
>(functions, 'joinPair');

export const addRestaurantFn = httpsCallable<
  {
    pairId: string;
    place: {
      placeId?: string;
      name: string;
      address?: string;
      lat?: number;
      lng?: number;
    };
  },
  { restaurantId: string }
>(functions, 'addRestaurant');

export const castVoteFn = httpsCallable<
  { restaurantId: string; voteType: 'like' | 'love' | 'dislike' },
  { ok: boolean }
>(functions, 'castVote');

export const getPairSummaryFn = httpsCallable<
  { pairId: string },
  PairSummaryResponse
>(functions, 'getPairSummary');

export const decideForUsFn = httpsCallable<
  { pairId: string },
  { restaurant: RestaurantData }
>(functions, 'decideForUs');

// Inline types for callable results
export interface RestaurantData {
  id: string;
  pairId: string;
  placeId?: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  addedBy: string;
  createdAt: string;
}

export interface VoteData {
  id: string;
  restaurantId: string;
  pairId: string;
  userId: string;
  voteType: 'like' | 'love' | 'dislike';
  updatedAt: string;
}

export interface PairSummaryResponse {
  restaurants: RestaurantData[];
  votes: VoteData[];
  mutuals: string[]; // restaurantIds where both users voted like/love
}
