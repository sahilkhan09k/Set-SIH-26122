import { useState } from 'react';
import {
  Sliders,
  Database,
  Save,
  Check,
  SlidersHorizontal,
} from 'lucide-react';

export default function SettingsPage() {
  const [autoLinkThreshold, setAutoLinkThreshold] = useState(85);
  const [reviewThreshold, setReviewThreshold] = useState(70);

  const [semanticWeight, setSemanticWeight] = useState(35);
  const [fuzzyWeight, setFuzzyWeight] = useState(20);
  const [disciplineWeight, setDisciplineWeight] = useState(15);
  const [locationWeight, setLocationWeight] = useState(15);
  const [dateWeight, setDateWeight] = useState(15);

  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">System Settings & Algorithm Calibration</h1>
          <p className="page-subtitle">
            Configure SETU AI matching thresholds, scoring weights, and enterprise Primavera P6 integration parameters.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleSave}>
          {saved ? <Check size={14} /> : <Save size={14} />} {saved ? 'Saved Successfully' : 'Save Changes'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-6)' }}>
        {/* Left Column: Matching Thresholds */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Sliders size={16} color="var(--accent)" />
              Automated Decision Thresholds
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Auto-link Threshold Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                  Auto-Link Confidence Threshold
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--success)' }}>
                  ≥ {autoLinkThreshold}%
                </span>
              </div>
              <input
                type="range"
                min="70"
                max="98"
                value={autoLinkThreshold}
                onChange={(e) => setAutoLinkThreshold(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--success)' }}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Matches with confidence at or above this score are automatically linked to P6 without human review.
              </p>
            </div>

            {/* Review Lower Bound Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                  Planner Review Lower Bound
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--warning)' }}>
                  ≥ {reviewThreshold}%
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="80"
                value={reviewThreshold}
                onChange={(e) => setReviewThreshold(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--warning)' }}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Matches between {reviewThreshold}% and {autoLinkThreshold - 1}% are sent to the Planner Review Queue.
              </p>
            </div>

            {/* Visual Threshold Preview */}
            <div style={{ padding: '14px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--bg-border)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
                Confidence Decision Zones
              </div>
              <div style={{ display: 'flex', height: '24px', borderRadius: '4px', overflow: 'hidden', fontSize: '11px', fontWeight: 600, textAlign: 'center', lineHeight: '24px' }}>
                <div style={{ width: `${reviewThreshold}%`, background: 'rgba(239,68,68,0.3)', color: 'var(--danger)' }}>
                  Unmatched (&lt;{reviewThreshold}%)
                </div>
                <div style={{ width: `${autoLinkThreshold - reviewThreshold}%`, background: 'rgba(245,158,11,0.3)', color: 'var(--warning)' }}>
                  Review ({reviewThreshold}%–{autoLinkThreshold - 1}%)
                </div>
                <div style={{ width: `${100 - autoLinkThreshold}%`, background: 'rgba(16,185,129,0.3)', color: 'var(--success)' }}>
                  Auto (&ge;{autoLinkThreshold}%)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Multi-Criteria Scoring Weights */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <SlidersHorizontal size={16} color="var(--accent)" />
              Multi-Criteria Scoring Weights (Total: 100%)
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-primary)' }}>Semantic Vector Embedding Similarity</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>{semanticWeight}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                value={semanticWeight}
                onChange={(e) => setSemanticWeight(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-primary)' }}>Fuzzy Lexical & Token Match (BM25)</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>{fuzzyWeight}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                value={fuzzyWeight}
                onChange={(e) => setFuzzyWeight(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-primary)' }}>Discipline & Trade Compatibility</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>{disciplineWeight}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                value={disciplineWeight}
                onChange={(e) => setDisciplineWeight(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-primary)' }}>Location & Plant Area Proximity</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>{locationWeight}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                value={locationWeight}
                onChange={(e) => setLocationWeight(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-primary)' }}>Timeline & Calendar Date Overlap</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>{dateWeight}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                value={dateWeight}
                onChange={(e) => setDateWeight(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
            </div>
          </div>
        </div>

        {/* Integration Panel */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <div className="card-title">
              <Database size={16} color="var(--accent)" />
              Enterprise Primavera P6 EPPM & ERP Integration
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Primavera P6 EPPM Web Services URL
                </label>
                <input
                  type="text"
                  className="search-input"
                  defaultValue="https://p6.epc-mundra.internal:8206/p6ws/services"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Project EPS Node / Database Alias
                </label>
                <input
                  type="text"
                  className="search-input"
                  defaultValue="EPS-REFINERY-EXPANSION-PHASE2"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Live Schedule Sync Frequency
                </label>
                <select className="search-input">
                  <option>Every DPR Ingestion (Immediate)</option>
                  <option>Hourly Continuous Sync</option>
                  <option>Nightly Batch at 23:00</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
