# Setup Guide — MyMaps Pairs

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 20 | https://nodejs.org |
| npm | ≥ 10 | Bundled with Node |
| Firebase CLI | latest | `npm i -g firebase-tools` |
| Git | any | https://git-scm.com |

---

## 1. Firebase Project Setup

### 1.1 Create a Firebase project

1. Go to https://console.firebase.google.com
2. Click **Add project**
3. Enter a project name (e.g. `my-maps-pairs`)
4. Enable Google Analytics (optional)
5. Click **Create project**

### 1.2 Enable Authentication

1. In Firebase Console → **Authentication** → **Sign-in method**
2. Enable **Google**
3. Add your domain to Authorized domains (localhost is allowed by default)

### 1.3 Enable Firestore

1. Firebase Console → **Firestore Database** → **Create database**
2. Choose **Start in production mode**
3. Select a region (e.g. `us-central1`)

### 1.4 Register a Web App

1. Firebase Console → Project Settings → **Your apps** → Add app → Web
2. Copy the config object — you'll need it for `.env.local`

### 1.5 Google Maps API Key

1. Go to https://console.cloud.google.com
2. Enable these APIs for your project:
   - Maps JavaScript API
   - Places API
3. Create an API key (restrict it to your domain in production)

---

## 2. Local Development Setup

### 2.1 Clone and install

```bash
git clone <your-repo-url>
cd my-maps-pairs
npm install
```

### 2.2 Configure environment

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Edit `apps/web/.env.local` with your Firebase config and Google Maps API key.

### 2.3 Run the Next.js app

```bash
npm run dev
# App runs at http://localhost:3000
```

---

## 3. Firebase Emulators (Recommended for Development)

Running emulators lets you develop without touching production Firebase.

### 3.1 Login to Firebase CLI

```bash
firebase login
firebase use --add    # select your project
```

### 3.2 Build Cloud Functions

```bash
cd firebase/functions
npm install
npm run build
cd ../..
```

### 3.3 Start emulators

```bash
# From repo root
cd firebase
firebase emulators:start
```

Emulator ports:
- Auth: http://localhost:9099
- Firestore: http://localhost:8080
- Functions: http://localhost:5001
- Emulator UI: http://localhost:4000

### 3.4 Enable emulators in Next.js

Add to `apps/web/.env.local`:
```
NEXT_PUBLIC_USE_EMULATORS=true
```

Then run the Next.js dev server normally:
```bash
npm run dev
```

---

## 4. Deploy to Production

### 4.1 Build the web app

```bash
cd apps/web
npm run build
cd ../..
```

### 4.2 Deploy Firestore rules + indexes

```bash
cd firebase
firebase deploy --only firestore
```

### 4.3 Deploy Cloud Functions

```bash
cd firebase
firebase deploy --only functions
```

### 4.4 Deploy everything

```bash
cd firebase
firebase deploy
```

---

## 5. Project Structure

```
my-maps-pairs/
├── apps/
│   └── web/                    # Next.js 14 app
│       ├── src/
│       │   ├── app/            # App Router pages
│       │   ├── components/     # React components
│       │   ├── hooks/          # Custom React hooks
│       │   ├── lib/            # Firebase client, analytics
│       │   └── types/          # Shared TypeScript types
│       ├── .env.local.example
│       └── package.json
├── firebase/
│   ├── functions/
│   │   └── src/               # Cloud Functions
│   ├── firestore.rules
│   ├── firestore.indexes.json
│   └── .env.example
├── docs/
├── firebase.json
└── package.json
```

---

## 6. Development Tips

- Use the **Emulator UI** at http://localhost:4000 to inspect Firestore data
- Cloud Functions auto-reload with `npm run build:watch` in `firebase/functions`
- The app works without Google Maps (falls back to manual restaurant entry)
- Firestore rules are strict — all writes go through Cloud Functions
