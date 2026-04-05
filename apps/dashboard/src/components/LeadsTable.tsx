import React from 'react';
import type { Lead } from '@ai-sales/types';

interface LeadsTableProps {
  leads: Lead[];
  loading: boolean;
  onViewConversation: (leadId: string) => void;
}

export function LeadsTable({ leads, loading, onViewConversation }: LeadsTableProps): React.ReactElement {
  if (loading) {
    return (
      <div style={styles.skeletonWrapper}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={styles.skeletonRow} />
        ))}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div style={styles.empty}>
        リードが見つかりませんでした
      </div>
    );
  }

  return (
    <div style={styles.tableWrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>日時</th>
            <th style={styles.th}>名前</th>
            <th style={styles.th}>メール</th>
            <th style={styles.th}>電話</th>
            <th style={styles.th}>ページ</th>
            <th style={styles.th}>会話ログ</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} style={styles.tr}>
              <td style={styles.td}>
                {new Date(lead.created_at).toLocaleString('ja-JP', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
              <td style={styles.td}>{lead.name ?? '—'}</td>
              <td style={styles.td}>{lead.email ?? '—'}</td>
              <td style={styles.td}>{lead.phone ?? '—'}</td>
              <td style={{ ...styles.td, ...styles.sourcePage }}>
                {lead.source_page ?? '—'}
              </td>
              <td style={styles.td}>
                <button
                  onClick={() => onViewConversation(lead.id)}
                  style={styles.viewButton}
                >
                  会話を見る
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  tableWrapper: {
    overflowX: 'auto',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    backgroundColor: '#f9fafb',
    color: '#374151',
    fontWeight: 600,
    borderBottom: '1px solid #e5e7eb',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid #f3f4f6',
  },
  td: {
    padding: '12px 16px',
    color: '#374151',
    verticalAlign: 'middle',
  },
  sourcePage: {
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  viewButton: {
    padding: '6px 12px',
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    border: '1px solid #bfdbfe',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  skeletonWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '16px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  skeletonRow: {
    height: '44px',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  empty: {
    padding: '48px',
    textAlign: 'center',
    color: '#6b7280',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
};
