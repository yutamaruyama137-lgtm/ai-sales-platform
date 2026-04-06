import { Hono } from 'hono';
import type { ChatRequest, ChatResponse, ApiError, Message, FlowConfig } from '@ai-sales/types';
import { supabase } from '../lib/supabase.js';
import { openai } from '../lib/openai.js';
import { logger } from '../lib/logger.js';
import { createEmbedding } from '../lib/embed.js';

const DEFAULT_SYSTEM_PROMPT =
  'あなたは優秀な営業アシスタントです。お客様のご要望を丁寧にヒアリングし、最適なご提案をします。';

const chat = new Hono();

chat.post('/', async (c) => {
  let body: ChatRequest;

  try {
    body = await c.req.json<ChatRequest>();
  } catch {
    return c.json<ApiError>({ error: 'Invalid JSON body' }, 400);
  }

  const { client_id, conversation_id, message } = body;

  if (!client_id) {
    return c.json<ApiError>({ error: 'client_id is required' }, 400);
  }
  if (!message || message.trim() === '') {
    return c.json<ApiError>({ error: 'message is required and must not be empty' }, 400);
  }

  try {
    // 1. クライアント設定を取得
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, config')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      logger.warn('Client not found', { client_id, error: clientError });
      return c.json<ApiError>({ error: 'Client not found' }, 404);
    }

    const config = client.config as {
      systemPrompt?: string;
      primaryColor?: string;
      headerTitle?: string;
      flowConfig?: FlowConfig;
    };
    const baseSystemPrompt = config?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
    const flowConfig = config?.flowConfig;

    // 2. RAG: ナレッジベースから関連コンテキストを取得
    let ragContext = '';
    try {
      const queryEmbedding = await createEmbedding(message);
      const { data: matches } = await supabase.rpc('match_knowledge', {
        query_embedding: queryEmbedding,
        match_client_id: client_id,
        match_threshold: 0.5,
        match_count: 5,
      });

      if (matches && matches.length > 0) {
        ragContext =
          '\n\n## 参考情報（ナレッジベース）\n' +
          matches
            .map((m: { title: string; content: string }) => `### ${m.title}\n${m.content}`)
            .join('\n\n');
        logger.info('RAG context injected', { matches: matches.length, client_id });
      }
    } catch (ragErr) {
      // RAGエラーは無視してチャットは継続
      logger.warn('RAG search failed, proceeding without context', ragErr);
    }

    // フロー設定がある場合、CTAトリガー指示を注入
    let flowInstruction = '';
    if (flowConfig && flowConfig.ctaType !== 'none') {
      flowInstruction = flowConfig.flowSystemPrompt
        ? `\n\n${flowConfig.flowSystemPrompt}`
        : `\n\n【重要なルール】お客様との会話が十分に進み、お客様が商品・サービスへの関心を示した段階で、ご提案メッセージの末尾に「[SHOW_CTA]」と記載してください。このマーカーはお客様には表示されません。1回のみ使用してください。`;
    }
    const systemPrompt = baseSystemPrompt + flowInstruction + ragContext;

    // 3. 会話を取得または新規作成
    let conversationId: string;
    let existingMessages: Message[] = [];

    if (conversation_id) {
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .select('id, messages')
        .eq('id', conversation_id)
        .eq('client_id', client_id)
        .single();

      if (convError || !conv) {
        logger.warn('Conversation not found', { conversation_id, error: convError });
        return c.json<ApiError>({ error: 'Conversation not found' }, 404);
      }

      conversationId = conv.id as string;
      existingMessages = (conv.messages as Message[]) ?? [];
    } else {
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({ client_id, messages: [] })
        .select('id')
        .single();

      if (createError || !newConv) {
        logger.error('Failed to create conversation', createError);
        return c.json<ApiError>({ error: 'Failed to create conversation' }, 500);
      }

      conversationId = newConv.id as string;
    }

    // 4. OpenAI でチャット応答を生成
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    const openaiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...existingMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
    });

    const rawContent = completion.choices[0]?.message?.content ?? '';

    // [SHOW_CTA] マーカーを検出・除去
    const CTA_MARKER = '[SHOW_CTA]';
    const hasCtaMarker = rawContent.includes(CTA_MARKER);
    const assistantContent = rawContent.replace(CTA_MARKER, '').trim();

    // minMessages チェック（会話が浅すぎる場合はCTAを出さない）
    const minMessages = flowConfig?.minMessages ?? 3;
    const messageCount = existingMessages.filter((m) => m.role === 'user').length;
    const showCta = hasCtaMarker && flowConfig?.ctaType !== 'none' && messageCount >= minMessages - 1;

    const assistantMessage: Message = {
      role: 'assistant',
      content: assistantContent,
      timestamp: new Date().toISOString(),
    };

    // 5. 会話をSupabaseに保存
    const updatedMessages: Message[] = [...existingMessages, userMessage, assistantMessage];

    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        messages: updatedMessages,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    if (updateError) {
      logger.error('Failed to save conversation', updateError);
    }

    // 6. レスポンス返却
    const response: ChatResponse = {
      conversation_id: conversationId,
      message: assistantContent,
      role: 'assistant',
      ...(showCta && flowConfig && {
        show_cta: true,
        cta_config: {
          type: flowConfig.ctaType as 'line' | 'form',
          lineUrl: flowConfig.lineUrl,
          message: flowConfig.ctaMessage,
        },
      }),
    };

    logger.info('Chat response sent', { client_id, conversation_id: conversationId });
    return c.json<ChatResponse>(response);
  } catch (err) {
    logger.error('Chat endpoint error', err);
    return c.json<ApiError>({ error: 'Internal server error' }, 500);
  }
});

export { chat };
