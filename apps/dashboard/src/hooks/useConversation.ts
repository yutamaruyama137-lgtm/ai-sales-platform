import { useState, useEffect } from 'react';
import type { Conversation } from '@ai-sales/types';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

interface UseConversationReturn {
  conversation: Conversation | null;
  loading: boolean;
}

export function useConversation(leadId: string | null): UseConversationReturn {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!leadId) {
      setConversation(null);
      return;
    }

    setLoading(true);
    setConversation(null);

    supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data, error }) => {
        if (error) {
          if (error.code !== 'PGRST116') {
            logger.error('Failed to fetch conversation', error);
          }
          setConversation(null);
        } else {
          setConversation(data as Conversation);
        }
        setLoading(false);
      });
  }, [leadId]);

  return { conversation, loading };
}
