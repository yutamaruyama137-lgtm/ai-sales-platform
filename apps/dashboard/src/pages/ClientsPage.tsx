import React, { useState } from 'react';
import type { Client } from '@ai-sales/types';
import { useClients } from '../hooks/useClients';

interface ClientsPageProps {
  onSelectClient: (client: Client) => void;
}

export function ClientsPage({ onSelectClient }: ClientsPageProps): React.ReactElement {
  const { clients, loading, error, createClient } = useClients();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const client = await createClient(newName.trim(), newDomain.trim() || undefined);
      if (client) {
        setShowCreate(false);
        setNewName('');
        setNewDomain('');
      } else {
        setCreateError('作成に失敗しました');
      }
    } catch {
      setCreateError('作成に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>AI Sales Platform</h1>
          <p style={s.subtitle}>クライアント（ウィジェット設置先）を管理します</p>
        </div>
        <button style={s.createBtn} onClick={() => setShowCreate(true)}>
          + 新規クライアント
        </button>
      </div>

      {showCreate && (
        <div style={s.modal}>
          <div style={s.modalBox}>
            <h2 style={s.modalTitle}>新規クライアント作成</h2>
            <label style={s.label}>
              会社名 <span style={s.required}>*</span>
              <input
                style={s.input}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例: 株式会社サンプル"
                autoFocus
              />
            </label>
            <label style={s.label}>
              ドメイン（任意）
              <input
                style={s.input}
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="例: sample.co.jp"
              />
            </label>
            {createError && <p style={s.errorText}>{createError}</p>}
            <div style={s.modalActions}>
              <button style={s.cancelBtn} onClick={() => setShowCreate(false)} disabled={creating}>
                キャンセル
              </button>
              <button style={s.submitBtn} onClick={() => void handleCreate()} disabled={creating || !newName.trim()}>
                {creating ? '作成中...' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <div style={s.errorBox}>{error}</div>}

      {loading ? (
        <div style={s.loadingArea}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={s.skeleton} />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div style={s.emptyState}>
          <p style={s.emptyText}>クライアントがまだありません</p>
          <p style={s.emptySubText}>「新規クライアント」ボタンから追加してください</p>
        </div>
      ) : (
        <div style={s.grid}>
          {clients.map((client) => (
            <button key={client.id} style={s.card} onClick={() => onSelectClient(client)}>
              <div style={s.cardHeader}>
                <div style={s.cardIcon}>{client.name.charAt(0).toUpperCase()}</div>
                <div>
                  <div style={s.cardName}>{client.name}</div>
                  <div style={s.cardDomain}>{client.domain || 'ドメイン未設定'}</div>
                </div>
              </div>
              <div style={s.cardFooter}>
                <span style={s.cardId}>ID: {client.id.slice(0, 8)}...</span>
                <span style={s.cardArrow}>→</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' },
  title: { margin: '0 0 4px', fontSize: '24px', fontWeight: 700, color: '#0f172a' },
  subtitle: { margin: 0, fontSize: '14px', color: '#64748b' },
  createBtn: {
    padding: '10px 20px', backgroundColor: '#2563eb', color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' },
  card: {
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px',
    padding: '20px', cursor: 'pointer', textAlign: 'left', transition: 'box-shadow 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
  },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' },
  cardIcon: {
    width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#eff6ff',
    color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '20px', fontWeight: 700, flexShrink: 0,
  },
  cardName: { fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '2px' },
  cardDomain: { fontSize: '13px', color: '#94a3b8' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardId: { fontSize: '11px', color: '#cbd5e1', fontFamily: 'monospace' },
  cardArrow: { fontSize: '16px', color: '#94a3b8' },
  skeleton: { height: '120px', background: '#f1f5f9', borderRadius: '12px', marginBottom: '12px' },
  loadingArea: {},
  emptyState: { textAlign: 'center', padding: '80px 24px' },
  emptyText: { fontSize: '18px', color: '#475569', margin: '0 0 8px' },
  emptySubText: { fontSize: '14px', color: '#94a3b8', margin: 0 },
  errorBox: {
    padding: '12px 16px', background: '#fef2f2', border: '1px solid #fca5a5',
    borderRadius: '8px', color: '#dc2626', fontSize: '14px', marginBottom: '24px',
  },
  modal: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modalBox: {
    background: '#fff', borderRadius: '12px', padding: '28px 32px',
    width: '420px', maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  modalTitle: { margin: '0 0 20px', fontSize: '18px', fontWeight: 700, color: '#0f172a' },
  label: { display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', color: '#374151', marginBottom: '16px' },
  required: { color: '#dc2626' },
  input: {
    padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '6px',
    fontSize: '14px', outline: 'none',
  },
  errorText: { color: '#dc2626', fontSize: '13px', margin: '0 0 12px' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' },
  cancelBtn: {
    padding: '9px 18px', background: '#f1f5f9', border: '1px solid #e2e8f0',
    borderRadius: '6px', fontSize: '14px', cursor: 'pointer', color: '#475569',
  },
  submitBtn: {
    padding: '9px 18px', background: '#2563eb', color: '#fff',
    border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
  },
};
