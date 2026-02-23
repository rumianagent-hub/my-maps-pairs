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
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Pair session</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1">ID: {pairId}</p>
      </div>

      <div className="bg-[var(--bg-elevated)] border border-white/5 rounded-2xl p-4">
        <p className="text-xs text-[var(--text-secondary)] mb-1">Invite code</p>
        <p className="text-2xl font-bold tracking-widest text-[var(--accent-light)] mb-2">{inviteCode || '—'}</p>
        <p className="text-xs text-[var(--text-secondary)] break-all mb-3">{inviteLink}</p>
        <button onClick={handleCopy} className="btn-primary w-full py-2 px-4 rounded-xl text-sm">
          {copied ? '✅ Copied' : '📋 Copy invite link'}
        </button>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">Members ({members.length})</h3>
        <div className="space-y-2">
          {members.map((member) => (
            <div key={member.uid} className="flex items-center gap-3 bg-[var(--bg-elevated)] border border-white/5 rounded-xl p-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {member.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={member.photoURL} alt={member.displayName} className="w-9 h-9 rounded-full flex-shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[var(--accent)]/20 text-[var(--accent-light)] text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {initials(member.displayName)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm text-[var(--text-primary)] truncate font-medium">{member.displayName || member.email || 'Member'}</p>
                  {member.email && <p className="text-xs text-[var(--text-secondary)] truncate">{member.email}</p>}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {member.uid === ownerId && (
                  <span className="text-xs bg-[var(--accent)]/20 text-[var(--accent-light)] px-2 py-0.5 rounded-full font-semibold">Host</span>
                )}
                {member.uid === currentUserId && (
                  <span className="text-xs bg-white/5 text-[var(--text-secondary)] px-2 py-0.5 rounded-full font-semibold">You</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-white/5">
        {isOwner ? (
          <button
            onClick={handleDelete}
            disabled={busy !== null}
            className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-sm font-medium disabled:opacity-60"
          >
            {busy === 'delete' ? 'Ending pair…' : '🗑️ End pair for everyone'}
          </button>
        ) : (
          <button
            onClick={handleLeave}
            disabled={busy !== null}
            className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-[var(--text-secondary)] hover:bg-white/10 transition-all text-sm font-medium disabled:opacity-60"
          >
            {busy === 'leave' ? 'Leaving…' : '👋 Leave this pair'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </section>
  );
}
