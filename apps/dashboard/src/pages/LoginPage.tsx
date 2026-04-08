import React, { useState, FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';

type Mode = 'login' | 'signup';

export function LoginPage(): React.ReactElement {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    if (mode === 'login') {
      const result = await signIn(email, password);
      if (result.error) setError(result.error);
    } else {
      const result = await signUp(email, password);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('確認メールを送りました。メール内のリンクをクリックするとログインできます。');
        setMode('login');
      }
    }

    setSubmitting(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* ロゴ */}
        <div style={styles.logoArea}>
          <div style={styles.logoIcon}>S</div>
          <h1 style={styles.title}>AI Sales Platform</h1>
        </div>
        <p style={styles.subtitle}>{mode === 'login' ? '管理者ログイン' : 'アカウント作成'}</p>

        <form onSubmit={(e) => void handleSubmit(e)} style={styles.form}>
          <div style={styles.field}>
            <label htmlFor="email" style={styles.label}>メールアドレス</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={styles.input}
              placeholder="admin@example.com"
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="password" style={styles.label}>パスワード</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              style={styles.input}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div style={styles.errorBox} role="alert">{error}</div>
          )}
          {success && (
            <div style={styles.successBox} role="status">{success}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{ ...styles.button, ...(submitting ? styles.buttonDisabled : {}) }}
          >
            {submitting
              ? (mode === 'login' ? 'ログイン中...' : '作成中...')
              : (mode === 'login' ? 'ログイン' : 'アカウント作成')}
          </button>
        </form>

        <div style={styles.switchArea}>
          {mode === 'login' ? (
            <>
              <span style={styles.switchText}>アカウントをお持ちでない方は</span>
              <button style={styles.switchBtn} onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}>
                新規登録
              </button>
            </>
          ) : (
            <>
              <span style={styles.switchText}>すでにアカウントをお持ちの方は</span>
              <button style={styles.switchBtn} onClick={() => { setMode('login'); setError(null); setSuccess(null); }}>
                ログイン
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', backgroundColor: '#f6f5f4', padding: '24px',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: '12px',
    boxShadow: 'rgba(0,0,0,0.04) 0px 4px 18px, rgba(0,0,0,0.027) 0px 2px 8px, rgba(0,0,0,0.02) 0px 0.8px 3px',
    padding: '40px 36px',
    width: '100%',
    maxWidth: '400px',
  },
  logoArea: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '6px' },
  logoIcon: {
    width: '36px', height: '36px', backgroundColor: '#0075de', color: '#fff',
    borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '16px', fontWeight: 700, flexShrink: 0,
  },
  title: { margin: 0, fontSize: '22px', fontWeight: 700, color: 'rgba(0,0,0,0.95)', letterSpacing: '-0.25px' },
  subtitle: { margin: '0 0 32px', fontSize: '14px', color: '#615d59', textAlign: 'center', fontWeight: 500 },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '14px', fontWeight: 500, color: '#31302e' },
  input: {
    padding: '8px 10px', border: '1px solid #dddddd', borderRadius: '4px',
    fontSize: '15px', outline: 'none', color: 'rgba(0,0,0,0.9)',
    fontFamily: 'inherit', lineHeight: 1.5,
  },
  errorBox: {
    padding: '10px 12px', backgroundColor: '#fef2f2', border: '1px solid rgba(220,38,38,0.2)',
    borderRadius: '6px', color: '#dc2626', fontSize: '14px',
  },
  successBox: {
    padding: '10px 12px', backgroundColor: '#f0fdf4', border: '1px solid rgba(5,150,105,0.2)',
    borderRadius: '6px', color: '#059669', fontSize: '14px',
  },
  button: {
    padding: '8px 16px', backgroundColor: '#0075de', color: '#ffffff',
    border: '1px solid transparent',
    borderRadius: '4px', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
    marginTop: '8px', fontFamily: 'inherit',
  },
  buttonDisabled: { backgroundColor: '#62aef0', cursor: 'not-allowed' },
  switchArea: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '28px' },
  switchText: { fontSize: '14px', color: '#615d59' },
  switchBtn: {
    background: 'none', border: 'none', color: '#0075de', fontSize: '14px',
    fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit',
  },
};
