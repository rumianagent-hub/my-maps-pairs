'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createPairFn, joinPairFn } from '@/lib/firebase';
import { logEvent } from '@/lib/analytics';

type Mode = 'choose' | 'create' | 'join';

export default function PairPage() {
  const { user, loading, activePairId, refreshActivePairId } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('choose');
  const [inviteCode, setInviteCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPair, setCreatedPair] = useState<{
    pairId: string;
    inviteCode: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (activePairId) { router.replace('/app'); }
  }, [user, loading, activePairId, router]);

  const handleCreatePair = async (): Promise<void> => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const result = await createPairFn({});
      setCreatedPair(result.data);
      await logEvent(user.uid, result.data.pairId, 'pair_created', {});
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create pair');
    } finally {
      setBusy(false);
    }
  };

  const handleJoinPair = async (): Promise<void> => {
    if (!user || !inviteCode.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await joinPairFn({ inviteCode: inviteCode.trim().toUpperCase() });
      await logEvent(user.uid, result.data.pairId, 'pair_joined', {});
      await refreshActivePairId();
      router.replace('/app');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to join pair');
    } finally {
      setBusy(false);
    }
  };

  const handlePairReady = async (): Promise<void> => {
    await refreshActivePairId();
    router.replace('/app');
  };

  const getAppBaseUrl = (): string => {
    if (typeof window !== 'undefined') return window.location.origin;
    return process.env.NEXT_PUBLIC_APP_URL || '';
  };

  const handleCopyLink = async (): Promise<void> => {
    if (!createdPair) return;
    const link = `${getAppBaseUrl()}/join?code=${createdPair.inviteCode}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Check if a code was passed via query string (invite link flow)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      setInviteCode(code);
      setMode('join');
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-6 py-10 flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Your Pair</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Connect with your partner or close friend to start deciding together.
        </p>
      </div>

      {/* Mode: choose */}
      {mode === 'choose' && !createdPair && (
        <div className="space-y-4">
          <button
            className="btn-primary"
            onClick={() => { setMode('create'); handleCreatePair(); }}
            disabled={busy}
          >
            🎉 Create a new pair
          </button>
          <button
            className="btn-secondary"
            onClick={() => setMode('join')}
          >
            🔗 Join with invite code
          </button>
        </div>
      )}

      {/* Mode: create — waiting for result */}
      {mode === 'create' && !createdPair && (
        <div className="flex flex-col items-center justify-center flex-1 gap-4">
          {busy && (
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent" />
          )}
          <p className="text-gray-500">Creating your pair…</p>
        </div>
      )}

      {/* Created: show invite */}
      {createdPair && (
        <div className="space-y-6">
          <div className="card text-center">
            <p className="text-gray-500 text-sm mb-2">Your invite code</p>
            <p className="text-4xl font-bold tracking-widest text-primary-600">
              {createdPair.inviteCode}
            </p>
          </div>

          <div className="card">
            <p className="text-sm text-gray-500 mb-3">
              Share this link with your partner:
            </p>
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700 break-all mb-3">
              {getAppBaseUrl()}/join?code={createdPair.inviteCode}
            </div>
            <button
              className="btn-primary"
              onClick={handleCopyLink}
            >
              {copied ? '✅ Copied!' : '📋 Copy invite link'}
            </button>
          </div>

          <div className="card">
            <p className="text-sm text-gray-600 mb-4">
              Waiting for your partner to join… Once they join, tap the button below.
            </p>
            <button className="btn-primary" onClick={handlePairReady}>
              ✅ We're both in — let's go!
            </button>
          </div>
        </div>
      )}

      {/* Mode: join */}
      {mode === 'join' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter invite code
            </label>
            <input
              type="text"
              className="input-field uppercase tracking-widest text-center text-2xl font-bold"
              placeholder="XXXXXX"
              maxLength={8}
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            />
          </div>
          <button
            className="btn-primary"
            onClick={handleJoinPair}
            disabled={busy || !inviteCode.trim()}
          >
            {busy ? 'Joining…' : '🚀 Join Pair'}
          </button>
          <button
            className="btn-secondary"
            onClick={() => { setMode('choose'); setInviteCode(''); setError(null); }}
          >
            ← Back
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
