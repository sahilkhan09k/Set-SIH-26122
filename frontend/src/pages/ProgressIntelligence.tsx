import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  AlertTriangle,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import { disciplineProgress } from '../data/demoData';

const DELAY_REASONS = [
  { name: 'Material & Spool Delivery', value: 38, color: '#f59e0b' },
  { name: 'Inter-Discipline Access', value: 29, color: '#3b82f6' },
  { name: 'Engineering RFI Turnaround', value: 18, color: '#8b5cf6' },
  { name: 'Equipment / Crane Breakdown', value: 15, color: '#ef4444' },
];

export default function ProgressIntelligence() {

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Progress Intelligence & Delay Forensics</h1>
          <p className="page-subtitle">
            Advanced schedule variance analytics, root cause decomposition, and predictive completion forecasting.
          </p>
        </div>
      </div>

      {/* Top Predictive Banner */}
      <div className="card section" style={{ background: 'linear-gradient(135deg, rgba(30,42,69,0.7), rgba(15,22,41,0.9))', borderColor: 'var(--accent-border)' }}>
        <div className="card-body" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Contractual Mechanical Completion
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                15 Feb 2027
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Baseline contract schedule</div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                AI Projected Completion
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--warning)', marginTop: '4px' }}>
                04 Mar 2027
              </div>
              <div style={{ fontSize: '12px', color: 'var(--danger)' }}>+17 days projected slippage</div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Earned Value Health (SPI / CPI)
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                0.85 / 0.94
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Schedule Variance: -$1.42M EV</div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Critical Path Float
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--danger)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                -4 Days
              </div>
              <div style={{ fontSize: '12px', color: 'var(--danger)' }}>Requires immediate re-sequencing</div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 'var(--sp-6)' }} className="section">
        {/* Discipline Plan vs Actual Chart */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Layers size={16} color="var(--accent)" />
              Discipline Planned vs Actual Physical %
            </div>
          </div>
          <div className="card-body">
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={disciplineProgress} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#1e2a45" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="discipline" stroke="#8b98b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#8b98b8" fontSize={11} tickLine={false} unit="%" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ background: '#161e35', border: '1px solid #253352', borderRadius: '8px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="planned" name="Planned Baseline %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" name="Actual Physical %" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Delay Root Cause Decomposition */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <ShieldAlert size={16} color="var(--warning)" />
              Delay Root Cause Distribution
            </div>
          </div>
          <div className="card-body">
            <div style={{ height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={DELAY_REASONS}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {DELAY_REASONS.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#161e35', border: '1px solid #253352', borderRadius: '8px' }}
                    formatter={(val: any) => [`${val}% of delays`, 'Impact Share']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              {DELAY_REASONS.map(r => (
                <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: r.color }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{r.name}</span>
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {r.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Critical Path Activities at Risk */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <AlertTriangle size={16} color="var(--danger)" />
            Critical Path & High-Variance Activities Requiring Mitigation
          </div>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Activity</th>
                <th>Discipline</th>
                <th>Location</th>
                <th>Baseline Plan</th>
                <th>Impact Variance</th>
                <th>AI Suggested Recovery Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className="td-mono" style={{ color: 'var(--accent)', fontWeight: 600 }}>PIP-2401</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>Erect Line 24-XX — 8IN Process Line</div>
                </td>
                <td><span className="chip" style={{ color: '#3b82f6', borderColor: '#3b82f6' }}>Piping</span></td>
                <td>Rack R24</td>
                <td className="td-mono" style={{ fontSize: '12px' }}>18 Sep – 20 Sep</td>
                <td><span className="badge badge-unmatch">+3d delay</span></td>
                <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Authorize second shift crane lift team on 22 Sep to recover 1.5 days.
                </td>
              </tr>
              <tr>
                <td>
                  <div className="td-mono" style={{ color: 'var(--accent)', fontWeight: 600 }}>ELE-S201</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>Cable Tray Installation — Substation S2</div>
                </td>
                <td><span className="chip" style={{ color: '#f59e0b', borderColor: '#f59e0b' }}>Electrical</span></td>
                <td>Substation S2</td>
                <td className="td-mono" style={{ fontSize: '12px' }}>20 Sep – 25 Sep</td>
                <td><span className="badge badge-review">+1d delay</span></td>
                <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Civil plinth clearance secured. Add 2 electricians to parallel tray runs.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
