import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  ShieldCheck,
  User,
  Brain,
  Clock,
} from 'lucide-react';
import {
  formatDatetime,
} from '../data/demoData';
import type { AuditEntry } from '../data/demoData';
import { api } from '../services/api';

export default function AuditTrail() {
  const [logsList, setLogsList] = useState<AuditEntry[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    api.getAuditLogs().then((data) => {
      if (Array.isArray(data)) {
        setLogsList(data);
      }
    }).catch(() => {
      setLogsList([]);
    });
  }, []);

  const filteredLogs = useMemo(() => {
    return logsList.filter((log) => {
      if (sourceFilter !== 'ALL' && log.source !== sourceFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          log.user.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.entity.toLowerCase().includes(q) ||
          (log.newValue ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logsList, sourceFilter, searchQuery]);

  const getSourceIcon = (source: AuditEntry['source']) => {
    switch (source) {
      case 'AI':
        return <Brain size={14} color="var(--accent)" />;
      case 'PLANNER':
        return <User size={14} color="var(--success)" />;
      default:
        return <Clock size={14} color="var(--text-secondary)" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'AUTO_LINK':
        return <span className="badge badge-auto">Auto Linked</span>;
      case 'CORRECTED':
        return <span className="badge badge-warning">Corrected</span>;
      case 'REJECTED':
        return <span className="badge badge-danger">Rejected</span>;
      case 'SCHEDULE_IMPORTED':
        return <span className="badge badge-primary">Schedule Import</span>;
      case 'REPORT_INGESTED':
        return <span className="badge badge-primary">DPR Ingested</span>;
      default:
        return <span className="badge badge-neutral">{action}</span>;
    }
  };

  return (
    <div className="page-enter">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 className="page-title">Immutable Audit Trail & Governance Log</h1>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: 'var(--success)', borderRadius: '12px', padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}>
              <ShieldCheck size={12} /> Cryptographic Verifiable
            </span>
          </div>
          <p className="page-subtitle">
            Complete chronological record of AI decisions, planner approvals, manual corrections, and ingestion events
          </p>
        </div>
      </div>

      {logsList.length === 0 ? (
        <div
          className="card section"
          style={{
            background: 'linear-gradient(135deg, rgba(22,30,53,0.7), rgba(15,22,41,0.9))',
            borderColor: 'rgba(59,130,246,0.3)',
            padding: '48px 32px',
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#60a5fa' }}>
              <Clock size={28} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              No Audit Events Recorded Yet
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Every schedule import, DPR parsing run, automated AI linkage, and planner review approval will be logged here with timestamps and audit proofs.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Controls Bar */}
          <div
            className="section"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div className="filter-group">
              {[
                { key: 'ALL', label: 'All Sources' },
                { key: 'AI', label: 'AI Decisions' },
                { key: 'PLANNER', label: 'Human Actions' },
                { key: 'SYSTEM', label: 'System Sync' },
              ].map((item) => (
                <button
                  key={item.key}
                  className={`filter-btn ${sourceFilter === item.key ? 'active' : ''}`}
                  onClick={() => setSourceFilter(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="search-input-wrap" style={{ width: '300px' }}>
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search user, action, activity code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {filteredLogs.length} events
              </span>
            </div>
          </div>

          {/* Audit Table */}
          <div className="card">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Source</th>
                    <th>User / Agent</th>
                    <th>Action</th>
                    <th>Entity Ref</th>
                    <th>Value Change</th>
                    <th>Audit Explanation</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((entry) => (
                    <tr key={entry.id}>
                      <td className="td-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {formatDatetime(entry.timestamp)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {getSourceIcon(entry.source)}
                          <span style={{ fontSize: '12px', fontWeight: 500 }}>{entry.source}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{entry.user}</td>
                      <td>{getActionBadge(entry.action)}</td>
                      <td>
                        <span className="td-mono" style={{ color: 'var(--accent)', fontSize: '12px' }}>
                          {entry.entity}
                        </span>
                      </td>
                      <td className="td-mono" style={{ fontSize: '12px' }}>
                        {entry.oldValue && (
                          <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                            {entry.oldValue}{' '}
                          </span>
                        )}
                        {entry.newValue && (
                          <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                            {entry.oldValue ? '→ ' : ''}{entry.newValue}
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '320px' }}>
                        {entry.explanation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
