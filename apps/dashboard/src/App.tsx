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
          <span style={s.navLogo}>S</span>
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
  root: { minHeight: '100vh', backgroundColor: '#f6f5f4' },
  loadingContainer: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh',
    backgroundColor: '#f6f5f4',
  },
  spinner: {
    width: '32px', height: '32px', border: '2px solid rgba(0,0,0,0.1)',
    borderTop: '2px solid #0075de', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  nav: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid rgba(0,0,0,0.1)',
    padding: '0 24px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px',
  },
  navBrand: {
    background: 'none', border: 'none', color: 'rgba(0,0,0,0.95)', fontWeight: 700,
    fontSize: '15px', cursor: 'pointer', letterSpacing: '-0.3px',
    display: 'flex', alignItems: 'center', gap: '8px', padding: 0,
    fontFamily: 'inherit',
  },
  navLogo: {
    width: '28px', height: '28px', backgroundColor: '#0075de', color: '#fff',
    borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '13px', fontWeight: 700, flexShrink: 0,
  },
  navRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  navEmail: { fontSize: '14px', color: '#615d59', fontWeight: 500 },
  logoutBtn: {
    padding: '6px 14px', background: 'rgba(0,0,0,0.05)', border: '1px solid transparent',
    borderRadius: '4px', color: 'rgba(0,0,0,0.7)', fontSize: '14px', cursor: 'pointer',
    fontWeight: 500, fontFamily: 'inherit',
  },
};
