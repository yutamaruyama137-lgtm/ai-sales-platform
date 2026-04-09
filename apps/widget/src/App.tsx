import React, { useState, useRef, useEffect } from 'react';
import { useChat } from './hooks/useChat';
import { leadsApi } from './utils/api';
import { logger } from './utils/logger';

interface AppProps {
  clientId: string;
  apiUrl: string;
}

const DEFAULT_COLOR = '#2563eb';

// ウィジェット用CSSアニメーションを一度だけDOMに挿入
let stylesInjected = false;
function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ai-pulse-ring {
      0%   { transform: scale(1);   opacity: 0.6; }
      100% { transform: scale(1.9); opacity: 0; }
    }
    @keyframes ai-bounce-in {
      0%   { transform: scale(0.5); opacity: 0; }
      70%  { transform: scale(1.08); }
      100% { transform: scale(1);   opacity: 1; }
    }
    @keyframes ai-fade-in {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes ai-typing {
      0%, 60%, 100% { transform: translateY(0); }
      30%           { transform: translateY(-6px); }
    }
    .ai-chat-window { animation: ai-bounce-in 0.25s cubic-bezier(.34,1.56,.64,1) both; }
    .ai-msg         { animation: ai-fade-in 0.2s ease both; }
    .ai-dot-1 { animation: ai-typing 1.2s ease infinite 0s; }
    .ai-dot-2 { animation: ai-typing 1.2s ease infinite 0.2s; }
    .ai-dot-3 { animation: ai-typing 1.2s ease infinite 0.4s; }
    .ai-pulse-1 { animation: ai-pulse-ring 2s ease-out infinite 0s; }
    .ai-pulse-2 { animation: ai-pulse-ring 2s ease-out infinite 0.6s; }
    .ai-float-btn:hover { filter: brightness(1.1); transform: scale(1.07) !important; }
    .ai-float-btn { transition: transform 0.15s ease, filter 0.15s ease !important; }
  `;
  document.head.appendChild(style);
}

// アニメーション付きチャットアイコン SVG
function ChatSVG({ color }: { color: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="4" width="28" height="20" rx="6" fill="white" fillOpacity="0.95"/>
      <circle cx="10" cy="14" r="2" fill={color}/>
      <circle cx="16" cy="14" r="2" fill={color}/>
      <circle cx="22" cy="14" r="2" fill={color}/>
      <path d="M8 24 L4 29 L14 24" fill="white" fillOpacity="0.95"/>
      <circle cx="26" cy="7" r="5" fill="#22c55e"/>
      <path d="M23.5 7 L25.5 9 L29 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// エラーの種別に応じたメッセージ
function errorMessage(err: string | null): string {
  if (!err) return '';
  if (err.includes('AI_UNAVAILABLE') || err.includes('503')) {
    return 'AIが一時的に混み合っています。少し待ってから再送信してください。';
  }
  if (err.includes('404')) {
    return 'このチャットの設定が見つかりません。管理者にご連絡ください。';
  }
  if (err.includes('network') || err.includes('fetch') || err.toLowerCase().includes('failed to fetch')) {
    return 'ネットワークエラーが発生しました。接続を確認して再度お試しください。';
  }
  return 'エラーが発生しました。再度お試しください。';
}

export default function App({ clientId, apiUrl }: AppProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const { messages, isLoading, error, sendMessage, config, showCta, ctaConfig, retrySend } = useChat({ clientId, apiUrl });
  const messageEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [ctaDismissed, setCtaDismissed] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formDone, setFormDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const primaryColor = config?.primaryColor || DEFAULT_COLOR;
  const headerTitle = config?.headerTitle || 'AIアシスタント';
  const position = config?.position || 'bottom-right';
  const buttonIconUrl = config?.buttonIconUrl || null;

  useEffect(() => { injectStyles(); }, []);

  const positionStyle: React.CSSProperties =
    position === 'bottom-left' ? { bottom: '24px', left: '24px' } : { bottom: '24px', right: '24px' };
  const windowPositionStyle: React.CSSProperties =
    position === 'bottom-left' ? { bottom: '90px', left: '24px' } : { bottom: '90px', right: '24px' };

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleSend = async (): Promise<void> => {
    const text = inputValue.trim();
    if (!text || isLoading) return;
    setInputValue('');
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleFormSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;
    setFormSubmitting(true);
    setFormError(null);
    try {
      await leadsApi({ client_id: clientId, name: formName.trim(), email: formEmail.trim(), source_page: window.location.href }, apiUrl);
      setFormDone(true);
    } catch (err) {
      logger.error('Lead form error', err);
      setFormError('送信に失敗しました。もう一度お試しください。');
    } finally {
      setFormSubmitting(false);
    }
  };

  const isSendDisabled = !inputValue.trim() || isLoading;
  const showCtaPanel = showCta && !ctaDismissed && ctaConfig?.type;
  const errMsg = errorMessage(error);

  const s: Record<string, React.CSSProperties> = {
    // フローティングボタン
    floatWrap: {
      position: 'fixed',
      ...positionStyle,
      zIndex: 9999,
      width: '60px',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pulseRing: {
      position: 'absolute',
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      backgroundColor: primaryColor,
      opacity: 0,
      pointerEvents: 'none',
    },
    floatButton: {
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      backgroundColor: primaryColor,
      color: '#fff',
      border: 'none',
      cursor: 'pointer',
      boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '22px',
      zIndex: 1,
      position: 'relative',
    },
    // チャットウィンドウ
    chatWindow: {
      position: 'fixed',
      ...windowPositionStyle,
      width: '360px',
      height: 'min(530px, calc(100vh - 110px))',
      backgroundColor: '#fff',
      borderRadius: '16px',
      boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      zIndex: 9998,
    },
    header: {
      background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
      color: '#fff',
      padding: '14px 16px',
      fontWeight: 600,
      fontSize: '15px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
    },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
    avatarDot: {
      width: '10px', height: '10px', borderRadius: '50%',
      backgroundColor: '#4ade80', border: '2px solid rgba(255,255,255,0.6)',
    },
    closeBtn: {
      background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
      cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '4px 8px',
      borderRadius: '6px',
    },
    messageList: {
      flex: 1, overflowY: 'auto', padding: '14px 12px',
      display: 'flex', flexDirection: 'column', gap: '10px',
      backgroundColor: '#f8fafc',
    },
    userBubble: {
      alignSelf: 'flex-end', backgroundColor: primaryColor, color: '#fff',
      borderRadius: '18px 18px 4px 18px', padding: '9px 14px',
      maxWidth: '78%', wordBreak: 'break-word', fontSize: '14px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
    },
    assistantBubble: {
      alignSelf: 'flex-start', backgroundColor: '#fff', color: '#1e293b',
      borderRadius: '18px 18px 18px 4px', padding: '9px 14px',
      maxWidth: '78%', wordBreak: 'break-word', fontSize: '14px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.07)',
      border: '1px solid #e2e8f0',
    },
    typingWrap: {
      alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: '18px 18px 18px 4px',
      padding: '12px 16px', boxShadow: '0 2px 6px rgba(0,0,0,0.07)',
      border: '1px solid #e2e8f0', display: 'flex', gap: '5px', alignItems: 'center',
    },
    dot: {
      width: '7px', height: '7px', borderRadius: '50%', backgroundColor: primaryColor,
    },
    // エラーバナー
    errorBanner: {
      backgroundColor: '#fef2f2', borderTop: '1px solid #fecaca',
      padding: '10px 14px', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
    },
    errorText: { color: '#b91c1c', fontSize: '13px', flex: 1, lineHeight: 1.4 },
    retryBtn: {
      backgroundColor: '#dc2626', color: '#fff', border: 'none',
      borderRadius: '6px', padding: '5px 12px', fontSize: '12px',
      cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' as const, fontFamily: 'inherit',
    },
    // CTAパネル
    ctaPanel: {
      borderTop: '1px solid #e2e8f0', padding: '14px 16px',
      backgroundColor: '#f0f7ff', flexShrink: 0,
    },
    ctaMsg: { fontSize: '13px', color: '#1e40af', marginBottom: '10px', lineHeight: 1.5, fontWeight: 500 },
    lineBtn: {
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
      width: '100%', padding: '11px 0', backgroundColor: '#06C755',
      color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px',
      fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
      boxShadow: '0 3px 10px rgba(6,199,85,0.35)',
    },
    skipBtn: {
      display: 'block', width: '100%', textAlign: 'center' as const, background: 'none',
      border: 'none', color: '#94a3b8', fontSize: '12px', cursor: 'pointer',
      marginTop: '7px', padding: '3px 0', fontFamily: 'inherit',
    },
    ctaInput: {
      display: 'block', width: '100%', border: '1px solid #cbd5e1',
      borderRadius: '8px', padding: '8px 11px', fontSize: '13px',
      outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit', marginBottom: '8px',
    },
    ctaSubmitBtn: {
      width: '100%', padding: '10px 0', backgroundColor: primaryColor,
      color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px',
      fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    },
    // 入力エリア
    inputArea: {
      borderTop: '1px solid #e2e8f0', padding: '10px 12px',
      display: 'flex', gap: '8px', flexShrink: 0, backgroundColor: '#fff',
    },
    input: {
      flex: 1, border: '1px solid #e2e8f0', borderRadius: '10px',
      padding: '9px 12px', fontSize: '14px', outline: 'none',
      resize: 'none' as const, fontFamily: 'inherit', backgroundColor: '#f8fafc',
    },
    sendBtn: {
      backgroundColor: primaryColor, color: '#fff', border: 'none',
      borderRadius: '10px', padding: '9px 14px', cursor: 'pointer',
      fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap' as const,
    },
    sendBtnDisabled: { opacity: 0.45, cursor: 'not-allowed' },
  };

  return (
    <>
      {isOpen && (
        <div className="ai-chat-window" style={s.chatWindow} role="dialog" aria-label="チャット">
          {/* ヘッダー */}
          <div style={s.header}>
            <div style={s.headerLeft}>
              <div style={s.avatarDot} />
              <span>{headerTitle}</span>
            </div>
            <button style={s.closeBtn} onClick={() => setIsOpen(false)} aria-label="閉じる">✕</button>
          </div>

          {/* メッセージ一覧 */}
          <div style={s.messageList} role="log" aria-live="polite">
            {messages.length === 0 && (
              <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', marginTop: '24px', lineHeight: 1.6 }}>
                {config?.welcomeMessage || 'こんにちは！\nご質問はお気軽にどうぞ。'}
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className="ai-msg" style={msg.role === 'user' ? s.userBubble : s.assistantBubble}>
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div style={s.typingWrap} aria-label="入力中">
                <span className="ai-dot-1" style={s.dot} />
                <span className="ai-dot-2" style={s.dot} />
                <span className="ai-dot-3" style={s.dot} />
              </div>
            )}
            <div ref={messageEndRef} />
          </div>

          {/* エラーバナー（リトライボタン付き） */}
          {error && (
            <div style={s.errorBanner} role="alert">
              <span style={s.errorText}>{errMsg}</span>
              <button style={s.retryBtn} onClick={() => retrySend?.()}>再送信</button>
            </div>
          )}

          {/* CTAパネル */}
          {showCtaPanel && ctaConfig && (
            <div style={s.ctaPanel}>
              {ctaConfig.message && <p style={s.ctaMsg}>{ctaConfig.message}</p>}
              {ctaConfig.type === 'line' ? (
                <>
                  <button style={s.lineBtn} onClick={() => { window.open(ctaConfig.lineUrl, '_blank', 'noopener'); setCtaDismissed(true); }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                    </svg>
                    LINEで詳しく聞く
                  </button>
                  <button style={s.skipBtn} onClick={() => setCtaDismissed(true)}>後で</button>
                </>
              ) : formDone ? (
                <p style={{ fontSize: '13px', color: '#059669', fontWeight: 700, textAlign: 'center', margin: 0 }}>
                  ✓ ありがとうございます！担当者よりご連絡します。
                </p>
              ) : (
                <form onSubmit={(e) => void handleFormSubmit(e)}>
                  <input style={s.ctaInput} type="text" placeholder="お名前" value={formName} onChange={(e) => setFormName(e.target.value)} required />
                  <input style={s.ctaInput} type="email" placeholder="メールアドレス" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} required />
                  {formError && <p style={{ color: '#b91c1c', fontSize: '12px', margin: '0 0 6px' }}>{formError}</p>}
                  <button type="submit" style={{ ...s.ctaSubmitBtn, opacity: formSubmitting ? 0.6 : 1 }} disabled={formSubmitting}>
                    {formSubmitting ? '送信中...' : '無料相談を申し込む'}
                  </button>
                  <button type="button" style={s.skipBtn} onClick={() => setCtaDismissed(true)}>後で</button>
                </form>
              )}
            </div>
          )}

          {/* 入力エリア */}
          <div style={s.inputArea}>
            <textarea
              ref={inputRef}
              style={s.input}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力… (Enterで送信)"
              rows={1}
              aria-label="メッセージ入力"
            />
            <button
              style={{ ...s.sendBtn, ...(isSendDisabled ? s.sendBtnDisabled : {}) }}
              onClick={() => void handleSend()}
              disabled={isSendDisabled}
            >
              ↑
            </button>
          </div>
        </div>
      )}

      {/* フローティングボタン（アニメーション付き） */}
      <div style={s.floatWrap}>
        {!isOpen && (
          <>
            <span className="ai-pulse-1" style={s.pulseRing} />
            <span className="ai-pulse-2" style={s.pulseRing} />
          </>
        )}
        <button
          className="ai-float-btn"
          style={s.floatButton}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={isOpen ? 'チャットを閉じる' : 'チャットを開く'}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : buttonIconUrl ? (
            <img src={buttonIconUrl} alt="chat" width="34" height="34" style={{ objectFit: 'contain', borderRadius: '4px' }} />
          ) : (
            <ChatSVG color={primaryColor} />
          )}
        </button>
      </div>
    </>
  );
}
