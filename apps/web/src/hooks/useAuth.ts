'use client';

import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { logEvent } from '@/lib/analytics';
import { getAuth, getDb, getGoogleProvider } from '@/lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePairId, setActivePairId] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    (async () => {
      const auth = await getAuth();
      const db = await getDb();
      if (!auth || !db) return;

      const { onAuthStateChanged } = await import('firebase/auth');
      const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        setUser(firebaseUser);

        if (firebaseUser) {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const snap = await getDoc(userRef);

          if (snap.exists()) {
            const data = snap.data();
            setActivePairId(data.activePairId ?? null);
          } else {
            await setDoc(userRef, {
              displayName: firebaseUser.displayName ?? '',
              email: firebaseUser.email ?? '',
              photoURL: firebaseUser.photoURL ?? '',
              activePairId: null,
              createdAt: serverTimestamp(),
            });
            setActivePairId(null);
            await logEvent(firebaseUser.uid, null, 'user_created', {});
          }
        } else {
          setActivePairId(null);
        }

        setLoading(false);
      });
    })();

    return () => { unsubscribe?.(); };
  }, []);

  const signInWithGoogle = async (): Promise<void> => {
    const auth = await getAuth();
    const googleProvider = await getGoogleProvider();
    const { signInWithPopup } = await import('firebase/auth');
    await signInWithPopup(auth, googleProvider);
  };

  const signOut = async (): Promise<void> => {
    const auth = await getAuth();
    const { signOut: firebaseSignOut } = await import('firebase/auth');
    await firebaseSignOut(auth);
  };

  const refreshActivePairId = async (): Promise<void> => {
    if (!user) return;
    const db = await getDb();
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists()) {
      setActivePairId(snap.data().activePairId ?? null);
    }
  };

  return {
    user,
    loading,
    activePairId,
    signInWithGoogle,
    signOut,
    refreshActivePairId,
  };
}
