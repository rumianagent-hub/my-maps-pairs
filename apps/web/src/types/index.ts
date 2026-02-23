export type VoteType = 'like' | 'love' | 'dislike';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  activePairId: string | null;
  createdAt: string;
}

export interface Pair {
  id: string;
  members: string[];
  inviteCode: string;
  createdAt: string;
}

export interface Restaurant {
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

export interface Vote {
  id: string;
  restaurantId: string;
  pairId: string;
  userId: string;
  voteType: VoteType;
  updatedAt: string;
}

export interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export type AppTab = 'list' | 'explore' | 'map' | 'decide' | 'stats' | 'session';
