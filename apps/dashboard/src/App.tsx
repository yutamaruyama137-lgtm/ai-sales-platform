import React, { useState } from 'react';
import type { Client } from '@ai-sales/types';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { ClientsPage } from './pages/ClientsPage';
import { ClientDetailPage } from './pages/ClientDetailPage';

type View = 'clients' | 'client-detail';

export default function App(): React.ReactElement {
  const { session, loading, signOut } = useAuth();
  const [view, setView] = useState<View>('clients');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  if (loading) {
    return (
      <div style={s.loadingContainer}>
        <div style={s.spinner} />
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <div style={s.root}>
      {/* グローバルナビゲーション */}
      <nav style={s.nav}>
        <button style={s.navBrand} onClick={() => setView('clients')}>
          AI Sales Platform
        </button>
        <div style={s.navRight}>
          <span style={s.navEmail}>{session.user.email}</span>
          <button style={s.logoutBtn} onClick={() => void signOut()}>ログアウト</button>
        </div>
      </nav>

      {/* ページコンテンツ */}
      {view === 'clients' && (
        <ClientsPage
          onSelectClient={(client) => {
            setSelectedClient(client);
            setView('client-detail');
          }}
        />
      )}
      {view === 'client-detail' && selectedClient && (
        <ClientDetailPage
          client={selectedClient}
          onBack={() => {
            setSelectedClient(null);
            setView('clients');
          }}
        />
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: { minHeight: '100vh', backgroundColor: '#f8fafc' },
  loadingContainer: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh',
  },
  spinner: {
    width: '36px', height: '36px', border: '3px solid #e5e7eb',
    borderTop: '3px solid #2563eb', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  nav: {
    backgroundColor: '#0f172a', color: '#fff', padding: '0 24px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
  },
  navBrand: {
    background: 'none', border: 'none', color: '#fff', fontWeight: 700,
    fontSize: '16px', cursor: 'pointer', letterSpacing: '-0.3px',
  },
  navRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  navEmail: { fontSize: '13px', color: '#94a3b8' },
  logoutBtn: {
    padding: '5px 12px', background: 'transparent', border: '1px solid #475569',
    borderRadius: '5px', color: '#94a3b8', fontSize: '12px', cursor: 'pointer',
  },
};
