import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chatApi } from './api';

// fetch をモック
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// import.meta.env をモック
vi.mock('./logger', () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('chatApi', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('正常レスポンスを返す', async () => {
    const mockResponse = {
      conversation_id: 'conv-123',
      message: 'こんにちは！',
      role: 'assistant' as const,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await chatApi({
      client_id: 'client-001',
      message: 'こんにちは',
    });

    expect(result).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/chat'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: 'client-001', message: 'こんにちは' }),
      })
    );
  });

  it('HTTPエラー時にエラーメッセージをthrowする', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ error: 'サーバーエラーが発生しました' }),
    });

    await expect(
      chatApi({ client_id: 'client-001', message: 'test' })
    ).rejects.toThrow('サーバーエラーが発生しました');
  });

  it('HTTPエラー時にJSONでない場合はステータスメッセージをthrowする', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: async () => {
        throw new SyntaxError('JSON parse error');
      },
    });

    await expect(
      chatApi({ client_id: 'client-001', message: 'test' })
    ).rejects.toThrow('HTTP error: 503 Service Unavailable');
  });

  it('404エラー時にAPIエラーメッセージをthrowする', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ error: 'エンドポイントが見つかりません' }),
    });

    await expect(
      chatApi({ client_id: 'client-001', message: 'test' })
    ).rejects.toThrow('エンドポイントが見つかりません');
  });

  it('conversation_idを含むリクエストを送信できる', async () => {
    const mockResponse = {
      conversation_id: 'conv-456',
      message: '続きのメッセージ',
      role: 'assistant' as const,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    await chatApi({
      client_id: 'client-001',
      conversation_id: 'conv-456',
      message: '続きの質問',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/chat'),
      expect.objectContaining({
        body: JSON.stringify({
          client_id: 'client-001',
          conversation_id: 'conv-456',
          message: '続きの質問',
        }),
      })
    );
  });
});
