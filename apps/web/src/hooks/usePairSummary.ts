'use client';

import { useState, useCallback } from 'react';
import { getPairSummaryFn, PairSummaryResponse } from '@/lib/firebase';

interface UsePairSummaryResult {
  summary: PairSummaryResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePairSummary(pairId: string | null): UsePairSummaryResult {
  const [summary, setSummary] = useState<PairSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!pairId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await getPairSummaryFn({ pairId });
      setSummary(result.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load pair data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [pairId]);

  return { summary, loading, error, refresh };
}
