'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { joinPairFn } from '@/lib/firebase';

type JoinStatus = 'loading' | 'success' | 'error';

export default function JoinPage() {
  const { user, loading, activePairId, refreshActivePairId } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<JoinStatus>('loading');
  const [message, setMessage] = useState('Joining session...');

  useEffect(() => {
    if (loading) return;

    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('code')?.trim().toUpperCase();

    if (!inviteCode) {
      setStatus('error');
      setMessage('Invite code is missing. Ask your partner for a valid invite link.');
      return;
    }

    if (!user) {
      window.sessionStorage.setItem('post_login_redirect', `/join?code=${encodeURIComponent(inviteCode)}`);
      router.replace('/login');
      return;
    }

    if (activePairId) {
      setStatus('success');
      setMessage('You are already in a pair. Redirecting to your app...');
      setTimeout(() => router.replace('/app'), 800);
      return;
    }

    let cancelled = false;

    const runJoin = async () => {
      try {
        await joinPairFn({ inviteCode });
        await refreshActivePairId();
        if (cancelled) return;
        setStatus('success');
        setMessage('Success! You joined the session. Redirecting...');
        setTimeout(() => router.replace('/app'), 800);
      } catch (err: unknown) {
        if (cancelled) return;
        const rawMessage = err instanceof Error ? err.message : 'Failed to join this invite.';
        const normalized = rawMessage.toLowerCase();
        if (normalized.includes('already') && normalized.includes('pair')) {
          setMessage('You are already in a pair. Open your app to continue.');
        } else if (normalized.includes('invalid') || normalized.includes('not found')) {
          setMessage('This invite code is invalid or expired. Ask for a fresh link.');
        } else if (normalized.includes('used')) {
          setMessage('This invite code has already been used. Ask for a new invite link.');
        } else {
          setMessage(rawMessage);
        }
        setStatus('error');
      }
    };

    runJoin();

    return () => {
      cancelled = true;
    };
  }, [loading, user, activePairId, refreshActivePairId, router]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-[var(--bg-elevated)] border border-white/10 rounded-2xl p-6 text-center">
        {status === 'loading' && (
          <div className="mx-auto mb-4 animate-spin rounded-full h-10 w-10 border-4 border-[var(--accent)] border-t-transparent" />
        )}

        <h1 className="text-lg font-bold text-[var(--text-primary)]">
          {status === 'loading' ? 'Joining session...' : status === 'success' ? 'Joined!' : 'Could not join'}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{message}</p>

        {status === 'error' && (
          <div className="mt-5 space-y-2">
            <button className="btn-primary" onClick={() => router.replace('/pair')}>
              Go to Pair Setup
            </button>
            <button
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              onClick={() => router.replace('/app')}
            >
              Open App
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
