import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, ChevronRight, Circle, Server, Sparkles } from 'lucide-react';
import { api, type HealthStatus } from '../services/api';

const BREADCRUMB_MAP: Record<string, string[]> = {
  '/':             ['Dashboard'],
  '/intelligence': ['Progress Intelligence'],
  '/upload':       ['Upload & Ingestion'],
  '/matches':      ['Activity Matches'],
  '/review':       ['Planner Review'],
  '/schedule':     ['Schedule'],
  '/memory':       ['Institutional Memory'],
  '/audit':        ['Audit Trail'],
  '/agent':        ['Time Agent'],
  '/settings':     ['Settings'],
};

interface HeaderProps {
  reviewCount: number;
}

export default function Header({ reviewCount }: HeaderProps) {
  const location = useLocation();
  const crumbs = BREADCRUMB_MAP[location.pathname] ?? [location.pathname.slice(1)];
  const [health, setHealth] = useState<HealthStatus>({ status: 'ONLINE', llmMode: 'DETERMINISTIC_NLP_FALLBACK' });

  useEffect(() => {
    api.checkHealth().then(setHealth).catch(() => setHealth({ status: 'OFFLINE' }));
    const interval = setInterval(() => {
      api.checkHealth().then(setHealth).catch(() => setHealth({ status: 'OFFLINE' }));
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="app-header">
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>SETU</span>
        {crumbs.map((crumb, i) => (
          <React.Fragment key={crumb}>
            <ChevronRight size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <span
              style={{
                fontSize: 13,
                fontWeight: i === crumbs.length - 1 ? 600 : 400,
                color: i === crumbs.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              {crumb}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Backend & AI status pill */}
      <div
        title={
          health.status === 'ONLINE'
            ? `Backend: Online (${health.database}) | AI: ${health.hasGroqKey ? 'Groq Llama 3.3 70B' : 'Deterministic Construction NLP'}`
            : 'Running in Client Demo Mode'
        }
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '5px 12px',
          background: health.status === 'ONLINE'
            ? (health.hasGroqKey ? 'rgba(16,185,129,0.12)' : 'rgba(59,130,246,0.12)')
            : 'rgba(245,158,11,0.12)',
          border: `1px solid ${
            health.status === 'ONLINE'
              ? (health.hasGroqKey ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)')
              : 'rgba(245,158,11,0.3)'
          }`,
          borderRadius: 'var(--r-pill)',
          fontSize: 11,
          fontWeight: 600,
          color: health.status === 'ONLINE'
            ? (health.hasGroqKey ? 'var(--success)' : '#60a5fa')
            : 'var(--warning)',
        }}
      >
        <Circle size={6} fill="currentColor" />
        {health.status === 'ONLINE' ? (
          <>
            <Server size={12} />
            <span>API Connected: {health.hasGroqKey ? 'Groq (Llama 3.3)' : 'Deterministic NLP'}</span>
          </>
        ) : (
          <>
            <Sparkles size={12} />
            <span>Demo Mode (Standalone)</span>
          </>
        )}
      </div>

      {/* Reporting date */}
      <div
        style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          padding: '4px 10px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--bg-border)',
          borderRadius: 'var(--r-md)',
        }}
      >
        Report Date: <strong style={{ color: 'var(--text-primary)', marginLeft: 4 }}>21 Sep 2026</strong>
      </div>

      {/* Notifications */}
      <button
        style={{
          position: 'relative',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--bg-border)',
          borderRadius: 'var(--r-md)',
          padding: '6px 8px',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          transition: 'all var(--t-fast)',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
      >
        <Bell size={16} />
        {reviewCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              background: 'var(--warning)',
              color: '#000',
              fontSize: 9,
              fontWeight: 700,
              width: 16,
              height: 16,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1.5px solid var(--bg-base)',
            }}
          >
            {reviewCount}
          </span>
        )}
      </button>
    </header>
  );
}
