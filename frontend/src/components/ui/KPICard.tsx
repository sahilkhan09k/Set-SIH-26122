import type React from 'react';
import { useEffect, useState } from 'react';

interface KPICardProps {
  label: string;
  value: number;
  suffix?: string;
  sub?: string;
  color?: string;
  icon?: React.ReactNode;
  trend?: number;
  format?: 'number' | 'percent';
}

function animateValue(from: number, to: number, duration: number, onUpdate: (v: number) => void) {
  const start = performance.now();
  const update = (now: number) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    onUpdate(Math.round(from + (to - from) * eased));
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

export default function KPICard({ label, value, suffix, sub, color = 'var(--accent)', icon, trend, format = 'number' }: KPICardProps) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    animateValue(0, value, 800, setDisplayed);
  }, [value]);

  const trendColor = trend == null ? undefined : trend >= 0 ? 'var(--success)' : 'var(--danger)';

  return (
    <div className="kpi-card" style={{ '--kpi-color': color } as React.CSSProperties}>
      {/* Top: label + icon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="kpi-label">{label}</div>
        {icon && (
          <div style={{ color, opacity: 0.7, display: 'flex' }}>{icon}</div>
        )}
      </div>

      {/* Value */}
      <div className="kpi-value" style={{ color }}>
        {format === 'percent' ? `${displayed}%` : displayed.toLocaleString()}{suffix}
      </div>

      {/* Sub / trend */}
      {(sub || trend != null) && (
        <div className="kpi-sub">
          {trend != null && (
            <span style={{ color: trendColor, fontWeight: 600 }}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
          {sub && <span style={{ color: 'var(--text-muted)' }}>{sub}</span>}
        </div>
      )}
    </div>
  );
}
