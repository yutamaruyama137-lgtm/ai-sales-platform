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
        <Field label="通知メールアドレス" value={notificationEmail} onChange={setNotificationEmail}
          placeholder="admin@yourcompany.com" />
        <Field label="Webhook URL" value={webhookUrl} onChange={setWebhookUrl}
          placeholder="https://hooks.slack.com/..." />
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
function FlowTab({ client }: { client: Client }) {
  const { updateClient } = useClients();
  const cfg = (client.config as ClientConfig) ?? {};
  const flow = cfg.flowConfig ?? { ctaType: 'none' as const };

  const [ctaType, setCtaType] = useState<'line' | 'form' | 'none'>(flow.ctaType ?? 'none');
  const [lineUrl, setLineUrl] = useState(flow.lineUrl ?? '');
  const [ctaMessage, setCtaMessage] = useState(flow.ctaMessage ?? '');
  const [minMessages, setMinMessages] = useState(String(flow.minMessages ?? 3));
  const [flowSystemPrompt, setFlowSystemPrompt] = useState(flow.flowSystemPrompt ?? '');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const TEMPLATES: Record<string, { systemPrompt: string; ctaMessage: string }> = {
    realestate: {
      systemPrompt: 'あなたは不動産会社のAIアシスタントです。\n【会話の流れ】\n1. お客様のご希望（エリア・予算・間取り・家族構成）をヒアリングしてください。\n2. 条件が揃ったら、おすすめ物件の概算をお伝えしてください。\n3. 詳細資料・内見のご案内を提案する際、必ずメッセージの末尾に [SHOW_CTA] を含めてください。\n\n[SHOW_CTA] は1回のみ使用し、お客様が物件に関心を示したタイミングで使用してください。',
      ctaMessage: '詳細な物件情報や内見日程をLINEでお送りします。ぜひご登録ください！',
    },
    school: {
      systemPrompt: 'あなたはスクールのAIアシスタントです。\n【会話の流れ】\n1. お客様の目標・現在のスキル・受講可能な時間帯をヒアリングしてください。\n2. 最適なコースと料金の目安をお伝えしてください。\n3. 無料体験・個別相談を提案する際、必ずメッセージの末尾に [SHOW_CTA] を含めてください。\n\n[SHOW_CTA] は1回のみ使用し、受講意欲が高まったタイミングで使用してください。',
      ctaMessage: '無料体験レッスンのご予約を承ります。お気軽にお問い合わせください！',
    },
  };

  const applyTemplate = (key: string) => {
    const t = TEMPLATES[key];
    if (!t) return;
    setFlowSystemPrompt(t.systemPrompt);
    setCtaMessage(t.ctaMessage);
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
    const newConfig: ClientConfig = { ...cfg, flowConfig: newFlowConfig };
    const ok = await updateClient(client.id, client.name, client.domain ?? '', newConfig);
    setSaveMsg(ok ? '保存しました' : '保存に失敗しました');
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  return (
    <div style={{ maxWidth: '640px' }}>
      {/* テンプレート */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>業種別テンプレート</h3>
        <p style={s.helpText}>業種を選ぶと、フロープロンプトとCTAメッセージを自動入力します。</p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button style={s.primaryBtn} onClick={() => applyTemplate('realestate')}>不動産</button>
          <button style={s.primaryBtn} onClick={() => applyTemplate('school')}>スクール</button>
        </div>
      </div>

      {/* CTA設定 */}
      <div style={{ ...s.card, marginTop: '16px' }}>
        <h3 style={s.cardTitle}>CTAタイプ</h3>
        <p style={s.helpText}>AIが適切なタイミングで自動的に表示するアクションボタンを選択します。</p>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          {(['none', 'line', 'form'] as const).map((type) => (
            <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
              <input type="radio" name="ctaType" value={type} checked={ctaType === type} onChange={() => setCtaType(type)} />
              {type === 'none' ? '表示しない' : type === 'line' ? 'LINE登録' : '問い合わせフォーム'}
            </label>
          ))}
        </div>

        {ctaType === 'line' && (
          <label style={s.fieldLabel}>
            LINE URL（友だち追加URL）
            <input
              style={s.input}
              value={lineUrl}
              onChange={(e) => setLineUrl(e.target.value)}
              placeholder="https://lin.ee/xxxxxxx"
            />
          </label>
        )}

        {ctaType !== 'none' && (
          <label style={s.fieldLabel}>
            CTAメッセージ（ウィジェット上に表示するテキスト）
            <input
              style={s.input}
              value={ctaMessage}
              onChange={(e) => setCtaMessage(e.target.value)}
              placeholder="詳細をLINEでお送りします。ぜひご登録ください！"
            />
          </label>
        )}

        <label style={s.fieldLabel}>
          CTA表示までの最低メッセージ数
          <input
            style={s.input}
            type="number"
            min="1"
            max="20"
            value={minMessages}
            onChange={(e) => setMinMessages(e.target.value)}
          />
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>この回数以上のやり取りが発生するまでCTAを表示しません（デフォルト: 3）</span>
        </label>
      </div>

      {/* フロープロンプト */}
      <div style={{ ...s.card, marginTop: '16px' }}>
        <h3 style={s.cardTitle}>フロープロンプト（上級者向け）</h3>
        <p style={s.helpText}>
          AIに会話の流れを指示するプロンプトです。空白の場合はデフォルトの指示が使われます。
          CTAを出したいタイミングで <code style={s.code}>[SHOW_CTA]</code> をメッセージに含めるようAIに指示してください。
        </p>
        <textarea
          style={{ ...s.input, height: '180px', resize: 'vertical', marginTop: '8px' }}
          value={flowSystemPrompt}
          onChange={(e) => setFlowSystemPrompt(e.target.value)}
          placeholder="空欄の場合はデフォルトの指示が使われます"
        />
      </div>

      <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          style={{ ...s.primaryBtn, opacity: saving ? 0.6 : 1 }}
          onClick={() => void handleSave()}
          disabled={saving}
        >
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
};
