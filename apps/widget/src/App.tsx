import React, { useState, useRef, useEffect } from 'react';
import { useChat } from './hooks/useChat';
import { leadsApi } from './utils/api';
import { logger } from './utils/logger';

interface AppProps {
  clientId: string;
  apiUrl: string;
}

const DEFAULT_COLOR = '#2563eb';

export default function App({ clientId, apiUrl }: AppProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const { messages, isLoading, error, sendMessage, config, showCta, ctaConfig } = useChat({ clientId, apiUrl });
  const messageEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // LINE form state
  const [ctaDismissed, setCtaDismissed] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formDone, setFormDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const primaryColor = config?.primaryColor || DEFAULT_COLOR;
  const headerTitle = config?.headerTitle || 'AIアシスタント';
  const buttonText = config?.buttonText || '💬';
  const position = config?.position || 'bottom-right';

  const positionStyle: React.CSSProperties =
    position === 'bottom-left'
      ? { bottom: '24px', left: '24px' }
      : { bottom: '24px', right: '24px' };

  const windowPositionStyle: React.CSSProperties =
    position === 'bottom-left'
      ? { bottom: '90px', left: '24px' }
      : { bottom: '90px', right: '24px' };

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

  const handleLineClick = (): void => {
    if (ctaConfig?.lineUrl) {
      window.open(ctaConfig.lineUrl, '_blank', 'noopener,noreferrer');
    }
    setCtaDismissed(true);
  };

  const handleFormSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;
    setFormSubmitting(true);
    setFormError(null);
    try {
      await leadsApi(
        {
          client_id: clientId,
          name: formName.trim(),
          email: formEmail.trim(),
          source_page: window.location.href,
        },
        apiUrl
      );
      setFormDone(true);
    } catch (err) {
      logger.error('Lead form submit error', err);
      setFormError('送信に失敗しました。もう一度お試しください。');
    } finally {
      setFormSubmitting(false);
    }
  };

  const isSendDisabled = !inputValue.trim() || isLoading;
  const showCtaPanel = showCta && !ctaDismissed && ctaConfig && ctaConfig.type !== undefined;

  const s: Record<string, React.CSSProperties> = {
    floatButton: {
      position: 'fixed',
      ...positionStyle,
      width: '56px',
      height: '56px',
      borderRadius: '50%',
      backgroundColor: primaryColor,
      color: '#fff',
      border: 'none',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      zIndex: 9999,
    },
    chatWindow: {
      position: 'fixed',
      ...windowPositionStyle,
      width: '360px',
      height: '520px',
      backgroundColor: '#fff',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      zIndex: 9998,
    },
    header: {
      backgroundColor: primaryColor,
      color: '#fff',
      padding: '14px 16px',
      fontWeight: 600,
      fontSize: '15px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
    },
    closeBtn: {
      background: 'none',
      border: 'none',
      color: '#fff',
      cursor: 'pointer',
      fontSize: '18px',
      lineHeight: 1,
      padding: '0 4px',
    },
    messageList: {
      flex: 1,
      overflowY: 'auto',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    userBubble: {
      alignSelf: 'flex-end',
      backgroundColor: primaryColor,
      color: '#fff',
      borderRadius: '18px 18px 4px 18px',
      padding: '8px 14px',
      maxWidth: '80%',
      wordBreak: 'break-word',
      fontSize: '14px',
    },
    assistantBubble: {
      alignSelf: 'flex-start',
      backgroundColor: '#f1f5f9',
      color: '#1e293b',
      borderRadius: '18px 18px 18px 4px',
      padding: '8px 14px',
      maxWidth: '80%',
      wordBreak: 'break-word',
      fontSize: '14px',
    },
    loadingBubble: {
      alignSelf: 'flex-start',
      backgroundColor: '#f1f5f9',
      color: '#64748b',
      borderRadius: '18px 18px 18px 4px',
      padding: '8px 14px',
      fontSize: '14px',
    },
    errorBanner: {
      backgroundColor: '#fee2e2',
      color: '#b91c1c',
      fontSize: '13px',
      padding: '8px 12px',
      flexShrink: 0,
    },
    // CTA パネル
    ctaPanel: {
      borderTop: '1px solid #e2e8f0',
      padding: '14px 16px',
      backgroundColor: '#f8faff',
      flexShrink: 0,
    },
    ctaMessage: {
      fontSize: '13px',
      color: '#334155',
      marginBottom: '10px',
      lineHeight: 1.5,
    },
    lineBtn: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      width: '100%',
      padding: '10px 0',
      backgroundColor: '#06C755',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
    },
    ctaDismissBtn: {
      display: 'block',
      width: '100%',
      textAlign: 'center',
      background: 'none',
      border: 'none',
      color: '#94a3b8',
      fontSize: '12px',
      cursor: 'pointer',
      marginTop: '6px',
      padding: '4px 0',
    },
    ctaInput: {
      display: 'block',
      width: '100%',
      border: '1px solid #cbd5e1',
      borderRadius: '6px',
      padding: '7px 10px',
      fontSize: '13px',
      outline: 'none',
      boxSizing: 'border-box',
      fontFamily: 'inherit',
      marginBottom: '8px',
    },
    ctaSubmitBtn: {
      width: '100%',
      padding: '9px 0',
      backgroundColor: primaryColor,
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: 600,
      cursor: 'pointer',
    },
    inputArea: {
      borderTop: '1px solid #e2e8f0',
      padding: '10px 12px',
      display: 'flex',
      gap: '8px',
      flexShrink: 0,
      backgroundColor: '#fff',
    },
    input: {
      flex: 1,
      border: '1px solid #cbd5e1',
      borderRadius: '8px',
      padding: '8px 12px',
      fontSize: '14px',
      outline: 'none',
      resize: 'none',
      fontFamily: 'inherit',
    },
    sendBtn: {
      backgroundColor: primaryColor,
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      padding: '8px 14px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 500,
      whiteSpace: 'nowrap',
    },
    sendBtnDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  };

  return (
    <>
      {isOpen && (
        <div style={s.chatWindow} role="dialog" aria-label="チャット">
          <div style={s.header}>
            <span>{headerTitle}</span>
            <button style={s.closeBtn} onClick={() => setIsOpen(false)} aria-label="閉じる">
              ✕
            </button>
          </div>

          <div style={s.messageList} role="log" aria-live="polite">
            {messages.length === 0 && (
              <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>
                {config?.welcomeMessage || 'メッセージを送信してください'}
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} style={msg.role === 'user' ? s.userBubble : s.assistantBubble}>
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div style={s.loadingBubble} aria-label="入力中">···</div>
            )}
            <div ref={messageEndRef} />
          </div>

          {error && (
            <div style={s.errorBanner} role="alert">{error}</div>
          )}

          {/* CTA パネル */}
          {showCtaPanel && (
            <div style={s.ctaPanel}>
              {ctaConfig.message && (
                <p style={s.ctaMessage}>{ctaConfig.message}</p>
              )}

              {ctaConfig.type === 'line' ? (
                <>
                  <button style={s.lineBtn} onClick={handleLineClick}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                    </svg>
                    LINEで詳しく聞く
                  </button>
                  <button style={s.ctaDismissBtn} onClick={() => setCtaDismissed(true)}>
                    後で
                  </button>
                </>
              ) : formDone ? (
                <p style={{ fontSize: '13px', color: '#059669', fontWeight: 600, textAlign: 'center', margin: 0 }}>
                  ありがとうございます！ご連絡お待ちしております。
                </p>
              ) : (
                <form onSubmit={(e) => void handleFormSubmit(e)}>
                  <input
                    style={s.ctaInput}
                    type="text"
                    placeholder="お名前"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                  <input
                    style={s.ctaInput}
                    type="email"
                    placeholder="メールアドレス"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    required
                  />
                  {formError && <p style={{ color: '#b91c1c', fontSize: '12px', margin: '0 0 6px' }}>{formError}</p>}
                  <button
                    type="submit"
                    style={{ ...s.ctaSubmitBtn, opacity: formSubmitting ? 0.6 : 1 }}
                    disabled={formSubmitting}
                  >
                    {formSubmitting ? '送信中...' : '無料相談を申し込む'}
                  </button>
                  <button style={s.ctaDismissBtn} type="button" onClick={() => setCtaDismissed(true)}>
                    後で
                  </button>
                </form>
              )}
            </div>
          )}

          <div style={s.inputArea}>
            <textarea
              ref={inputRef}
              style={s.input}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力... (Enterで送信)"
              rows={1}
              aria-label="メッセージ入力"
            />
            <button
              style={{ ...s.sendBtn, ...(isSendDisabled ? s.sendBtnDisabled : {}) }}
              onClick={() => void handleSend()}
              disabled={isSendDisabled}
              aria-label="送信"
            >
              送信
            </button>
          </div>
        </div>
      )}

      <button
        style={s.floatButton}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'チャットを閉じる' : 'チャットを開く'}
        aria-expanded={isOpen}
      >
        {isOpen ? '✕' : buttonText}
      </button>
    </>
  );
}
