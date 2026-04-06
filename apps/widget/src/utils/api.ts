import type { ChatRequest, ChatResponse, ClientConfig } from '@ai-sales/types';
import { logger } from './logger';

function buildUrl(apiUrl: string, path: string): string {
  // apiUrl が空の場合は相対パス（開発プロキシ用）
  if (!apiUrl) return path;
  return `${apiUrl.replace(/\/$/, '')}${path}`;
}

export async function chatApi(request: ChatRequest, apiUrl = ''): Promise<ChatResponse> {
  const url = buildUrl(apiUrl, '/api/chat');
  logger.log('POST', url, request);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let message = `HTTP error: ${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // JSON 以外はデフォルトメッセージ
    }
    logger.error('chatApi failed', message);
    throw new Error(message);
  }

  const data = (await response.json()) as ChatResponse;
  logger.log('chatApi response', data);
  return data;
}

export async function leadsApi(
  request: { client_id: string; name: string; email: string; source_page?: string },
  apiUrl = ''
): Promise<void> {
  const url = buildUrl(apiUrl, '/api/leads');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error(`Failed to submit lead: ${response.status}`);
  }
}

export async function fetchClientConfig(
  clientId: string,
  apiUrl = ''
): Promise<ClientConfig | null> {
  try {
    const url = buildUrl(apiUrl, `/api/clients/${clientId}/config`);
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = (await response.json()) as { config: ClientConfig };
    return data.config ?? null;
  } catch {
    return null;
  }
}
