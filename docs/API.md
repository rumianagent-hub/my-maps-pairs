# API Reference — MyMaps Pairs

All backend logic lives in Firebase Cloud Functions (callable HTTPS).
Calling convention: `firebase/functions` callable from the client SDK.

---

## Data Schema

### users/{uid}
```typescript
{
  displayName: string;
  email: string;
  photoURL: string;
  activePairId: string | null;
  createdAt: Timestamp;
}
```

### pairs/{pairId}
```typescript
{
  members: string[];     // [uid1, uid2], max 2
  inviteCode: string;    // 6-char uppercase alphanum
  createdAt: Timestamp;
}
```

### restaurants/{restaurantId}
```typescript
{
  pairId: string;
  placeId?: string;      // Google Places ID (if from Places API)
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  addedBy: string;       // uid
  createdAt: Timestamp;
}
```

### votes/{voteId}
```typescript
// voteId format: "{pairId}_{restaurantId}_{userId}"
{
  restaurantId: string;
  pairId: string;
  userId: string;
  voteType: 'like' | 'love' | 'dislike';
  updatedAt: Timestamp;
}
```

### events/{eventId}
```typescript
{
  userId: string | null;
  pairId: string | null;
  eventName: string;
  payload: Record<string, unknown>;
  createdAt: Timestamp;
}
```

---

## Cloud Functions

### `createPair`

Creates a new pair for the authenticated user.

**Request:** `{}` (empty — auth is from Firebase token)

**Response:**
```json
{
  "pairId": "abc123",
  "inviteCode": "XK7M2P"
}
```

**Errors:**
- `unauthenticated` — not signed in
- `already-exists` — user already has an active pair

---

### `joinPair`

Joins an existing pair by invite code.

**Request:**
```json
{ "inviteCode": "XK7M2P" }
```

**Response:**
```json
{ "pairId": "abc123" }
```

**Errors:**
- `unauthenticated` — not signed in
- `invalid-argument` — inviteCode missing
- `not-found` — invite code not found
- `already-exists` — user already in a pair, or they own this pair
- `resource-exhausted` — pair already has 2 members

---

### `addRestaurant`

Adds a restaurant to the pair.

**Request:**
```json
{
  "pairId": "abc123",
  "place": {
    "placeId": "ChIJN1t_...",    // optional
    "name": "Mama's Kitchen",
    "address": "123 Main St",    // optional
    "lat": 43.6532,              // optional
    "lng": -79.3832              // optional
  }
}
```

**Response:**
```json
{ "restaurantId": "def456" }
```

**Notes:**
- If `placeId` already exists in this pair, returns the existing restaurant ID (dedup)

**Errors:**
- `unauthenticated` — not signed in
- `invalid-argument` — pairId or place.name missing
- `not-found` — pairId not found
- `permission-denied` — user not in this pair

---

### `castVote`

Casts or updates a vote for a restaurant.

**Request:**
```json
{
  "restaurantId": "def456",
  "voteType": "love"
}
```

**Response:**
```json
{ "ok": true }
```

**Notes:**
- One vote per user per restaurant (upsert)
- Changing your vote overwrites the previous one

**Errors:**
- `unauthenticated` — not signed in
- `invalid-argument` — restaurantId missing or voteType invalid
- `not-found` — restaurant not found
- `permission-denied` — restaurant belongs to a different pair

---

### `getPairSummary`

Returns all restaurants, all votes, and computed mutual matches.

**Request:**
```json
{ "pairId": "abc123" }
```

**Response:**
```json
{
  "restaurants": [
    {
      "id": "def456",
      "pairId": "abc123",
      "name": "Mama's Kitchen",
      "address": "123 Main St",
      "lat": 43.6532,
      "lng": -79.3832,
      "addedBy": "uid_alice",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "votes": [
    {
      "id": "abc123_def456_uid_alice",
      "restaurantId": "def456",
      "pairId": "abc123",
      "userId": "uid_alice",
      "voteType": "love",
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  ],
  "mutuals": ["def456"]
}
```

**Errors:**
- `unauthenticated` — not signed in
- `invalid-argument` — pairId missing
- `not-found` — pairId not found
- `permission-denied` — user not in this pair

---

### `decideForUs`

Picks a restaurant from mutual matches using weighted random selection.

**Request:**
```json
{ "pairId": "abc123" }
```

**Response:**
```json
{
  "restaurant": {
    "id": "def456",
    "name": "Mama's Kitchen",
    "address": "123 Main St",
    "lat": 43.6532,
    "lng": -79.3832
  }
}
```

**Weighting:**
| Vote combination | Weight |
|-----------------|--------|
| Both love | 4 |
| One love, one like | 2 |
| Both like | 1 |

**Errors:**
- `unauthenticated` — not signed in
- `invalid-argument` — pairId missing
- `not-found` — pairId not found
- `permission-denied` — user not in this pair
- `failed-precondition` — pair has < 2 members, or no mutual matches

---

## Analytics Events

Events logged to the `events` collection:

| eventName | Trigger | Key payload fields |
|-----------|---------|-------------------|
| `user_created` | First sign-in | — |
| `login_google` | Every Google sign-in | — |
| `pair_created` | createPair success | `inviteCode` |
| `pair_joined` | joinPair success | — |
| `restaurant_added` | addRestaurant success | `name` |
| `vote_cast` | castVote success | `restaurantId`, `voteType` |
| `decide_for_us` | decideForUs success | `chosen` (name) |
