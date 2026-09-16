import { useEffect, useRef } from 'react';
import { getConfidenceClass } from '../../data/demoData';

interface ConfidenceBarProps {
  value: number;    // 0–100
  showLabel?: boolean;
  animated?: boolean;
  delay?: number;   // ms
}

export default function ConfidenceBar({ value, showLabel = true, animated = true, delay = 0 }: ConfidenceBarProps) {
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animated || !fillRef.current) return;
    const el = fillRef.current;
    el.style.width = '0%';
    const timer = setTimeout(() => {
      el.style.width = `${value}%`;
    }, delay + 50);
    return () => clearTimeout(timer);
  }, [value, animated, delay]);

  const fillClass = getConfidenceClass(value);
  const labelColor = value >= 85 ? 'var(--success)' : value >= 70 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div className="confidence-bar">
      <div className="confidence-track">
        <div
          ref={fillRef}
          className={`confidence-fill ${fillClass}`}
          style={{ width: animated ? '0%' : `${value}%` }}
        />
      </div>
      {showLabel && (
        <span className="confidence-label" style={{ color: labelColor }}>
          {value}%
        </span>
      )}
    </div>
  );
}
