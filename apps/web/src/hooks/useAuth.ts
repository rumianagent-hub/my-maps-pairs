'use client';

import { useState, useEffect } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import { logEvent } from '@/lib/analytics';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePairId, setActivePairId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data();
          setActivePairId(data.activePairId ?? null);
        } else {
          // First sign-in: create user doc
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

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<void> => {
    await signInWithPopup(auth, googleProvider);
  };

  const signOut = async (): Promise<void> => {
    await firebaseSignOut(auth);
  };

  const refreshActivePairId = async (): Promise<void> => {
    if (!user) return;
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
