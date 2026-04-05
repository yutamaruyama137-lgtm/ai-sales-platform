import React, { useState, useRef, useEffect } from 'react';
import { useChat } from './hooks/useChat';

interface AppProps {
  clientId: string;
  apiUrl: string;
}

const DEFAULT_COLOR = '#2563eb';

export default function App({ clientId, apiUrl }: AppProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const { messages, isLoading, error, sendMessage, config } = useChat({ clientId, apiUrl });
  const messageEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  const isSendDisabled = !inputValue.trim() || isLoading;

  const styles: Record<string, React.CSSProperties> = {
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
      transition: 'background-color 0.2s',
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
      transition: 'background-color 0.2s',
    },
    sendBtnDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  };

  return (
    <>
      {isOpen && (
        <div style={styles.chatWindow} role="dialog" aria-label="チャット">
          <div style={styles.header}>
            <span>{headerTitle}</span>
            <button style={styles.closeBtn} onClick={() => setIsOpen(false)} aria-label="閉じる">
              ✕
            </button>
          </div>

          <div style={styles.messageList} role="log" aria-live="polite">
            {messages.length === 0 && (
              <div
                style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}
              >
                {config?.welcomeMessage || 'メッセージを送信してください'}
              </div>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={msg.role === 'user' ? styles.userBubble : styles.assistantBubble}
              >
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div style={styles.loadingBubble} aria-label="入力中">
                ···
              </div>
            )}
            <div ref={messageEndRef} />
          </div>

          {error && (
            <div style={styles.errorBanner} role="alert">
              {error}
            </div>
          )}

          <div style={styles.inputArea}>
            <textarea
              ref={inputRef}
              style={styles.input}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力... (Enterで送信)"
              rows={1}
              aria-label="メッセージ入力"
            />
            <button
              style={{ ...styles.sendBtn, ...(isSendDisabled ? styles.sendBtnDisabled : {}) }}
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
        style={styles.floatButton}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'チャットを閉じる' : 'チャットを開く'}
        aria-expanded={isOpen}
      >
        {isOpen ? '✕' : buttonText}
      </button>
    </>
  );
}
