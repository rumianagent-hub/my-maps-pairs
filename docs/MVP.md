# MVP Scope — MyMaps Pairs

## Vision

**MyMaps Pairs** is a restaurant decision app for couples and close friends.
It solves the classic problem: "Where should we eat?" by letting both people
vote privately and revealing matches — then picking a winner when you're ready.

---

## UX Flows

### Flow 1: Sign Up & Pair Creation

```
User opens app
  → /login (Google sign-in)
  → /pair (create or join)
    → Create: generates invite code + shareable link
    → Share link with partner
    → Partner opens link → pre-filled code → joins pair
    → Both land on /app
```

### Flow 2: Adding Restaurants

```
User on /app (List tab)
  → Taps + FAB
  → RestaurantSearch modal opens
    → Option A: Google Places autocomplete
    → Option B: Manual entry (name + address)
  → Restaurant added to shared pair list
  → Modal closes, list refreshes
```

### Flow 3: Voting

```
User sees restaurant in List tab
  → Taps 😍 / 👍 / 👎
  → Vote saved immediately
  → Partner's votes shown (emoji indicator)
  → Mutual matches highlighted with ❤️ badge + sorted to top
```

### Flow 4: Decide

```
User on /app (Decide tab)
  → Sees count of mutual matches
  → Taps "Decide For Us!"
  → Suspense animation (dice rolling)
  → Winner revealed with restaurant name + address
  → Link to Google Maps
  → Can re-pick or go back
```

### Flow 5: Stats

```
User on /app (Stats tab)
  → Total restaurants, mutual matches, match rate
  → Their personal vote breakdown (love/like/dislike)
  → Partner's voting activity count
  → Most loved restaurant (highest love vote count)
```

---

## Feature Scope

### ✅ In MVP
- Google sign-in
- Create pair + invite link + join by code
- Add restaurant via Google Places or manual entry
- Vote: like / love / dislike per user
- Mutual match detection (both users voted like or love)
- Matches highlighted + sorted to top of list
- "Decide for us" weighted random from mutuals
- Map view with markers (mutual = red, unmatched = grey)
- Basic stats panel
- Analytics event logging (Firestore)

### ❌ Not in MVP
- Push notifications ("your partner voted!")
- Comments/notes on restaurants
- Visited / tried markers
- Multiple pairs per user
- Photo uploads
- Cuisine filtering
- Price range filter
- Leaving a pair
- Pair history / archiving
- Native mobile app

---

## Data Model

See [API.md](./API.md) for full schema.

---

## Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Frontend | Next.js 14 App Router | Modern React, great DX |
| Styling | Tailwind CSS | Rapid mobile-first UI |
| Auth | Firebase Auth (Google) | Zero-friction sign-in |
| Database | Firestore | Real-time, pairs well with Functions |
| Backend | Cloud Functions (callable) | Auth baked in, type-safe |
| Maps | Google Maps JS + Places | Best restaurant data |
| Max pair size | 2 | Couples/friends; keeps matching simple |

---

## Mutual Match Algorithm

A restaurant is a **mutual match** when:
- **both** pair members have voted
- **both** voted either `like` OR `love` (not `dislike`)

### "Decide For Us" Weighting

| Both voted | Weight |
|------------|--------|
| love + love | 4 |
| love + like | 2 |
| like + like | 1 |

Weighted random selection ensures "loved-by-both" places win more often.
