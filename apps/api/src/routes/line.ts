import { Hono } from 'hono';
import { createHmac } from 'crypto';
import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';

const line = new Hono();

// LINE Webhook の最小限の型定義
interface LineSource {
  userId: string;
  type: string;
}

interface LineFollowEvent {
  type: 'follow';
  source: LineSource;
  timestamp: number;
}

type LineEvent = LineFollowEvent | { type: string; source?: LineSource };

interface LineWebhookBody {
  destination: string;
  events: LineEvent[];
}

// HMAC-SHA256 署名検証（LINE公式の検証方法）
function verifySignature(rawBody: string, channelSecret: string, signature: string): boolean {
  const hash = createHmac('sha256', channelSecret).update(rawBody).digest('base64');
  return hash === signature;
}

// POST /api/webhooks/line/:client_id
// LINEの管理画面に登録するWebhook URL: https://<api-host>/api/webhooks/line/<client_id>
line.post('/:client_id', async (c) => {
  const clientId = c.req.param('client_id');
  const signature = c.req.header('x-line-signature');

  if (!signature) {
    logger.warn('LINE webhook: missing X-Line-Signature', { clientId });
    return c.json({ error: 'Missing X-Line-Signature' }, 400);
  }

  // 署名検証のために raw body をテキストで取得
  const rawBody = await c.req.text();

  // クライアント設定を取得
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('config')
    .eq('id', clientId)
    .single();

  if (clientError || !client) {
    logger.warn('LINE webhook: client not found', { clientId });
    return c.json({ error: 'Client not found' }, 404);
  }

  const config = client.config as {
    lineChannelSecret?: string;
    lineChannelAccessToken?: string;
  };

  if (!config.lineChannelSecret) {
    logger.warn('LINE webhook: lineChannelSecret not configured', { clientId });
    return c.json({ error: 'LINE not configured for this client' }, 400);
  }

  // 署名検証
  if (!verifySignature(rawBody, config.lineChannelSecret, signature)) {
    logger.warn('LINE webhook: invalid signature', { clientId });
    return c.json({ error: 'Invalid signature' }, 401);
  }

  let body: LineWebhookBody;
  try {
    body = JSON.parse(rawBody) as LineWebhookBody;
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  // 200を先に返してからイベントを非同期処理（LINEは応答速度を要求するため）
  c.executionCtx?.waitUntil(processEvents(clientId, body.events));

  void processEvents(clientId, body.events);

  return c.json({ status: 'ok' });
});

async function processEvents(clientId: string, events: LineEvent[]): Promise<void> {
  for (const event of events) {
    try {
      if (event.type === 'follow') {
        const lineUserId = (event as LineFollowEvent).source.userId;
        const { error } = await supabase.from('leads').insert({
          client_id: clientId,
          name: null,
          email: null,
          phone: null,
          answers: { line_user_id: lineUserId, source: 'line_follow' },
          source_page: 'LINE友だち追加',
        });
        if (error) {
          logger.error('LINE webhook: failed to save lead', { clientId, lineUserId, error });
        } else {
          logger.info('LINE follow → lead saved', { clientId, lineUserId });
        }
      }
      // unfollow / message 等は現時点では無視（200だけ返せばOK）
    } catch (err) {
      logger.error('LINE webhook: event processing error', err);
    }
  }
}

export { line };
