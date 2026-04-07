import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { chat } from './routes/chat.js';
import { leads } from './routes/leads.js';
import { knowledge } from './routes/knowledge.js';
import { clients } from './routes/clients.js';
import { line } from './routes/line.js';
import { logger } from './lib/logger.js';

const app = new Hono();

// CORSミドルウェア
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 86400,
  })
);

// ヘルスチェック
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ルーター登録
app.route('/api/chat', chat);
app.route('/api/leads', leads);
app.route('/api/knowledge', knowledge);
app.route('/api/clients', clients);
app.route('/api/webhooks/line', line);

// 404ハンドラー
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// エラーハンドラー
app.onError((err, c) => {
  logger.error('Unhandled error', err);
  return c.json({ error: 'Internal server error' }, 500);
});

// サーバー起動
const port = Number(process.env.PORT ?? 3000);

serve(
  {
    fetch: app.fetch,
    port,
  },
  () => {
    logger.info(`API server running on http://localhost:${port}`);
  }
);

export default app;
