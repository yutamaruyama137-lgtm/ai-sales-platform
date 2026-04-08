import { useState, useEffect, useCallback } from 'react';
import type { Client, ClientConfig } from '@ai-sales/types';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

interface UseClientsReturn {
  clients: Client[];
  loading: boolean;
  error: string | null;
  createClient: (name: string, domain?: string) => Promise<Client | null>;
  updateClient: (id: string, name: string, domain: string, config: ClientConfig) => Promise<boolean>;
  refetch: () => void;
}

export function useClients(): UseClientsReturn {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('id, name, domain, config, created_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setClients((data as Client[]) ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'クライアント取得に失敗しました';
      logger.error('useClients fetchClients error', err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchClients();
  }, [fetchClients]);

  const createClient = useCallback(
    async (name: string, domain?: string): Promise<Client | null> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error: insertError } = await supabase
          .from('clients')
          .insert({ name, domain: domain || null, config: {}, owner_id: user.id })
          .select('id, name, domain, config, created_at')
          .single();

        if (insertError || !data) throw insertError;
        await fetchClients();
        return data as Client;
      } catch (err) {
        logger.error('createClient error', err);
        return null;
      }
    },
    [fetchClients]
  );

  const updateClient = useCallback(
    async (id: string, name: string, domain: string, config: ClientConfig): Promise<boolean> => {
      try {
        const { error: updateError } = await supabase
          .from('clients')
          .update({ name, domain: domain || null, config })
          .eq('id', id);

        if (updateError) throw updateError;
        await fetchClients();
        return true;
      } catch (err) {
        logger.error('updateClient error', err);
        return false;
      }
    },
    [fetchClients]
  );

  return { clients, loading, error, createClient, updateClient, refetch: fetchClients };
}
