'use client';

import { useMemo, useState } from 'react';
import { deletePairFn, leavePairFn, PairMemberData } from '@/lib/firebase';

interface SessionManagerProps {
  pairId: string;
  inviteCode: string;
  members: PairMemberData[];
  ownerId: string;
  currentUserId: string;
  onSessionChanged: () => Promise<void>;
}

export default function SessionManager({
  pairId,
  inviteCode,
  members,
  ownerId,
  currentUserId,
  onSessionChanged,
}: SessionManagerProps) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<null | 'leave' | 'delete'>(null);
  const [error, setError] = useState<string | null>(null);

  const isOwner = currentUserId === ownerId;

  const inviteLink = useMemo(() => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/join?code=${inviteCode}`;
    }
    const base = process.env.NEXT_PUBLIC_APP_URL ?? '';
    return `${base}/join?code=${inviteCode}`;
  }, [inviteCode]);

  const handleCopy = async (): Promise<void> => {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleLeave = async (): Promise<void> => {
    const confirmed = window.confirm('Leave this pair? You can rejoin with an invite code later.');
    if (!confirmed) return;

    setBusy('leave');
    setError(null);
    try {
      await leavePairFn();
      await onSessionChanged();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to leave pair.');
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (): Promise<void> => {
    const confirmed = window.confirm(
      'End this pair for everyone? This removes restaurants, votes, and the session permanently.'
    );
    if (!confirmed) return;

    setBusy('delete');
    setError(null);
    try {
      await deletePairFn();
      await onSessionChanged();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to end pair.');
    } finally {
      setBusy(null);
    }
  };

  const initials = (name: string): string => {
    const parts = name.split(' ').filter(Boolean);
    if (!parts.length) return '?';
    return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
  };

  return (
    <section className="card space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Pair session</h2>
        <p className="text-xs text-gray-500 mt-1">ID: {pairId}</p>
      </div>

      <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
        <p className="text-xs text-gray-500">Invite code</p>
        <p className="text-2xl font-bold tracking-widest text-primary-600">{inviteCode || '—'}</p>
        <p className="text-xs text-gray-500 mt-2 break-all">{inviteLink}</p>
        <button onClick={handleCopy} className="btn-secondary mt-3 text-sm">
          {copied ? '✅ Copied' : '📋 Copy invite link'}
        </button>
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-800 mb-2">Members ({members.length})</p>
        <div className="space-y-2">
          {members.map((member) => (
            <div key={member.uid} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                {member.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={member.photoURL} alt={member.displayName} className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
                    {initials(member.displayName)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm text-gray-900 truncate">{member.displayName || member.email || 'Member'}</p>
                  {member.email && <p className="text-xs text-gray-500 truncate">{member.email}</p>}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {member.uid === ownerId && (
                  <span className="text-[11px] font-semibold bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">Host</span>
                )}
                {member.uid === currentUserId && (
                  <span className="text-[11px] font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">You</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-gray-100">
        {isOwner ? (
          <button
            onClick={handleDelete}
            disabled={busy !== null}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-50 text-red-700 border border-red-200 disabled:opacity-60"
          >
            {busy === 'delete' ? 'Ending pair…' : '🧨 End pair for everyone'}
          </button>
        ) : (
          <button
            onClick={handleLeave}
            disabled={busy !== null}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-50 text-amber-800 border border-amber-200 disabled:opacity-60"
          >
            {busy === 'leave' ? 'Leaving…' : '👋 Leave this pair'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
    </section>
  );
}
