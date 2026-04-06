import { useState, useCallback, useEffect } from 'react';
import type { Message, ClientConfig, CtaConfig } from '@ai-sales/types';
import { chatApi, fetchClientConfig } from '../utils/api';
import { logger } from '../utils/logger';

interface UseChatOptions {
  clientId: string;
  apiUrl: string;
}

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  config: ClientConfig | null;
  showCta: boolean;
  ctaConfig: CtaConfig | null;
  sendMessage: (text: string) => Promise<void>;
}

export function useChat({ clientId, apiUrl }: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [config, setConfig] = useState<ClientConfig | null>(null);
  const [showCta, setShowCta] = useState(false);
  const [ctaConfig, setCtaConfig] = useState<CtaConfig | null>(null);

  // クライアント設定を初期取得（ウェルカムメッセージ・カラー等）
  useEffect(() => {
    if (!clientId) return;
    fetchClientConfig(clientId, apiUrl)
      .then((cfg) => setConfig(cfg))
      .catch((err) => logger.warn('Failed to fetch client config', err));
  }, [clientId, apiUrl]);

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      if (!text.trim()) return;

      const userMessage: Message = {
        role: 'user',
        content: text.trim(),
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      try {
        const response = await chatApi(
          {
            client_id: clientId,
            conversation_id: conversationId,
            message: text.trim(),
          },
          apiUrl
        );

        setConversationId(response.conversation_id);

        if (response.show_cta && response.cta_config) {
          setShowCta(true);
          setCtaConfig(response.cta_config);
        }

        const assistantMessage: Message = {
          role: 'assistant',
          content: response.message,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'メッセージの送信に失敗しました';
        logger.error('sendMessage error', err);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [clientId, apiUrl, conversationId]
  );

  return { messages, isLoading, error, config, showCta, ctaConfig, sendMessage };
}
