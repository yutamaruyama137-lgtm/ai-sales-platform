import React, { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useAuth } from '../hooks/useAuth';
import { useLeads } from '../hooks/useLeads';
import { LeadsTable } from '../components/LeadsTable';
import { ConversationModal } from '../components/ConversationModal';

interface DashboardPageProps {
  session: Session;
}

export function DashboardPage({ session }: DashboardPageProps): React.ReactElement {
  const { signOut } = useAuth();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // ユーザーIDをCLIENT_IDとして使用（テスト用）
  const clientId = session.user.id;

  const { leads, loading, error, page, hasMore, nextPage, prevPage } = useLeads(clientId);

  return (
    <div style={styles.container}>
      {/* ヘッダー */}
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>AI Sales Dashboard</h1>
        <div style={styles.headerRight}>
          <span style={styles.userEmail}>{session.user.email}</span>
          <button
            onClick={() => void signOut()}
            style={styles.signOutButton}
          >
            ログアウト
          </button>
        </div>
      </header>

      <main style={styles.main}>
        {/* CLIENT_ID確認セクション */}
        <section style={styles.clientIdSection}>
          <h2 style={styles.sectionTitle}>CLIENT_ID（テスト用）</h2>
          <div style={styles.clientIdBox}>
            <code style={styles.clientIdCode}>{clientId}</code>
            <button
              onClick={() => void navigator.clipboard.writeText(clientId)}
              style={styles.copyButton}
              title="クリップボードにコピー"
            >
              コピー
            </button>
          </div>
          <p style={styles.clientIdNote}>
            このIDをウィジェットの <code>data-client-id</code> に設定してください
          </p>
        </section>

        {/* リード一覧 */}
        <section style={styles.leadsSection}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>リード一覧</h2>
          </div>

          {error && (
            <div style={styles.errorBox} role="alert">
              {error}
            </div>
          )}

          <LeadsTable
            leads={leads}
            loading={loading}
            onViewConversation={(leadId) => setSelectedLeadId(leadId)}
          />

          {/* ページネーション */}
          <div style={styles.pagination}>
            <button
              onClick={prevPage}
              disabled={page === 0 || loading}
              style={{
                ...styles.pageButton,
                ...(page === 0 || loading ? styles.pageButtonDisabled : {}),
              }}
            >
              前へ
            </button>
            <span style={styles.pageInfo}>ページ {page + 1}</span>
            <button
              onClick={nextPage}
              disabled={!hasMore || loading}
              style={{
                ...styles.pageButton,
                ...(!hasMore || loading ? styles.pageButtonDisabled : {}),
              }}
            >
              次へ
            </button>
          </div>
        </section>
      </main>

      {/* 会話ログモーダル */}
      {selectedLeadId && (
        <ConversationModal
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f0f2f5',
  },
  header: {
    backgroundColor: '#1e293b',
    color: '#ffffff',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '56px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  headerTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 700,
    letterSpacing: '-0.3px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  userEmail: {
    fontSize: '13px',
    color: '#94a3b8',
  },
  signOutButton: {
    padding: '6px 14px',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #475569',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  clientIdSection: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '20px 24px',
    border: '1px solid #e5e7eb',
  },
  sectionTitle: {
    margin: '0 0 12px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#1a1a1a',
  },
  clientIdBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '10px 14px',
  },
  clientIdCode: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: '14px',
    color: '#0f172a',
    wordBreak: 'break-all',
  },
  copyButton: {
    padding: '4px 10px',
    backgroundColor: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    color: '#475569',
  },
  clientIdNote: {
    margin: '8px 0 0',
    fontSize: '12px',
    color: '#6b7280',
  },
  leadsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorBox: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fca5a5',
    borderRadius: '6px',
    color: '#dc2626',
    fontSize: '14px',
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  pageButton: {
    padding: '8px 20px',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    color: '#374151',
  },
  pageButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  pageInfo: {
    fontSize: '14px',
    color: '#6b7280',
  },
};
