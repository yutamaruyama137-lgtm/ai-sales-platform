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
          <h1 style={s.title}>クライアント一覧</h1>
          <p style={s.subtitle}>ウィジェット設置先のクライアントを管理します</p>
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
  container: { maxWidth: '1100px', margin: '0 auto', padding: '48px 24px' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '40px' },
  title: { margin: '0 0 6px', fontSize: '26px', fontWeight: 700, color: 'rgba(0,0,0,0.95)', letterSpacing: '-0.625px' },
  subtitle: { margin: 0, fontSize: '15px', color: '#615d59', fontWeight: 400 },
  createBtn: {
    padding: '8px 16px', backgroundColor: '#0075de', color: '#fff',
    border: '1px solid transparent', borderRadius: '4px', fontSize: '15px', fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' },
  card: {
    background: '#fff',
    border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: '12px',
    padding: '20px',
    cursor: 'pointer',
    textAlign: 'left',
    boxShadow: 'rgba(0,0,0,0.04) 0px 4px 18px, rgba(0,0,0,0.027) 0px 2px 8px, rgba(0,0,0,0.02) 0px 0.8px 3px',
    transition: 'box-shadow 0.15s ease',
    fontFamily: 'inherit',
  },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' },
  cardIcon: {
    width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#f2f9ff',
    color: '#0075de', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '20px', fontWeight: 700, flexShrink: 0,
  },
  cardName: { fontSize: '16px', fontWeight: 700, color: 'rgba(0,0,0,0.95)', marginBottom: '2px', letterSpacing: '-0.25px' },
  cardDomain: { fontSize: '13px', color: '#a39e98', fontWeight: 500 },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardId: { fontSize: '11px', color: '#a39e98', fontFamily: 'monospace', letterSpacing: '0.125px' },
  cardArrow: { fontSize: '14px', color: '#a39e98' },
  skeleton: {
    height: '120px',
    background: 'linear-gradient(90deg, #f6f5f4 25%, #eeedec 50%, #f6f5f4 75%)',
    borderRadius: '12px',
    marginBottom: '12px',
    border: '1px solid rgba(0,0,0,0.06)',
  },
  loadingArea: {},
  emptyState: { textAlign: 'center', padding: '96px 24px' },
  emptyText: { fontSize: '18px', color: '#31302e', margin: '0 0 8px', fontWeight: 600 },
  emptySubText: { fontSize: '14px', color: '#a39e98', margin: 0 },
  errorBox: {
    padding: '12px 16px', background: '#fef2f2', border: '1px solid rgba(220,38,38,0.2)',
    borderRadius: '8px', color: '#dc2626', fontSize: '14px', marginBottom: '24px',
  },
  modal: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modalBox: {
    background: '#fff',
    border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: '12px',
    padding: '28px 32px',
    width: '420px',
    maxWidth: '90vw',
    boxShadow: 'rgba(0,0,0,0.01) 0px 1px 3px, rgba(0,0,0,0.02) 0px 3px 7px, rgba(0,0,0,0.02) 0px 7px 15px, rgba(0,0,0,0.04) 0px 14px 28px, rgba(0,0,0,0.05) 0px 23px 52px',
  },
  modalTitle: { margin: '0 0 22px', fontSize: '22px', fontWeight: 700, color: 'rgba(0,0,0,0.95)', letterSpacing: '-0.25px' },
  label: { display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', color: '#31302e', marginBottom: '16px', fontWeight: 500 },
  required: { color: '#dc2626', display: 'inline' },
  input: {
    padding: '6px 10px', border: '1px solid #dddddd', borderRadius: '4px',
    fontSize: '15px', outline: 'none', color: 'rgba(0,0,0,0.9)',
    fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
  },
  errorText: { color: '#dc2626', fontSize: '13px', margin: '0 0 12px' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' },
  cancelBtn: {
    padding: '8px 16px', background: 'rgba(0,0,0,0.05)', border: '1px solid transparent',
    borderRadius: '4px', fontSize: '14px', cursor: 'pointer', color: 'rgba(0,0,0,0.7)',
    fontWeight: 500, fontFamily: 'inherit',
  },
  submitBtn: {
    padding: '8px 16px', background: '#0075de', color: '#fff',
    border: '1px solid transparent', borderRadius: '4px', fontSize: '14px', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  },
};
