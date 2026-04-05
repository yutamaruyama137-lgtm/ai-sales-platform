import React, { useState } from 'react';
import type { Client, ClientConfig } from '@ai-sales/types';
import { useLeads } from '../hooks/useLeads';
import { useKnowledge } from '../hooks/useKnowledge';
import { useClients } from '../hooks/useClients';
import { LeadsTable } from '../components/LeadsTable';
import { ConversationModal } from '../components/ConversationModal';

type Tab = 'leads' | 'knowledge' | 'settings' | 'embed';

interface Props {
  client: Client;
  onBack: () => void;
}

export function ClientDetailPage({ client, onBack }: Props): React.ReactElement {
  const [activeTab, setActiveTab] = useState<Tab>('leads');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

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
        {(['leads', 'knowledge', 'settings', 'embed'] as Tab[]).map((tab) => (
          <button
            key={tab}
            style={{ ...s.tab, ...(activeTab === tab ? s.tabActive : {}) }}
            onClick={() => setActiveTab(tab)}
          >
            {{ leads: 'リード一覧', knowledge: 'ナレッジ', settings: '設定', embed: '埋め込み' }[tab]}
          </button>
        ))}
      </div>

      {/* タブコンテンツ */}
      <div style={s.content}>
        {activeTab === 'leads' && (
          <LeadsTab
            clientId={client.id}
            onViewConversation={(id) => setSelectedLeadId(id)}
          />
        )}
        {activeTab === 'knowledge' && <KnowledgeTab clientId={client.id} />}
        {activeTab === 'settings' && <SettingsTab client={client} />}
        {activeTab === 'embed' && <EmbedTab client={client} />}
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
  const { entries, loading, error, addEntry, deleteEntry, uploadFile } = useKnowledge(clientId);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
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

      {/* ファイルアップロード */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>ファイルアップロード（RAG）</h3>
        <p style={s.helpText}>.txt / .md / .pdf ファイルを自動でチャンク分割・ベクトル化してRAGに登録します</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.pdf"
          onChange={(e) => void handleFileChange(e)}
          style={{ marginTop: '12px' }}
          disabled={uploading}
        />
        {uploading && <p style={s.infoText}>アップロード・処理中...</p>}
        {uploadMsg && <p style={{ ...s.infoText, color: uploadMsg.includes('失敗') ? '#dc2626' : '#059669' }}>{uploadMsg}</p>}
      </div>

      {/* エントリ一覧 */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>登録済みナレッジ（{entries.length}件）</h3>
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
                    {entry.source_type === 'file' ? `📄 ${entry.source_name}` : '✏️ 手動'}
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
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
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
  const [primaryColor, setPrimaryColor] = useState(cfg.primaryColor ?? '#2563eb');
  const [headerTitle, setHeaderTitle] = useState(cfg.headerTitle ?? '');
  const [buttonText, setButtonText] = useState(cfg.buttonText ?? '💬');
  const [notificationEmail, setNotificationEmail] = useState(cfg.notificationEmail ?? '');
  const [webhookUrl, setWebhookUrl] = useState(cfg.webhookUrl ?? '');
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
              style={{ width: '50px', height: '36px', border: 'none', cursor: 'pointer' }} />
            <input style={{ ...s.input, flex: 1 }} value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)} placeholder="#2563eb" />
          </div>
        </label>
        <Field label="ヘッダータイトル" value={headerTitle} onChange={setHeaderTitle} placeholder="AIアシスタント" />
        <Field label="フローティングボタンのテキスト" value={buttonText} onChange={setButtonText} placeholder="💬" />
      </div>

      <div style={{ ...s.card, marginTop: '16px' }}>
        <h3 style={s.cardTitle}>通知設定</h3>
        <Field label="通知メールアドレス" value={notificationEmail} onChange={setNotificationEmail}
          placeholder="admin@yourcompany.com" />
        <Field label="Webhook URL" value={webhookUrl} onChange={setWebhookUrl}
          placeholder="https://hooks.slack.com/..." />
      </div>

      <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button style={{ ...s.primaryBtn, opacity: saving ? 0.6 : 1 }}
          onClick={() => void handleSave()} disabled={saving}>
          {saving ? '保存中...' : '設定を保存'}
        </button>
        {saveMsg && (
          <span style={{ color: saveMsg.includes('失敗') ? '#dc2626' : '#059669', fontSize: '14px' }}>
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
  const widgetUrl = apiUrl.replace(':3000', ':5173'); // dev用
  const prodNote = 'ビルド後は widget.js を CDN にホストして src を変更してください';

  const snippet = `<!-- AI Sales Widget -->
<script
  src="${widgetUrl}/widget.js"
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
        <p style={s.helpText}>⚠️ {prodNote}</p>
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
              ['data-client-id', 'クライアントID（このページに表示されているID）', '✓'],
              ['data-api-url', 'APIサーバーのURL', '✓'],
            ].map(([attr, desc, req]) => (
              <tr key={attr}>
                <td style={s.td}><code style={s.code}>{attr}</code></td>
                <td style={s.td}>{desc}</td>
                <td style={s.td}>{req}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ ...s.card, marginTop: '16px' }}>
        <h3 style={s.cardTitle}>Client ID</h3>
        <div style={s.idBox}>
          <code style={s.idCode}>{client.id}</code>
          <button style={s.copyBtn} onClick={() => void navigator.clipboard.writeText(client.id)}>
            コピー
          </button>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' },
  pageHeader: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' },
  backBtn: {
    background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px',
    padding: '6px 14px', cursor: 'pointer', fontSize: '14px', color: '#64748b', whiteSpace: 'nowrap',
  },
  title: { margin: '0 0 2px', fontSize: '22px', fontWeight: 700, color: '#0f172a' },
  domain: { margin: 0, fontSize: '13px', color: '#94a3b8' },
  tabs: {
    display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: '24px', gap: '4px',
  },
  tab: {
    padding: '10px 18px', background: 'none', border: 'none', borderBottom: '2px solid transparent',
    cursor: 'pointer', fontSize: '14px', color: '#64748b', marginBottom: '-2px', fontWeight: 500,
  },
  tabActive: { borderBottomColor: '#2563eb', color: '#2563eb' },
  content: {},
  card: {
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px',
    padding: '20px 24px',
  },
  cardTitle: { margin: '0 0 16px', fontSize: '15px', fontWeight: 600, color: '#0f172a' },
  input: {
    display: 'block', width: '100%', padding: '9px 12px', border: '1px solid #d1d5db',
    borderRadius: '6px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  fieldLabel: {
    display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px',
    color: '#374151', marginBottom: '14px',
  },
  primaryBtn: {
    padding: '10px 24px', background: '#2563eb', color: '#fff',
    border: 'none', borderRadius: '7px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
  },
  helpText: { margin: '0 0 12px', fontSize: '13px', color: '#64748b', lineHeight: 1.6 },
  infoText: { margin: '10px 0 0', fontSize: '13px', color: '#2563eb' },
  errorBox: {
    padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5',
    borderRadius: '6px', color: '#dc2626', fontSize: '13px', marginBottom: '12px',
  },
  errorText: { color: '#dc2626', fontSize: '13px', margin: '8px 0 0' },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '16px' },
  pageBtn: {
    padding: '7px 18px', background: '#fff', border: '1px solid #d1d5db',
    borderRadius: '6px', fontSize: '14px', cursor: 'pointer', color: '#374151',
  },
  pageInfo: { fontSize: '13px', color: '#6b7280' },
  knowledgeLayout: { display: 'flex', flexDirection: 'column', gap: '16px' },
  entryList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  entryRow: {
    display: 'flex', alignItems: 'flex-start', gap: '12px',
    padding: '12px', background: '#f8fafc', borderRadius: '8px',
  },
  entryInfo: { flex: 1, minWidth: 0 },
  entryTitle: { fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' },
  entryMeta: { fontSize: '11px', color: '#94a3b8', marginBottom: '4px' },
  entryContent: { fontSize: '12px', color: '#64748b', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
  deleteBtn: {
    background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px',
    padding: '4px', flexShrink: 0, color: '#94a3b8',
  },
  snippetBox: {
    position: 'relative', background: '#0f172a', borderRadius: '8px',
    padding: '16px', marginTop: '12px',
  },
  snippetPre: { margin: 0, color: '#e2e8f0', fontSize: '13px', fontFamily: 'monospace', overflowX: 'auto', whiteSpace: 'pre-wrap' },
  copyBtn: {
    position: 'absolute', top: '10px', right: '10px',
    padding: '4px 12px', background: '#334155', color: '#e2e8f0',
    border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer',
  },
  code: { fontFamily: 'monospace', background: '#f1f5f9', padding: '1px 5px', borderRadius: '3px', fontSize: '13px' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '8px' },
  th: {
    textAlign: 'left', padding: '8px 12px', background: '#f8fafc',
    borderBottom: '1px solid #e5e7eb', fontSize: '13px', color: '#374151', fontWeight: 600,
  },
  td: {
    padding: '8px 12px', borderBottom: '1px solid #f1f5f9',
    fontSize: '13px', color: '#475569',
  },
  idBox: {
    display: 'flex', alignItems: 'center', gap: '12px',
    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 14px',
  },
  idCode: { flex: 1, fontFamily: 'monospace', fontSize: '13px', color: '#0f172a', wordBreak: 'break-all' },
};
