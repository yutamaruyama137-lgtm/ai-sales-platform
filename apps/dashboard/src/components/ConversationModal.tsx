import React, { useEffect } from 'react';
import type { Message } from '@ai-sales/types';
import { useConversation } from '../hooks/useConversation';

interface ConversationModalProps {
  leadId: string;
  onClose: () => void;
}

export function ConversationModal({ leadId, onClose }: ConversationModalProps): React.ReactElement {
  const { conversation, loading } = useConversation(leadId);

  // ESCキーで閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const visibleMessages: Message[] = (conversation?.messages ?? []).filter(
    (m) => m.role !== 'system'
  );

  return (
    <div
      style={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="会話ログ"
    >
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>会話ログ</h2>
          <button onClick={onClose} style={styles.closeButton} aria-label="閉じる">
            ✕
          </button>
        </div>

        <div style={styles.body}>
          {loading && (
            <div style={styles.loading}>
              <div style={styles.spinner} />
              <p style={styles.loadingText}>読み込み中...</p>
            </div>
          )}

          {!loading && !conversation && (
            <div style={styles.empty}>
              会話ログが見つかりませんでした
            </div>
          )}

          {!loading && conversation && visibleMessages.length === 0 && (
            <div style={styles.empty}>
              メッセージがありません
            </div>
          )}

          {!loading && visibleMessages.map((message, index) => (
            <div
              key={index}
              style={{
                ...styles.messageRow,
                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  ...styles.bubble,
                  ...(message.role === 'user' ? styles.userBubble : styles.assistantBubble),
                }}
              >
                <div style={styles.bubbleRole}>
                  {message.role === 'user' ? 'ユーザー' : 'AI'}
                </div>
                <div style={styles.bubbleContent}>{message.content}</div>
                <div style={styles.bubbleTime}>
                  {new Date(message.timestamp).toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '24px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    width: '100%',
    maxWidth: '640px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#1a1a1a',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    lineHeight: 1,
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    gap: '12px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e5e7eb',
    borderTop: '3px solid #2563eb',
    borderRadius: '50%',
  },
  loadingText: {
    margin: 0,
    color: '#6b7280',
    fontSize: '14px',
  },
  empty: {
    textAlign: 'center',
    color: '#6b7280',
    padding: '48px',
  },
  messageRow: {
    display: 'flex',
  },
  bubble: {
    maxWidth: '75%',
    padding: '10px 14px',
    borderRadius: '12px',
    fontSize: '14px',
    lineHeight: 1.5,
  },
  userBubble: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    borderBottomRightRadius: '4px',
  },
  assistantBubble: {
    backgroundColor: '#f3f4f6',
    color: '#1a1a1a',
    borderBottomLeftRadius: '4px',
  },
  bubbleRole: {
    fontSize: '11px',
    fontWeight: 600,
    marginBottom: '4px',
    opacity: 0.75,
  },
  bubbleContent: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  bubbleTime: {
    fontSize: '11px',
    marginTop: '4px',
    opacity: 0.6,
    textAlign: 'right',
  },
};
