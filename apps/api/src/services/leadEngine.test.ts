import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendWebhook, sendEmailNotification } from './leadEngine.js';

// fetchのモック
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('sendWebhook', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('正常なWebhook送信が成功する', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

    await expect(
      sendWebhook('https://example.com/webhook', { id: 'lead-1', name: 'テスト太郎' })
    ).resolves.toBeUndefined();

    expect(mockFetch).toHaveBeenCalledWith('https://example.com/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'lead-1', name: 'テスト太郎' }),
    });
  });

  it('HTTPエラー（4xx/5xx）でもthrowしない', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(
      sendWebhook('https://example.com/webhook', { id: 'lead-1' })
    ).resolves.toBeUndefined();
  });

  it('ネットワークエラーでもthrowしない', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      sendWebhook('https://example.com/webhook', { id: 'lead-1' })
    ).resolves.toBeUndefined();
  });
});

describe('sendEmailNotification', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('SMTP未設定の場合はスキップしてthrowしない', async () => {
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_HOST;

    await expect(
      sendEmailNotification('admin@example.com', {
        name: 'テスト太郎',
        email: 'test@example.com',
        phone: '090-1234-5678',
        answers: { q1: 'answer1' },
      })
    ).resolves.toBeUndefined();
  });

  it('SMTP_USER のみ設定でもスキップしてthrowしない', async () => {
    process.env.SMTP_USER = 'user@gmail.com';
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_HOST;

    await expect(
      sendEmailNotification('admin@example.com', { name: 'テスト' })
    ).resolves.toBeUndefined();
  });
});
