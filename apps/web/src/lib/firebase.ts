'use client';

// Types re-exported for use in other files
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

export interface PairMemberData {
  uid: string;
  displayName: string;
  photoURL?: string;
  email?: string;
}

export interface PairSummaryResponse {
  restaurants: RestaurantData[];
  votes: VoteData[];
  mutuals: string[];
  inviteCode: string;
  ownerId: string;
  members: PairMemberData[];
}

// Lazy-load all Firebase modules to prevent server-side execution.
// Firebase SDK uses protobufjs which calls `new Function()` — banned in CF Workers.

let _initialized = false;
let _app: any = null;
let _auth: any = null;
let _db: any = null;
let _functions: any = null;
let _googleProvider: any = null;

async function ensureInitialized() {
  if (_initialized) return;
  if (typeof window === 'undefined') return;
  _initialized = true;

  const [appMod, authMod, firestoreMod, functionsMod] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
    import('firebase/functions'),
  ]);

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  _app = appMod.getApps().length > 0 ? appMod.getApp() : appMod.initializeApp(firebaseConfig);
  _auth = authMod.getAuth(_app);
  _db = firestoreMod.getFirestore(_app);
  _functions = functionsMod.getFunctions(_app, 'us-central1');
  _googleProvider = new authMod.GoogleAuthProvider();

  if (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_USE_EMULATORS === 'true'
  ) {
    authMod.connectAuthEmulator(_auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    firestoreMod.connectFirestoreEmulator(_db, '127.0.0.1', 8080);
    functionsMod.connectFunctionsEmulator(_functions, '127.0.0.1', 5001);
  }
}

// Getters that lazily initialize
export async function getAuth() { await ensureInitialized(); return _auth; }
export async function getDb() { await ensureInitialized(); return _db; }
export async function getFunctions() { await ensureInitialized(); return _functions; }
export async function getGoogleProvider() { await ensureInitialized(); return _googleProvider; }

// Callable function wrappers
export async function createPairFn(data?: any): Promise<{ data: { pairId: string; inviteCode: string } }> {
  await ensureInitialized();
  const { httpsCallable } = await import('firebase/functions');
  return httpsCallable(_functions, 'createPair')(data) as any;
}

export async function joinPairFn(data: { inviteCode: string }): Promise<{ data: { pairId: string } }> {
  await ensureInitialized();
  const { httpsCallable } = await import('firebase/functions');
  return httpsCallable(_functions, 'joinPair')(data) as any;
}

export async function leavePairFn(): Promise<{ data: { ok: boolean } }> {
  await ensureInitialized();
  const { httpsCallable } = await import('firebase/functions');
  return httpsCallable(_functions, 'leavePair')({}) as any;
}

export async function deletePairFn(): Promise<{ data: { ok: boolean } }> {
  await ensureInitialized();
  const { httpsCallable } = await import('firebase/functions');
  return httpsCallable(_functions, 'deletePair')({}) as any;
}

export async function addRestaurantFn(data: any): Promise<{ data: { restaurantId: string } }> {
  await ensureInitialized();
  const { httpsCallable } = await import('firebase/functions');
  return httpsCallable(_functions, 'addRestaurant')(data) as any;
}

export async function castVoteFn(data: { restaurantId: string; voteType: 'like' | 'love' | 'dislike' }): Promise<{ data: { ok: boolean } }> {
  await ensureInitialized();
  const { httpsCallable } = await import('firebase/functions');
  return httpsCallable(_functions, 'castVote')(data) as any;
}

export async function getPairSummaryFn(data: { pairId: string }): Promise<{ data: PairSummaryResponse }> {
  await ensureInitialized();
  const { httpsCallable } = await import('firebase/functions');
  return httpsCallable(_functions, 'getPairSummary')(data) as any;
}

export async function decideForUsFn(data: { pairId: string }): Promise<{ data: { restaurant: RestaurantData } }> {
  await ensureInitialized();
  const { httpsCallable } = await import('firebase/functions');
  return httpsCallable(_functions, 'decideForUs')(data) as any;
}
