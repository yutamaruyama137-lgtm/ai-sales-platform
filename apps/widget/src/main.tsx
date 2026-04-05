import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

function mount() {
  // スクリプトタグの属性から設定を読み込む
  // <script src="widget.js" data-client-id="xxx" data-api-url="https://..."></script>
  const scripts = document.querySelectorAll('script[data-client-id]');
  const scriptEl = scripts[scripts.length - 1] as HTMLScriptElement | null;

  const clientId =
    scriptEl?.getAttribute('data-client-id') ||
    (window as unknown as Record<string, string>)['AI_SALES_CLIENT_ID'] ||
    (import.meta.env.VITE_CLIENT_ID as string) ||
    '';

  const apiUrl =
    scriptEl?.getAttribute('data-api-url') ||
    (window as unknown as Record<string, string>)['AI_SALES_API_URL'] ||
    '';  // 空文字の場合は相対パス（dev proxy）を使用

  // 既存の #root があれば使う（開発モード）、なければ自動生成（本番埋め込み）
  const existingRoot = document.getElementById('root');

  if (existingRoot) {
    ReactDOM.createRoot(existingRoot).render(
      <React.StrictMode>
        <App clientId={clientId} apiUrl={apiUrl} />
      </React.StrictMode>
    );
  } else {
    // 本番スクリプトタグ埋め込みモード: コンテナを自動生成
    const container = document.createElement('div');
    container.id = 'ai-sales-widget-root';
    document.body.appendChild(container);

    ReactDOM.createRoot(container).render(
      <React.StrictMode>
        <App clientId={clientId} apiUrl={apiUrl} />
      </React.StrictMode>
    );
  }
}

// DOMContentLoaded 後にマウント
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
