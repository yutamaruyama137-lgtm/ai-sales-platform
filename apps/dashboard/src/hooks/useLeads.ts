import { useState, useEffect, useCallback } from 'react';
import type { Lead } from '@ai-sales/types';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

const PAGE_SIZE = 20;

interface UseLeadsReturn {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
  nextPage: () => void;
  prevPage: () => void;
}

export function useLeads(clientId?: string): UseLeadsReturn {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchLeads = useCallback(async (currentPage: number) => {
    setLoading(true);
    setError(null);

    try {
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('leads')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error: queryError, count } = await query;

      if (queryError) {
        logger.error('Failed to fetch leads', queryError);
        setError('リード一覧の取得に失敗しました');
        return;
      }

      setLeads((data as Lead[]) ?? []);
      setHasMore((count ?? 0) > (currentPage + 1) * PAGE_SIZE);
    } catch (err) {
      logger.error('Unexpected error fetching leads', err);
      setError('予期しないエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void fetchLeads(page);
  }, [fetchLeads, page]);

  const nextPage = () => {
    if (hasMore) setPage((p) => p + 1);
  };

  const prevPage = () => {
    if (page > 0) setPage((p) => p - 1);
  };

  return { leads, loading, error, page, hasMore, nextPage, prevPage };
}
