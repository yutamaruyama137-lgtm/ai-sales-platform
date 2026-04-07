import React, { useMemo, useState } from 'react';
import type { Client, ClientConfig, FlowConfig } from '@ai-sales/types';
import { useLeads } from '../hooks/useLeads';
import { useKnowledge } from '../hooks/useKnowledge';
import { useClients } from '../hooks/useClients';
import { LeadsTable } from '../components/LeadsTable';
import { ConversationModal } from '../components/ConversationModal';

type Tab = 'leads' | 'knowledge' | 'settings' | 'flow' | 'embed';

interface Props {
  client: Client;
  onBack: () => void;
}

export function ClientDetailPage({ client, onBack }: Props): React.ReactElement {
  const [activeTab, setActiveTab] = useState<Tab>('leads');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const tabs = useMemo(
    () => ([
      { id: 'leads' as const, label: 'リード一覧' },
      { id: 'knowledge' as const, label: 'ナレッジ' },
      { id: 'settings' as const, label: '設定' },
      { id: 'flow' as const, label: 'フロー設定' },
      { id: 'embed' as const, label: '埋め込み' },
    ]),
    [],
  );
  const hasActiveTab = tabs.some((tab) => tab.id === activeTab);
  const safeActiveTab = hasActiveTab ? activeTab : tabs[0].id;

  return (
    <div style={s.container}>
      {/* ヘッダー */}
      <div style={s.pageHeader}>
        <button style={s.backBtn} onClick={onBack}>← 一覧に戻る</button>
        <div>
          <h1 style={s.title}>{client.name}</h1>
          <p style={s.domain}>{client.domain || 'ドメイン未設定'}</p>
        </div>
      </div>

      {/* タブ */}
      <div style={s.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            style={{ ...s.tab, ...(safeActiveTab === tab.id ? s.tabActive : {}) }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* タブコンテンツ */}
      <div style={s.content}>
        {safeActiveTab === 'leads' && (
          <LeadsTab
            clientId={client.id}
            onViewConversation={(id) => setSelectedLeadId(id)}
          />
        )}
        {safeActiveTab === 'knowledge' && <KnowledgeTab clientId={client.id} />}
        {safeActiveTab === 'settings' && <SettingsTab client={client} />}
        {safeActiveTab === 'flow' && <FlowTab client={client} />}
        {safeActiveTab === 'embed' && <EmbedTab client={client} />}
      </div>

      {selectedLeadId && (
        <ConversationModal leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
      )}
    </div>
  );
}

// ────────────────── リードタブ ──────────────────
function LeadsTab({ clientId, onViewConversation }: { clientId: string; onViewConversation: (id: string) => void }) {
  const { leads, loading, error, page, hasMore, nextPage, prevPage } = useLeads(clientId);

  return (
    <div>
      {error && <div style={s.errorBox}>{error}</div>}
      <LeadsTable leads={leads} loading={loading} onViewConversation={onViewConversation} />
      <div style={s.pagination}>
        <button style={s.pageBtn} onClick={prevPage} disabled={page === 0 || loading}>前へ</button>
        <span style={s.pageInfo}>ページ {page + 1}</span>
        <button style={s.pageBtn} onClick={nextPage} disabled={!hasMore || loading}>次へ</button>
      </div>
    </div>
  );
}

// ────────────────── ナレッジタブ ──────────────────
function KnowledgeTab({ clientId }: { clientId: string }) {
  const { entries, loading, error, addEntry, deleteEntry, uploadFile, importFromUrl } = useKnowledge(clientId);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [importTitle, setImportTitle] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAdd = async () => {
    if (!title.trim() || !content.trim()) return;
    setAdding(true);
    setAddError('');
    try {
      await addEntry(title.trim(), content.trim());
      setTitle('');
      setContent('');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : '追加に失敗しました');
    } finally {
      setAdding(false);
    }
  };

  const handleImportUrl = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportMsg('');
    try {
      const result = await importFromUrl(importUrl.trim(), importTitle.trim() || undefined);
      if (result) {
        setImportMsg(`インポート完了: ${result.chunksCreated} チャンクをRAGに登録しました`);
        setImportUrl('');
        setImportTitle('');
      }
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : 'インポート失敗');
    } finally {
      setImporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg('');
    try {
      const result = await uploadFile(file);
      if (result) {
        setUploadMsg(`「${file.name}」を ${result.chunksCreated} チャンクに分割してRAGに登録しました`);
      }
    } catch (err) {
      setUploadMsg(err instanceof Error ? err.message : 'アップロード失敗');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div style={s.knowledgeLayout}>
      {/* 追加フォーム */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>テキストで追加</h3>
        <input
          style={s.input}
          placeholder="タイトル（例: 会社概要）"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          style={{ ...s.input, height: '120px', resize: 'vertical', marginTop: '10px' }}
          placeholder="内容（AIがこの情報を参照して回答します）"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        {addError && <p style={s.errorText}>{addError}</p>}
        <button
          style={{ ...s.primaryBtn, marginTop: '12px', opacity: adding ? 0.6 : 1 }}
          onClick={() => void handleAdd()}
          disabled={adding || !title.trim() || !content.trim()}
        >
          {adding ? 'エンベディング生成中...' : '追加'}
        </button>
      </div>

      {/* URLインポート */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>URLからインポート（RAG）</h3>
        <p style={s.helpText}>
          WebサイトのURLを指定すると、ページの内容を自動取得してRAGに登録します。
          <br />Notionの<strong>公開ページ</strong>・会社サイト・ブログ記事などに対応しています。
        </p>
        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input
            style={s.input}
            placeholder="タイトル（省略時はドメイン名）"
            value={importTitle}
            onChange={(e) => setImportTitle(e.target.value)}
          />
          <input
            style={s.input}
            placeholder="https://example.com/about"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            type="url"
          />
        </div>
        <button
          style={{ ...s.primaryBtn, marginTop: '10px', opacity: importing ? 0.6 : 1 }}
          onClick={() => void handleImportUrl()}
          disabled={importing || !importUrl.trim()}
        >
          {importing ? '取得中...' : 'インポート'}
        </button>
        {importMsg && (
          <p style={{ ...s.infoText, color: importMsg.includes('失敗') || importMsg.includes('エラー') ? '#dc2626' : '#059669', marginTop: '8px' }}>
            {importMsg}
          </p>
        )}
        <div style={{ marginTop: '12px', padding: '10px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '6px', fontSize: '12px', color: '#92400e' }}>
          💡 <strong>Notionを使う場合:</strong> Notionページを「公開」設定にしてURLをコピーしてください。
          プライベートページはNotionのAPIトークン連携が必要です（別途設定）。
        </div>
      </div>

      {/* ファイルアップロード */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>ファイルアップロード（RAG）</h3>
        <p style={s.helpText}>.txt / .md / .pdf ファイルを自動でチャンク分割・ベクトル化してRAGに登録します</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.pdf"
          onChange={(e) => void handleFileChange(e)}
          style={{ marginTop: '12px', fontSize: '14px', color: '#615d59' }}
          disabled={uploading}
        />
        {uploading && <p style={s.infoText}>アップロード・処理中...</p>}
        {uploadMsg && <p style={{ ...s.infoText, color: uploadMsg.includes('失敗') ? '#dc2626' : '#059669' }}>{uploadMsg}</p>}
      </div>

      {/* エントリ一覧 */}
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ ...s.cardTitle, margin: 0 }}>登録済みナレッジ</h3>
          <span style={s.badge}>{entries.length}件</span>
        </div>
        {error && <div style={s.errorBox}>{error}</div>}
        {loading ? (
          <p style={s.helpText}>読み込み中...</p>
        ) : entries.length === 0 ? (
          <p style={s.helpText}>まだナレッジが登録されていません</p>
        ) : (
          <div style={s.entryList}>
            {entries.map((entry) => (
              <div key={entry.id} style={s.entryRow}>
                <div style={s.entryInfo}>
                  <div style={s.entryTitle}>{entry.title}</div>
                  <div style={s.entryMeta}>
                    {entry.source_type === 'file' ? `ファイル: ${entry.source_name}` : '手動入力'}
                    {' · '}
                    {new Date(entry.created_at).toLocaleDateString('ja-JP')}
                  </div>
                  <div style={s.entryContent}>{entry.content.slice(0, 100)}...</div>
                </div>
                <button
                  style={s.deleteBtn}
                  onClick={() => void deleteEntry(entry.id)}
                  title="削除"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────── テストメール送信ボタン ──────────────────
function TestEmailButton({ clientId, notificationEmail }: { clientId: string; notificationEmail: string }) {
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');

  const handleTest = async () => {
    if (!notificationEmail.trim()) {
      setMsg('先にメールアドレスを入力して保存してください');
      setTimeout(() => setMsg(''), 3000);
      return;
    }
    setSending(true);
    setMsg('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL as string ?? 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/clients/${clientId}/test-email`, { method: 'POST' });
      if (res.ok) {
        setMsg(`テストメールを ${notificationEmail} に送信しました`);
      } else {
        const data = await res.json() as { error?: string };
        setMsg(data.error ?? '送信に失敗しました');
      }
    } catch {
      setMsg('送信に失敗しました');
    } finally {
      setSending(false);
      setTimeout(() => setMsg(''), 4000);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '8px 0 16px' }}>
      <button
        type="button"
        style={{ ...s.primaryBtn, padding: '7px 16px', fontSize: '13px', opacity: sending ? 0.6 : 1, background: '#0f766e' }}
        onClick={() => void handleTest()}
        disabled={sending}
      >
        {sending ? '送信中...' : 'テスト送信'}
      </button>
      {msg && (
        <span style={{ fontSize: '13px', color: msg.includes('失敗') || msg.includes('先に') ? '#dc2626' : '#059669' }}>
          {msg}
        </span>
      )}
    </div>
  );
}

// ────────────────── 設定タブ ──────────────────
function SettingsTab({ client }: { client: Client }) {
  const { updateClient } = useClients();
  const cfg = (client.config as ClientConfig) ?? {};

  const [name, setName] = useState(client.name);
  const [domain, setDomain] = useState(client.domain ?? '');
  const [systemPrompt, setSystemPrompt] = useState(cfg.systemPrompt ?? '');
  const [welcomeMessage, setWelcomeMessage] = useState(cfg.welcomeMessage ?? '');
  const [primaryColor, setPrimaryColor] = useState(cfg.primaryColor ?? '#0075de');
  const [headerTitle, setHeaderTitle] = useState(cfg.headerTitle ?? '');
  const [buttonText, setButtonText] = useState(cfg.buttonText ?? '💬');
  const [notificationEmail, setNotificationEmail] = useState(cfg.notificationEmail ?? '');
  const [webhookUrl, setWebhookUrl] = useState(cfg.webhookUrl ?? '');
  const [lineChannelAccessToken, setLineChannelAccessToken] = useState(cfg.lineChannelAccessToken ?? '');
  const [lineChannelSecret, setLineChannelSecret] = useState(cfg.lineChannelSecret ?? '');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    const newConfig: ClientConfig = {
      systemPrompt: systemPrompt || undefined,
      welcomeMessage: welcomeMessage || undefined,
      primaryColor: primaryColor || undefined,
      headerTitle: headerTitle || undefined,
      buttonText: buttonText || undefined,
      notificationEmail: notificationEmail || undefined,
      webhookUrl: webhookUrl || undefined,
      lineChannelAccessToken: lineChannelAccessToken || undefined,
      lineChannelSecret: lineChannelSecret || undefined,
    };
    const ok = await updateClient(client.id, name, domain, newConfig);
    setSaveMsg(ok ? '保存しました' : '保存に失敗しました');
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const Field = ({ label, value, onChange, placeholder, multiline = false }: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; multiline?: boolean;
  }) => (
    <label style={s.fieldLabel}>
      {label}
      {multiline ? (
        <textarea style={{ ...s.input, height: '100px', resize: 'vertical' }}
          value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input style={s.input} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </label>
  );

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={s.card}>
        <h3 style={s.cardTitle}>基本情報</h3>
        <Field label="会社名" value={name} onChange={setName} placeholder="株式会社サンプル" />
        <Field label="ドメイン" value={domain} onChange={setDomain} placeholder="sample.co.jp" />
      </div>

      <div style={{ ...s.card, marginTop: '16px' }}>
        <h3 style={s.cardTitle}>AIアシスタント設定</h3>
        <Field label="システムプロンプト" value={systemPrompt} onChange={setSystemPrompt}
          placeholder="あなたは〇〇の営業アシスタントです..." multiline />
        <Field label="ウェルカムメッセージ" value={welcomeMessage} onChange={setWelcomeMessage}
          placeholder="こんにちは！何かお手伝いできることはありますか？" />
      </div>

      <div style={{ ...s.card, marginTop: '16px' }}>
        <h3 style={s.cardTitle}>ウィジェット外観</h3>
        <label style={s.fieldLabel}>
          テーマカラー
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)}
              style={{ width: '44px', height: '36px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '4px', cursor: 'pointer', padding: '2px' }} />
            <input style={{ ...s.input, flex: 1 }} value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)} placeholder="#0075de" />
          </div>
        </label>
        <Field label="ヘッダータイトル" value={headerTitle} onChange={setHeaderTitle} placeholder="AIアシスタント" />
        <Field label="フローティングボタンのテキスト" value={buttonText} onChange={setButtonText} placeholder="💬" />
      </div>

      <div style={{ ...s.card, marginTop: '16px' }}>
        <h3 style={s.cardTitle}>通知設定</h3>
        <p style={s.helpText}>
          新しいリードが登録されたときに、指定したメールアドレスへ自動で通知します。
        </p>
        <Field label="通知メールアドレス" value={notificationEmail} onChange={setNotificationEmail}
          placeholder="admin@yourcompany.com" />
        <TestEmailButton clientId={client.id} notificationEmail={notificationEmail} />
        <Field label="Webhook URL" value={webhookUrl} onChange={setWebhookUrl}
          placeholder="https://hooks.slack.com/..." />
      </div>

      <div style={{ ...s.card, marginTop: '16px' }}>
        <h3 style={s.cardTitle}>LINE Messaging API 設定</h3>
        <p style={s.helpText}>
          クライアント自身のLINE公式アカウントのCredentialを設定してください。
          友だち追加イベントが自動でリードに保存されます。
        </p>
        <label style={s.fieldLabel}>
          Webhook URL（LINEの管理画面に登録してください）
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <code style={{ flex: 1, fontSize: '12px', padding: '8px 10px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', wordBreak: 'break-all' }}>
              {`https://ai-salesapi-production.up.railway.app/api/webhooks/line/${client.id}`}
            </code>
            <button
              type="button"
              style={{ ...s.primaryBtn, padding: '7px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
              onClick={() => { void navigator.clipboard.writeText(`https://ai-salesapi-production.up.railway.app/api/webhooks/line/${client.id}`); }}
            >
              コピー
            </button>
          </div>
        </label>
        <label style={{ ...s.fieldLabel, marginTop: '12px' }}>
          Channel Access Token
          <input
            style={s.input}
            type="password"
            value={lineChannelAccessToken}
            onChange={(e) => setLineChannelAccessToken(e.target.value)}
            placeholder="Channel Access Token（長期）"
            autoComplete="off"
          />
        </label>
        <label style={{ ...s.fieldLabel, marginTop: '8px' }}>
          Channel Secret
          <input
            style={s.input}
            type="password"
            value={lineChannelSecret}
            onChange={(e) => setLineChannelSecret(e.target.value)}
            placeholder="Channel Secret"
            autoComplete="off"
          />
        </label>
      </div>

      <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button style={{ ...s.primaryBtn, opacity: saving ? 0.6 : 1 }}
          onClick={() => void handleSave()} disabled={saving}>
          {saving ? '保存中...' : '設定を保存'}
        </button>
        {saveMsg && (
          <span style={{ color: saveMsg.includes('失敗') ? '#dc2626' : '#059669', fontSize: '14px', fontWeight: 500 }}>
            {saveMsg}
          </span>
        )}
      </div>
    </div>
  );
}

// ────────────────── フロー設定タブ ──────────────────

interface FlowTemplate {
  key: string;
  label: string;
  emoji: string;
  description: string;
  systemPrompt: string;
  welcomeMessage: string;
  ctaType: 'line' | 'form';
  ctaMessage: string;
  minMessages: number;
  flowSystemPrompt: string;
}

const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    key: 'realestate',
    label: '不動産',
    emoji: '🏠',
    description: '購入・賃貸問わず、条件ヒアリング→概算提示→内見申込へ誘導',
    systemPrompt: 'あなたは不動産仲介会社のAI営業アシスタントです。丁寧かつ専門的に、お客様の理想の住まい探しをサポートします。',
    welcomeMessage: 'こんにちは！お部屋探し・物件購入のご相談はお気軽にどうぞ。ご希望をお聞かせください。',
    ctaType: 'line',
    ctaMessage: '気になる物件の詳細資料・内見日程をLINEでご案内します。友だち追加お待ちしています！',
    minMessages: 4,
    flowSystemPrompt: `あなたは不動産仲介会社のAI営業アシスタントです。

【ヒアリング項目（以下を順番に確認してください）】
1. 購入・賃貸どちらをお探しか
2. ご希望のエリア・最寄り駅（複数可）
3. 予算（購入: 総額または月々の支払い目安 / 賃貸: 月額家賃）
4. 間取り・広さ（例: 2LDK、60㎡以上）
5. ご入居希望時期
6. こだわり条件（ペット可・駐車場・リモートワーク向け・学区等）

【提案フェーズ】
条件が揃ったら「〇〇エリアでは、ご予算内でご希望に近い物件が複数ございます。例えば〇〇駅周辺に△△万円台の物件が出ています」と具体的に伝えてください。
実際の物件名は出さず、エリア・価格帯・特徴のみ言及すること。

【CTA発動条件（以下が揃ったら [SHOW_CTA] を末尾に付けること）】
・ヒアリングが完了した
・物件の概算・提案ができた
・「見てみたい」「詳しく知りたい」等の前向きな反応があった

CTAの直前に「担当者より詳細な物件情報・内見のご案内をさせていただきます。」と必ず添えてください。
[SHOW_CTA] は1回のみ使用すること。`,
  },
  {
    key: 'school',
    label: 'スクール・塾',
    emoji: '📚',
    description: '目標ヒアリング→コース提案→無料体験・個別相談へ誘導',
    systemPrompt: 'あなたは学習スクールのAI入学相談員です。生徒・保護者の目標を丁寧にお聞きし、最適なコースをご提案します。',
    welcomeMessage: 'こんにちは！コースや料金についてのご質問、体験レッスンのご相談はお気軽にどうぞ。',
    ctaType: 'form',
    ctaMessage: '無料体験レッスン・個別相談のご予約を承ります。お名前とメールアドレスをご入力ください。',
    minMessages: 4,
    flowSystemPrompt: `あなたは学習スクールのAI入学相談員です。

【ヒアリング項目（順番に確認してください）】
1. 相談者（生徒本人 or 保護者）
2. 目標（資格取得・受験・スキルアップ・就職活動・趣味等）
3. 現在のレベル・経験（全くの初心者〜上級者）
4. 通塾可能な曜日・時間帯（オンライン可否も確認）
5. 通い始めたい時期
6. 気になっていること（費用・進度・カリキュラム・講師等）

【提案フェーズ】
条件が揃ったら「〇〇コース（月〇回・〇ヶ月完結）がおすすめです。受講料の目安は月〇〇円〜です」と具体的に提案してください。
できれば2〜3つの選択肢を提示し、それぞれのメリットを簡潔に伝えること。

【CTA発動条件（以下が揃ったら [SHOW_CTA] を末尾に付けること）】
・希望コースが絞り込めた
・費用・スケジュールの概算をお伝えした
・「詳しく知りたい」「体験できますか」「申し込みたい」等の意向がある

CTAの直前に「まずは無料体験レッスン（〇〇分）でお試しいただけます。担当スタッフよりご連絡します。」と添えてください。
[SHOW_CTA] は1回のみ使用すること。`,
  },
  {
    key: 'salon',
    label: '美容サロン',
    emoji: '💇',
    description: 'メニュー相談→施術内容・料金提案→LINE予約へ誘導',
    systemPrompt: 'あなたは美容サロンのAIコンシェルジュです。お客様のなりたいイメージをお聞きし、最適なメニューをご提案します。',
    welcomeMessage: 'こんにちは！メニューや料金のご相談、ご予約はこちらからどうぞ。お気軽にメッセージください！',
    ctaType: 'line',
    ctaMessage: 'LINEからかんたんにご予約いただけます。友だち追加後、ご希望の日時をお送りください！',
    minMessages: 3,
    flowSystemPrompt: `あなたは美容サロンのAIコンシェルジュです。

【ヒアリング項目】
1. ご希望のメニュー（カット・カラー・パーマ・縮毛矯正・ヘアケア等）
2. 現在の髪の状態（長さ・ダメージ具合・過去の施術履歴）
3. なりたいイメージ（カジュアル・ナチュラル・派手め・ビジネス向け等）
4. 予算の目安
5. ご希望の日時（平日・週末・時間帯の希望）
6. 初めてのご来店かどうか

【提案フェーズ】
ご希望に合ったメニューと所要時間・価格帯をお伝えする。
「〇〇スタイルでしたら、カット+カラーで△△円〜、約〇時間です。初回割引で□□円になります」と具体的に伝えること。

【CTA発動条件（以下が揃ったら [SHOW_CTA] を末尾に付けること）】
・ご希望メニューが決まった
・予算・所要時間のすり合わせができた
・「予約したい」「行ってみたい」の意向が見えた

CTAの直前に「ご予約はLINEからかんたんにできます！空き状況もすぐご確認いただけます。」と添えてください。
[SHOW_CTA] は1回のみ使用すること。`,
  },
  {
    key: 'fitness',
    label: 'フィットネス',
    emoji: '💪',
    description: '目標・ライフスタイルヒアリング→プラン提案→無料体験申込へ',
    systemPrompt: 'あなたはフィットネスジムのAIトレーナー兼入会相談員です。目標に合った最適なトレーニングプランをご提案します。',
    welcomeMessage: 'こんにちは！ダイエット・筋トレ・健康維持など、目標に合ったプランをご提案します。お気軽にご相談ください！',
    ctaType: 'form',
    ctaMessage: '無料体験トレーニングのお申込みはこちら。スタッフよりご連絡します！',
    minMessages: 4,
    flowSystemPrompt: `あなたはフィットネスジムのAIトレーナー兼入会相談員です。

【ヒアリング項目】
1. 目標（ダイエット・筋肉増量・健康維持・スポーツパフォーマンス向上・姿勢改善等）
2. 現在の運動習慣・経験（全くなし〜週3回以上）
3. 通える頻度・時間帯（週何回・朝/昼/夜）
4. 関心のあるサービス（パーソナルトレーニング・24時間利用・グループレッスン等）
5. 予算感（月額の目安）
6. 気になっていること（続けられるか・ダイエット効果・ケガのリスク等）

【提案フェーズ】
目標に合ったプランを2〜3案提示する。
「週2回のパーソナルトレーニング（月4回）プランと、通い放題プランがおすすめです。前者は月〇万円〜、後者は月〇千円〜です」のように比較しやすく伝えること。

【CTA発動条件（以下が揃ったら [SHOW_CTA] を末尾に付けること）】
・目標・生活スタイルのヒアリングが完了した
・具体的なプランを提案し、費用感も伝えた
・「試してみたい」「詳しく聞きたい」等の前向きな反応があった

CTAの直前に「まずは無料体験トレーニング（60分）をお申し込みいただけます！」と添えてください。
[SHOW_CTA] は1回のみ使用すること。`,
  },
  {
    key: 'insurance',
    label: '保険・FP相談',
    emoji: '🛡️',
    description: '状況ヒアリング→保障の方向性提案→無料FP相談へ誘導',
    systemPrompt: 'あなたはファイナンシャルプランナー（FP）のAIアシスタントです。お客様の状況に合った保険・資産運用の方向性をご提案します。具体的な商品の推奨は対面相談で行います。',
    welcomeMessage: 'こんにちは！保険の見直し・資産運用・老後の備えなど、FP相談に関するご質問をどうぞ。',
    ctaType: 'form',
    ctaMessage: '無料FP相談（30分・オンライン可）のお申込みはこちら。担当FPよりご連絡します。',
    minMessages: 4,
    flowSystemPrompt: `あなたはファイナンシャルプランナー（FP）のAIアシスタントです。

【重要な注意事項】
具体的な金融商品の推奨・勧誘は行いません。あくまで情報提供・方向性の整理として相談をお受けします。

【ヒアリング項目】
1. 相談内容（生命保険・医療保険・学資保険・老後資金・資産運用・保険の見直し等）
2. 家族構成・年齢層（大まかで可）
3. 現在の加入状況（大まかで可。例：「生命保険に入っている」程度で十分）
4. 特に気になっていること（保障額が足りているか・保険料が高い・将来の備え等）
5. 相談の緊急度（今すぐ検討中 or いずれ考えたい）

【提案フェーズ】
「〇〇のご状況でしたら、△△について整理してみることをお勧めします。例えば〜」と方向性を示す。
具体的な商品名・保険会社名は出さないこと。

【CTA発動条件（以下が揃ったら [SHOW_CTA] を末尾に付けること）】
・相談内容と家族構成が把握できた
・課題の方向性（見直し・新規加入・積立等）が見えた
・「詳しく話を聞きたい」「相談したい」の意向がある

CTAの直前に「専門のFPが個別に状況を伺い、最適な方向性をご提案します（無料・オンライン可）。」と添えてください。
[SHOW_CTA] は1回のみ使用すること。`,
  },
  {
    key: 'reform',
    label: 'リフォーム',
    emoji: '🔨',
    description: '要望ヒアリング→概算見積り→現地調査申込へ誘導',
    systemPrompt: 'あなたはリフォーム会社のAIアシスタントです。お客様のご要望をヒアリングし、最適なリフォームプランと概算費用をご提案します。',
    welcomeMessage: 'こんにちは！リフォームのご相談はこちらから。ご希望の箇所・ご予算・時期など、お気軽にお聞かせください。',
    ctaType: 'form',
    ctaMessage: '無料の現地調査・お見積りをお申し込みいただけます。担当者よりご連絡します！',
    minMessages: 4,
    flowSystemPrompt: `あなたはリフォーム会社のAIアシスタントです。

【ヒアリング項目】
1. リフォームしたい箇所（キッチン・浴室・トイレ・洗面・外壁・屋根・内装・全体等）
2. 住宅の種類・築年数（戸建て/マンション、大まかな築年数）
3. 現在の状態・お困りのこと（雨漏り・設備の老朽化・使いにくい・見た目を変えたい等）
4. 希望する仕上がりイメージ（ナチュラル・モダン・和風・機能重視等）
5. 予算（目安で可。例：「100万円以内」「500万円くらいまで」）
6. 希望する工事時期・期間、住みながらの施工が可能か

【提案フェーズ】
「〇〇のリフォームでしたら、工期約〇週間、費用は〇〇万円〜〇〇万円が目安です。素材・仕様によって変わります」と伝える。
主要な選択肢（グレード違い・工法違い等）も簡単に紹介すること。

【CTA発動条件（以下が揃ったら [SHOW_CTA] を末尾に付けること）】
・リフォーム箇所・予算・時期が把握できた
・概算費用・工期をお伝えした
・「詳しく見てほしい」「現地で確認してほしい」「見積もりを出してほしい」等の反応があった

CTAの直前に「無料で現地調査・詳細お見積りをご案内できます。担当者がお伺いします。」と添えてください。
[SHOW_CTA] は1回のみ使用すること。`,
  },
];

function FlowTab({ client }: { client: Client }) {
  const { updateClient } = useClients();
  const cfg = (client.config as ClientConfig) ?? {};
  const flow = cfg.flowConfig ?? { ctaType: 'none' as const };

  const [ctaType, setCtaType] = useState<'line' | 'form' | 'none'>(flow.ctaType ?? 'none');
  const [lineUrl, setLineUrl] = useState(flow.lineUrl ?? '');
  const [ctaMessage, setCtaMessage] = useState(flow.ctaMessage ?? '');
  const [minMessages, setMinMessages] = useState(String(flow.minMessages ?? 3));
  const [flowSystemPrompt, setFlowSystemPrompt] = useState(flow.flowSystemPrompt ?? '');
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const applyTemplate = (t: FlowTemplate) => {
    setCtaType(t.ctaType);
    setCtaMessage(t.ctaMessage);
    setMinMessages(String(t.minMessages));
    setFlowSystemPrompt(t.flowSystemPrompt);
    setAppliedTemplate(t.key);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    const newFlowConfig: FlowConfig = {
      ctaType,
      lineUrl: lineUrl || undefined,
      ctaMessage: ctaMessage || undefined,
      minMessages: Number(minMessages) || 3,
      flowSystemPrompt: flowSystemPrompt || undefined,
    };
    // テンプレート適用時はsystemPromptとwelcomeMessageも上書き
    const tpl = appliedTemplate ? FLOW_TEMPLATES.find((t) => t.key === appliedTemplate) : null;
    const newConfig: ClientConfig = {
      ...cfg,
      ...(tpl ? { systemPrompt: tpl.systemPrompt, welcomeMessage: tpl.welcomeMessage } : {}),
      flowConfig: newFlowConfig,
    };
    const ok = await updateClient(client.id, client.name, client.domain ?? '', newConfig);
    setSaveMsg(ok ? '保存しました' : '保存に失敗しました');
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 3000);
    if (ok) setAppliedTemplate(null);
  };

  return (
    <div style={{ maxWidth: '720px' }}>
      {/* テンプレート選択 */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>業種別テンプレート</h3>
        <p style={s.helpText}>
          業種を選ぶと、会話フロー・CTAメッセージ・AIキャラクター設定が自動入力されます。
          「設定を保存」するとシステムプロンプト・ウェルカムメッセージも同時に更新されます。
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {FLOW_TEMPLATES.map((t) => (
            <button
              key={t.key}
              style={{
                ...s.templateCard,
                ...(appliedTemplate === t.key ? s.templateCardActive : {}),
              }}
              onClick={() => applyTemplate(t)}
            >
              <span style={{ fontSize: '22px' }}>{t.emoji}</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(0,0,0,0.9)' }}>{t.label}</span>
              <span style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>{t.description}</span>
            </button>
          ))}
        </div>
        {appliedTemplate && (
          <div style={{ marginTop: '12px', padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', fontSize: '13px', color: '#166534' }}>
            ✓ テンプレートを適用しました。下の設定を確認して「設定を保存」してください。
          </div>
        )}
      </div>

      {/* CTA設定 */}
      <div style={{ ...s.card, marginTop: '16px' }}>
        <h3 style={s.cardTitle}>CTAタイプ</h3>
        <p style={s.helpText}>AIが適切なタイミングで自動表示するアクションを選択します。</p>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {([
            { value: 'none', label: '表示しない', desc: 'CTAなし' },
            { value: 'line', label: 'LINE登録', desc: '友だち追加URLへ誘導' },
            { value: 'form', label: 'お問い合わせ', desc: '名前・メール取得' },
          ] as const).map(({ value, label, desc }) => (
            <label
              key={value}
              style={{
                display: 'flex', flexDirection: 'column', gap: '2px',
                padding: '10px 14px', border: `1px solid ${ctaType === value ? '#0075de' : 'rgba(0,0,0,0.12)'}`,
                borderRadius: '8px', cursor: 'pointer', flex: '1', minWidth: '120px',
                background: ctaType === value ? '#f0f7ff' : '#fff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input type="radio" name="ctaType" value={value} checked={ctaType === value} onChange={() => setCtaType(value)} />
                <span style={{ fontSize: '14px', fontWeight: 600 }}>{label}</span>
              </div>
              <span style={{ fontSize: '12px', color: '#64748b', paddingLeft: '20px' }}>{desc}</span>
            </label>
          ))}
        </div>

        {ctaType === 'line' && (
          <>
            <label style={s.fieldLabel}>
              LINE 友だち追加URL
              <input style={s.input} value={lineUrl} onChange={(e) => setLineUrl(e.target.value)} placeholder="https://lin.ee/xxxxxxx" />
            </label>
            <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '6px', fontSize: '12px', color: '#92400e', marginBottom: '12px' }}>
              💡 <strong>LINE公式アカウント</strong>の友だち追加URLを設定してください。
              LINE Developers → Messaging API → QRコード横のURLです。
            </div>
          </>
        )}

        {ctaType !== 'none' && (
          <label style={s.fieldLabel}>
            CTAメッセージ（ウィジェット上に表示するテキスト）
            <input style={s.input} value={ctaMessage} onChange={(e) => setCtaMessage(e.target.value)}
              placeholder="詳細をLINEでご案内します。友だち追加をお願いします！" />
          </label>
        )}

        <label style={s.fieldLabel}>
          CTA表示までの最低メッセージ数
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input style={{ ...s.input, width: '80px' }} type="number" min="1" max="20" value={minMessages}
              onChange={(e) => setMinMessages(e.target.value)} />
            <span style={{ fontSize: '13px', color: '#64748b' }}>回以上のやり取り後にCTAを表示可能にする（推奨: 3〜6）</span>
          </div>
        </label>
      </div>

      {/* フロープロンプト */}
      <div style={{ ...s.card, marginTop: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h3 style={{ ...s.cardTitle, margin: 0 }}>会話フロープロンプト</h3>
          <span style={s.badge}>AIへの指示</span>
        </div>
        <p style={s.helpText}>
          AIがどのような会話の流れで進めるかを指示します。
          CTAを出したいタイミングで <code style={s.code}>[SHOW_CTA]</code> を含めるよう指示してください。
        </p>
        <textarea
          style={{ ...s.input, height: '260px', resize: 'vertical', marginTop: '8px', fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.6 }}
          value={flowSystemPrompt}
          onChange={(e) => setFlowSystemPrompt(e.target.value)}
          placeholder="テンプレートを選択するか、直接入力してください。&#10;&#10;例:&#10;あなたは〇〇の営業アシスタントです。&#10;&#10;【ヒアリング項目】&#10;1. お名前・ご希望&#10;2. 予算&#10;...&#10;&#10;条件が揃ったら [SHOW_CTA] を末尾に付けてください。"
        />
      </div>

      <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button style={{ ...s.primaryBtn, opacity: saving ? 0.6 : 1 }} onClick={() => void handleSave()} disabled={saving}>
          {saving ? '保存中...' : '設定を保存'}
        </button>
        {saveMsg && (
          <span style={{ color: saveMsg.includes('失敗') ? '#dc2626' : '#059669', fontSize: '14px', fontWeight: 500 }}>
            {saveMsg}
          </span>
        )}
      </div>
    </div>
  );
}

// ────────────────── 埋め込みタブ ──────────────────
function EmbedTab({ client }: { client: Client }) {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const widgetBaseUrl = import.meta.env.VITE_WIDGET_URL || 'http://localhost:5173';
  const prodNote = 'このスクリプトタグをサイトの </body> 直前に貼り付けてください';

  const snippet = `<!-- AI Sales Widget -->
<script
  src="${widgetBaseUrl}/widget"
  data-client-id="${client.id}"
  data-api-url="${apiUrl}"
></script>`;

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: '720px' }}>
      <div style={s.card}>
        <h3 style={s.cardTitle}>ウィジェット埋め込みタグ</h3>
        <p style={s.helpText}>
          以下のスクリプトタグをサイトの <code style={s.code}>&lt;/body&gt;</code> 直前に貼り付けるだけでAIチャットウィジェットが設置されます。
        </p>
        <div style={s.snippetBox}>
          <pre style={s.snippetPre}>{snippet}</pre>
          <button style={s.copyBtn} onClick={() => void handleCopy()}>
            {copied ? '✓ コピー済み' : 'コピー'}
          </button>
        </div>
        <p style={{ ...s.helpText, marginTop: '12px' }}>⚠️ {prodNote}</p>
      </div>

      <div style={{ ...s.card, marginTop: '16px' }}>
        <h3 style={s.cardTitle}>属性一覧</h3>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>属性名</th>
              <th style={s.th}>説明</th>
              <th style={s.th}>必須</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['data-client-id', 'クライアントID（このページに表示されているID）', '必須'],
              ['data-api-url', 'APIサーバーのURL', '必須'],
            ].map(([attr, desc, req]) => (
              <tr key={attr}>
                <td style={s.td}><code style={s.code}>{attr}</code></td>
                <td style={s.td}>{desc}</td>
                <td style={{ ...s.td, fontWeight: 600, color: '#0075de' }}>{req}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ ...s.card, marginTop: '16px' }}>
        <h3 style={s.cardTitle}>Client ID</h3>
        <div style={s.idBox}>
          <code style={s.idCode}>{client.id}</code>
          <button style={s.copyBtn2} onClick={() => void navigator.clipboard.writeText(client.id)}>
            コピー
          </button>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' },
  pageHeader: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px' },
  backBtn: {
    background: 'rgba(0,0,0,0.05)', border: '1px solid transparent', borderRadius: '4px',
    padding: '6px 14px', cursor: 'pointer', fontSize: '14px', color: '#615d59',
    whiteSpace: 'nowrap', fontWeight: 500, fontFamily: 'inherit',
  },
  title: { margin: '0 0 2px', fontSize: '22px', fontWeight: 700, color: 'rgba(0,0,0,0.95)', letterSpacing: '-0.25px' },
  domain: { margin: 0, fontSize: '13px', color: '#a39e98', fontWeight: 500 },
  tabs: {
    display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.1)', marginBottom: '28px', gap: '0',
  },
  tab: {
    padding: '10px 18px', background: 'none', border: 'none', borderBottom: '2px solid transparent',
    cursor: 'pointer', fontSize: '14px', color: '#615d59', marginBottom: '-1px',
    fontWeight: 500, fontFamily: 'inherit',
    outline: 'none', appearance: 'none', WebkitAppearance: 'none',
    transition: 'color 0.1s ease',
  },
  tabActive: { borderBottomColor: '#0075de', color: '#0075de', fontWeight: 600 },
  content: {},
  card: {
    background: '#fff',
    border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: '12px',
    padding: '20px 24px',
    boxShadow: 'rgba(0,0,0,0.04) 0px 4px 18px, rgba(0,0,0,0.027) 0px 2px 8px, rgba(0,0,0,0.02) 0px 0.8px 3px',
  },
  cardTitle: { margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: 'rgba(0,0,0,0.95)' },
  badge: {
    display: 'inline-block', padding: '3px 10px', background: '#f2f9ff', color: '#097fe8',
    borderRadius: '9999px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.125px',
  },
  input: {
    display: 'block', width: '100%', padding: '6px 10px', border: '1px solid #dddddd',
    borderRadius: '4px', fontSize: '15px', outline: 'none', color: 'rgba(0,0,0,0.9)',
    boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5,
  },
  fieldLabel: {
    display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px',
    color: '#31302e', marginBottom: '14px', fontWeight: 500,
  },
  primaryBtn: {
    padding: '8px 16px', background: '#0075de', color: '#fff',
    border: '1px solid transparent', borderRadius: '4px', fontSize: '15px', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  helpText: { margin: '0 0 8px', fontSize: '14px', color: '#615d59', lineHeight: 1.6 },
  infoText: { margin: '10px 0 0', fontSize: '13px', color: '#0075de', fontWeight: 500 },
  errorBox: {
    padding: '10px 14px', background: '#fef2f2', border: '1px solid rgba(220,38,38,0.2)',
    borderRadius: '6px', color: '#dc2626', fontSize: '13px', marginBottom: '12px',
  },
  errorText: { color: '#dc2626', fontSize: '13px', margin: '8px 0 0' },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '20px' },
  pageBtn: {
    padding: '7px 18px', background: 'rgba(0,0,0,0.05)', border: '1px solid transparent',
    borderRadius: '4px', fontSize: '14px', cursor: 'pointer', color: '#31302e',
    fontWeight: 500, fontFamily: 'inherit',
  },
  pageInfo: { fontSize: '14px', color: '#615d59', fontWeight: 500 },
  knowledgeLayout: { display: 'flex', flexDirection: 'column', gap: '16px' },
  entryList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  entryRow: {
    display: 'flex', alignItems: 'flex-start', gap: '12px',
    padding: '12px 14px', background: '#f6f5f4', borderRadius: '8px',
    border: '1px solid rgba(0,0,0,0.06)',
  },
  entryInfo: { flex: 1, minWidth: 0 },
  entryTitle: { fontSize: '14px', fontWeight: 600, color: 'rgba(0,0,0,0.95)', marginBottom: '3px' },
  entryMeta: { fontSize: '12px', color: '#a39e98', marginBottom: '4px', letterSpacing: '0.125px' },
  entryContent: { fontSize: '13px', color: '#615d59', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
  deleteBtn: {
    background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '4px',
    cursor: 'pointer', fontSize: '12px', padding: '3px 8px', flexShrink: 0,
    color: '#a39e98', fontWeight: 500, fontFamily: 'inherit',
  },
  snippetBox: {
    position: 'relative', background: '#31302e', borderRadius: '8px',
    padding: '16px', marginTop: '12px',
  },
  snippetPre: { margin: 0, color: '#f6f5f4', fontSize: '13px', fontFamily: 'monospace', overflowX: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.6 },
  copyBtn: {
    position: 'absolute', top: '10px', right: '10px',
    padding: '4px 12px', background: 'rgba(255,255,255,0.15)', color: '#f6f5f4',
    border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', fontSize: '12px',
    cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
  },
  copyBtn2: {
    padding: '5px 14px', background: 'rgba(0,0,0,0.05)', color: '#31302e',
    border: '1px solid transparent', borderRadius: '4px', fontSize: '13px',
    cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit', flexShrink: 0,
  },
  code: { fontFamily: 'monospace', background: '#f6f5f4', padding: '1px 6px', borderRadius: '4px', fontSize: '13px', border: '1px solid rgba(0,0,0,0.08)' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '8px' },
  th: {
    textAlign: 'left', padding: '8px 12px', background: '#f6f5f4',
    borderBottom: '1px solid rgba(0,0,0,0.08)', fontSize: '13px', color: '#31302e', fontWeight: 600,
  },
  td: {
    padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)',
    fontSize: '13px', color: '#615d59',
  },
  idBox: {
    display: 'flex', alignItems: 'center', gap: '12px',
    background: '#f6f5f4', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '6px', padding: '10px 14px',
  },
  idCode: { flex: 1, fontFamily: 'monospace', fontSize: '13px', color: 'rgba(0,0,0,0.95)', wordBreak: 'break-all' },
  templateCard: {
    display: 'flex', flexDirection: 'column' as const, gap: '4px',
    padding: '12px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '10px',
    cursor: 'pointer', background: '#fff', textAlign: 'left' as const,
    fontFamily: 'inherit', transition: 'border-color 0.15s',
  },
  templateCardActive: {
    border: '2px solid #0075de', background: '#f0f7ff',
  },
};
