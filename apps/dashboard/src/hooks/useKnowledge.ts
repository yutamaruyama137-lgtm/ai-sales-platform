import { useState, useEffect, useCallback } from 'react';
import type { KnowledgeEntry } from '@ai-sales/types';
import { logger } from '../utils/logger';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface UseKnowledgeReturn {
  entries: KnowledgeEntry[];
  loading: boolean;
  error: string | null;
  addEntry: (title: string, content: string) => Promise<boolean>;
  deleteEntry: (id: string) => Promise<boolean>;
  uploadFile: (file: File) => Promise<{ chunksCreated: number } | null>;
  refetch: () => void;
}

export function useKnowledge(clientId: string): UseKnowledgeReturn {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/knowledge?client_id=${clientId}`);
      if (!res.ok) throw new Error('ナレッジの取得に失敗しました');
      const data = (await res.json()) as KnowledgeEntry[];
      setEntries(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ナレッジ取得エラー';
      logger.error('useKnowledge fetch error', err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  const addEntry = useCallback(
    async (title: string, content: string): Promise<boolean> => {
      try {
        const res = await fetch(`${API_URL}/api/knowledge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: clientId, title, content }),
        });
        if (!res.ok) {
          const err = (await res.json()) as { error?: string };
          throw new Error(err.error || '追加に失敗しました');
        }
        await fetchEntries();
        return true;
      } catch (err) {
        logger.error('addEntry error', err);
        throw err;
      }
    },
    [clientId, fetchEntries]
  );

  const deleteEntry = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const res = await fetch(`${API_URL}/api/knowledge/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('削除に失敗しました');
        await fetchEntries();
        return true;
      } catch (err) {
        logger.error('deleteEntry error', err);
        return false;
      }
    },
    [fetchEntries]
  );

  const uploadFile = useCallback(
    async (file: File): Promise<{ chunksCreated: number } | null> => {
      try {
        const formData = new FormData();
        formData.append('client_id', clientId);
        formData.append('file', file);

        const res = await fetch(`${API_URL}/api/knowledge/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const err = (await res.json()) as { error?: string };
          throw new Error(err.error || 'アップロードに失敗しました');
        }

        const data = (await res.json()) as { chunks_created: number };
        await fetchEntries();
        return { chunksCreated: data.chunks_created };
      } catch (err) {
        logger.error('uploadFile error', err);
        throw err;
      }
    },
    [clientId, fetchEntries]
  );

  return { entries, loading, error, addEntry, deleteEntry, uploadFile, refetch: fetchEntries };
}
