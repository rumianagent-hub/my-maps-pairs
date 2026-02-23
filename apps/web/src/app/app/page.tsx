'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { usePairSummary } from '@/hooks/usePairSummary';
import { AppTab } from '@/types';
import RestaurantList from '@/components/RestaurantList';
import RestaurantSearch from '@/components/RestaurantSearch';
import MapView from '@/components/MapView';
import DecideCard from '@/components/DecideCard';
import StatsPanel from '@/components/StatsPanel';
import SessionManager from '@/components/SessionManager';
import ExploreTab from '@/components/ExploreTab';
import { addRestaurantFn } from '@/lib/firebase';
import { logEvent } from '@/lib/analytics';

const TABS: { id: AppTab; label: string; icon: string }[] = [
  { id: 'list', label: 'List', icon: '📋' },
  { id: 'explore', label: 'Explore', icon: '🧭' },
  { id: 'map', label: 'Map', icon: '🗺️' },
  { id: 'decide', label: 'Decide', icon: '🎯' },
  { id: 'stats', label: 'Stats', icon: '📊' },
  { id: 'session', label: 'Session', icon: '👥' },
];

export default function AppPage() {
  const { user, loading, activePairId, signOut, refreshActivePairId } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AppTab>('list');
  const [showAddModal, setShowAddModal] = useState(false);
  const { summary, loading: summaryLoading, error, refresh } = usePairSummary(activePairId);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!activePairId) router.replace('/pair');
  }, [user, loading, activePairId, router]);

  const handleAddRestaurant = useCallback(
    async (place: { placeId?: string; name: string; address?: string; lat?: number; lng?: number }): Promise<void> => {
      if (!activePairId || !user) return;
      await addRestaurantFn({ pairId: activePairId, place });
      await logEvent(user.uid, activePairId, 'restaurant_added', { name: place.name, source: activeTab });
      setShowAddModal(false);
      await refresh();
    },
    [activePairId, user, activeTab, refresh]
  );

  if (loading) {
    return <div className="h-screen shimmer" />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="glass border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🍽️</span>
          <span className="font-bold gradient-text">MyMaps Pairs</span>
        </div>
        <div className="flex items-center gap-2">
          {user?.photoURL && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoURL} alt={user.displayName ?? 'User'} className="w-8 h-8 rounded-full border border-white/20" />
          )}
          <button onClick={async () => { await signOut(); router.replace('/login'); }} className="text-xs text-[var(--text-secondary)] px-2 py-1 rounded-lg hover:bg-white/5">Sign out</button>
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-20">
        {error && <div className="mx-4 mt-4 card text-red-300">{error}</div>}
        {summaryLoading && !summary && <div className="m-4 h-28 shimmer" />}

        {activeTab === 'list' && (
          <div className="px-4 py-4"><RestaurantList restaurants={summary?.restaurants ?? []} votes={summary?.votes ?? []} mutuals={summary?.mutuals ?? []} userId={user?.uid ?? ''} pairId={activePairId ?? ''} onVote={refresh} /></div>
        )}
        {activeTab === 'explore' && <ExploreTab onAddRestaurant={handleAddRestaurant} />}
        {activeTab === 'map' && <MapView restaurants={summary?.restaurants ?? []} mutuals={summary?.mutuals ?? []} />}
        {activeTab === 'decide' && <div className="px-4 py-4"><DecideCard pairId={activePairId ?? ''} mutuals={summary?.mutuals ?? []} restaurants={summary?.restaurants ?? []} /></div>}
        {activeTab === 'stats' && <div className="px-4 py-4"><StatsPanel restaurants={summary?.restaurants ?? []} votes={summary?.votes ?? []} mutuals={summary?.mutuals ?? []} userId={user?.uid ?? ''} /></div>}
        {activeTab === 'session' && summary && (
          <div className="px-4 py-4"><SessionManager pairId={activePairId ?? ''} inviteCode={summary.inviteCode} members={summary.members} ownerId={summary.ownerId} currentUserId={user?.uid ?? ''} onSessionChanged={async () => { await refreshActivePairId(); router.replace('/pair'); }} /></div>
        )}
      </main>

      {activeTab === 'list' && (
        <button onClick={() => setShowAddModal(true)} className="fixed bottom-20 right-4 w-14 h-14 accent-gradient text-white rounded-full glow-md flex items-center justify-center text-2xl z-20 card-hover">+</button>
      )}

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-[var(--bg-card)] border-t border-white/10 flex z-10 overflow-x-auto">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`min-w-[78px] flex-1 flex flex-col items-center py-3 gap-1 text-xs font-medium ${activeTab === tab.id ? 'text-[var(--accent-light)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
            <span className="text-lg">{tab.icon}</span><span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-30 flex items-end" onClick={() => setShowAddModal(false)}>
          <div className="bg-[var(--bg-card)] w-full max-w-[480px] mx-auto rounded-t-3xl p-6 max-h-[85vh] overflow-auto border border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold">Add a Restaurant</h2><button onClick={() => setShowAddModal(false)} className="text-[var(--text-secondary)] text-2xl leading-none">×</button></div>
            <RestaurantSearch onSelect={handleAddRestaurant} />
          </div>
        </div>
      )}
    </div>
  );
}
