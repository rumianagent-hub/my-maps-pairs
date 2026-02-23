'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { logEvent } from '@/lib/analytics';
import { getAuth } from '@/lib/firebase';

export default function LoginPage() {
  const { user, loading, activePairId, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace(activePairId ? '/app' : '/pair');
    }
  }, [user, loading, activePairId, router]);

  const handleSignIn = async (): Promise<void> => {
    setSigningIn(true);
    setError(null);
    try {
      await signInWithGoogle();
      const auth = await getAuth();
      const uid = auth?.currentUser?.uid;
      if (uid) {
        await logEvent(uid, null, 'login_google', {});
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed';
      setError(msg);
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-white">
      {/* Logo / Hero */}
      <div className="mb-10 text-center">
        <div className="text-6xl mb-4">🍽️</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">MyMaps Pairs</h1>
        <p className="text-gray-500 text-base leading-relaxed">
          Decide where to eat together.
          <br />
          No more "I don't mind, you pick."
        </p>
      </div>

      {/* Features list */}
      <div className="w-full mb-10 space-y-3">
        {[
          { icon: '💑', text: 'Create a pair with your partner or friend' },
          { icon: '📍', text: 'Add restaurants you both want to try' },
          { icon: '❤️', text: 'Vote like, love, or dislike in secret' },
          { icon: '🎯', text: 'Get matched on mutual favourites' },
        ].map((feature) => (
          <div key={feature.text} className="flex items-center gap-3">
            <span className="text-2xl">{feature.icon}</span>
            <span className="text-gray-700">{feature.text}</span>
          </div>
        ))}
      </div>

      {/* Sign-in button */}
      <button
        onClick={handleSignIn}
        disabled={signingIn}
        className="flex items-center justify-center gap-3 w-full bg-white border border-gray-300 rounded-xl py-3 px-6 font-semibold text-gray-700 shadow-sm active:bg-gray-50 transition-colors disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        {signingIn ? 'Signing in…' : 'Continue with Google'}
      </button>

      {error && (
        <p className="mt-4 text-red-600 text-sm text-center">{error}</p>
      )}

      <p className="mt-8 text-xs text-gray-400 text-center">
        By signing in, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
