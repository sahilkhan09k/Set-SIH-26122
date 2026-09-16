import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { sCurveData } from '../../data/demoData';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      style={{
        background: '#161e35',
        border: '1px solid #253352',
        borderRadius: '8px',
        padding: '10px 14px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
      }}
    >
      <div style={{ color: '#8b98b8', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
        Month: {label} 2026
      </div>
      {payload.map((entry, idx) => (
        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', margin: '3px 0' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color }} />
          <span style={{ color: '#8b98b8' }}>{entry.name}:</span>
          <span style={{ color: '#e8edf5', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
            {entry.value !== null ? `${entry.value.toFixed(1)}%` : 'Forecasted'}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function SCurveChart() {
  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sCurveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="plannedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="#1e2a45" strokeDasharray="3 3" vertical={false} />

          <XAxis
            dataKey="date"
            stroke="#8b98b8"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#1e2a45' }}
          />

          <YAxis
            stroke="#8b98b8"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#1e2a45' }}
            domain={[0, 100]}
            unit="%"
          />

          <Tooltip content={<CustomTooltip />} />

          <ReferenceLine
            x="Sep"
            stroke="#f59e0b"
            strokeDasharray="4 4"
            label={{ value: 'Data Date (21 Sep)', position: 'insideTopLeft', fill: '#f59e0b', fontSize: 10 }}
          />

          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
          />

          <Area
            type="monotone"
            dataKey="planned"
            name="Baseline Plan"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#plannedGrad)"
          />

          <Area
            type="monotone"
            dataKey="actual"
            name="Actual Progress"
            stroke="#10b981"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#actualGrad)"
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
