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
import { addRestaurantFn } from '@/lib/firebase';
import { logEvent } from '@/lib/analytics';

const TABS: { id: AppTab; label: string; icon: string }[] = [
  { id: 'list', label: 'List', icon: '📋' },
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
    if (!activePairId) {
      router.replace('/pair');
    }
  }, [user, loading, activePairId, router]);

  useEffect(() => {
    if (activePairId) {
      refresh();
    }
  }, [activePairId, refresh]);

  const handleAddRestaurant = useCallback(
    async (place: {
      placeId?: string;
      name: string;
      address?: string;
      lat?: number;
      lng?: number;
    }): Promise<void> => {
      if (!activePairId || !user) return;
      await addRestaurantFn({ pairId: activePairId, place });
      await logEvent(user.uid, activePairId, 'restaurant_added', { name: place.name });
      setShowAddModal(false);
      await refresh();
    },
    [activePairId, user, refresh]
  );

  const handleSignOut = async (): Promise<void> => {
    await signOut();
    router.replace('/login');
  };

  const handleSessionChanged = async (): Promise<void> => {
    await refreshActivePairId();
    router.replace('/pair');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🍽️</span>
          <span className="font-bold text-gray-900">MyMaps Pairs</span>
        </div>
        <div className="flex items-center gap-2">
          {user?.photoURL && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoURL} alt={user.displayName ?? 'User'} className="w-8 h-8 rounded-full" />
          )}
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 px-2 py-1 rounded-lg active:bg-gray-100"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Tab content */}
      <main className="flex-1 overflow-auto pb-20">
        {error && (
          <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {summaryLoading && !summary && (
          <div className="flex justify-center mt-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent" />
          </div>
        )}

        {activeTab === 'list' && (
          <div className="px-4 py-4 space-y-4">
            <RestaurantList
              restaurants={summary?.restaurants ?? []}
              votes={summary?.votes ?? []}
              mutuals={summary?.mutuals ?? []}
              userId={user?.uid ?? ''}
              pairId={activePairId ?? ''}
              onVote={refresh}
            />
          </div>
        )}

        {activeTab === 'map' && (
          <MapView restaurants={summary?.restaurants ?? []} mutuals={summary?.mutuals ?? []} />
        )}

        {activeTab === 'decide' && (
          <div className="px-4 py-4">
            <DecideCard
              pairId={activePairId ?? ''}
              mutuals={summary?.mutuals ?? []}
              restaurants={summary?.restaurants ?? []}
            />
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="px-4 py-4">
            <StatsPanel
              restaurants={summary?.restaurants ?? []}
              votes={summary?.votes ?? []}
              mutuals={summary?.mutuals ?? []}
              userId={user?.uid ?? ''}
            />
          </div>
        )}

        {activeTab === 'session' && summary && (
          <div className="px-4 py-4">
            <SessionManager
              pairId={activePairId ?? ''}
              inviteCode={summary.inviteCode}
              members={summary.members}
              ownerId={summary.ownerId}
              currentUserId={user?.uid ?? ''}
              onSessionChanged={handleSessionChanged}
            />
          </div>
        )}
      </main>

      {/* FAB – add restaurant */}
      {activeTab === 'list' && (
        <button
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-20 right-4 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl z-20 active:bg-primary-700"
        >
          +
        </button>
      )}

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-100 flex z-10">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs font-medium transition-colors ${
              activeTab === tab.id ? 'text-primary-600' : 'text-gray-400 active:text-gray-600'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Add restaurant modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-30 flex items-end" onClick={() => setShowAddModal(false)}>
          <div
            className="bg-white w-full max-w-[480px] mx-auto rounded-t-3xl p-6 max-h-[85vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Add a Restaurant</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 text-2xl leading-none">
                ×
              </button>
            </div>
            <RestaurantSearch onSelect={handleAddRestaurant} />
          </div>
        </div>
      )}
    </div>
  );
}
