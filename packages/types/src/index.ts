// ============================================================
// Client（契約企業）
// ============================================================
export interface Client {
  id: string;
  name: string;
  domain: string | null;
  config: ClientConfig;
  created_at: string;
}

export interface FlowConfig {
  ctaType: 'line' | 'form' | 'none';
  lineUrl?: string;
  ctaMessage?: string;
  minMessages?: number;
  flowSystemPrompt?: string;
}

export interface ClientConfig {
  systemPrompt?: string;
  welcomeMessage?: string;
  webhookUrl?: string;
  notificationEmail?: string;
  // ウィジェット外観設定
  primaryColor?: string;    // デフォルト: #2563eb
  buttonText?: string;      // デフォルト: 💬
  headerTitle?: string;     // デフォルト: AIアシスタント
  position?: 'bottom-right' | 'bottom-left';
  // フローボット設定
  flowConfig?: FlowConfig;
  // LINE Messaging API（クライアントごとに設定）
  lineChannelAccessToken?: string;
  lineChannelSecret?: string;
}

// ============================================================
// Lead（見込み客）
// ============================================================
export interface Lead {
  id: string;
  client_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  answers: Record<string, string>;
  source_page: string | null;
  created_at: string;
}

export interface CreateLeadInput {
  client_id: string;
  name?: string;
  email?: string;
  phone?: string;
  answers?: Record<string, string>;
  source_page?: string;
}

// ============================================================
// Conversation（会話）
// ============================================================
export interface Conversation {
  id: string;
  client_id: string;
  lead_id: string | null;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

// ============================================================
// KnowledgeEntry（RAGナレッジ）
// ============================================================
export interface KnowledgeEntry {
  id: string;
  client_id: string;
  title: string;
  content: string;
  source_type: 'manual' | 'file';
  source_name: string | null;
  created_at: string;
}

// ============================================================
// API リクエスト / レスポンス
// ============================================================
export interface ChatRequest {
  client_id: string;
  conversation_id?: string;
  message: string;
}

export interface CtaConfig {
  type: 'line' | 'form';
  lineUrl?: string;
  message?: string;
}

export interface ChatResponse {
  conversation_id: string;
  message: string;
  role: 'assistant';
  show_cta?: boolean;
  cta_config?: CtaConfig;
}

export interface LeadRequest {
  client_id: string;
  name?: string;
  email?: string;
  phone?: string;
  answers?: Record<string, string>;
  source_page?: string;
}

export interface LeadResponse {
  id: string;
  success: boolean;
}

export interface KnowledgeCreateRequest {
  client_id: string;
  title: string;
  content: string;
}

export interface KnowledgeResponse {
  id: string;
  success: boolean;
}

// API共通エラー
export interface ApiError {
  error: string;
  code?: string;
}
