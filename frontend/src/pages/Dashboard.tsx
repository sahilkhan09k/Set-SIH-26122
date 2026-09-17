import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Brain,
  ArrowRight,
  Sparkles,
  Layers,
  FileCode,
  FileSpreadsheet,
} from 'lucide-react';
import KPICard from '../components/ui/KPICard';
import SCurveChart from '../components/charts/SCurveChart';
import ConfidenceBar from '../components/ui/ConfidenceBar';
import {
  getStatusBadgeClass,
  getStatusLabel,
  getDisciplineColor,
} from '../data/demoData';
import { api } from '../services/api';

const zeroKPIs = {
  totalActivities: 0,
  extractedEvents: 0,
  autoLinked: 0,
  needsReview: 0,
  unmatched: 0,
  avgConfidence: 0,
  delayedActivities: 0,
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState(zeroKPIs);
  const [discProgress, setDiscProgress] = useState<any[]>([]);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    api.getDashboard().then((data) => {
      if (data && data.kpis) {
        setKpis({
          totalActivities: data.kpis.totalActivities ?? 0,
          extractedEvents: data.kpis.extractedEvents ?? 0,
          autoLinked: data.kpis.autoLinked ?? 0,
          needsReview: data.kpis.needsReview ?? 0,
          unmatched: data.kpis.unmatched ?? 0,
          avgConfidence: data.kpis.averageConfidence ?? 0,
          delayedActivities: data.kpis.delayedActivities ?? 0,
        });
        setHasData((data.kpis.totalActivities ?? 0) > 0);
      }
      if (data && Array.isArray(data.disciplineProgress)) {
        setDiscProgress(data.disciplineProgress);
      }
      if (data && Array.isArray(data.recentMatches)) {
        setRecentMatches(data.recentMatches);
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="page-enter">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Executive Project Overview</h1>
          <p className="page-subtitle">
            Capital Project Workspace • Real-time AI Progress Intelligence • Groq Engine Active
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-ghost"
            onClick={() => navigate('/schedule')}
            id="btn-import-schedule"
          >
            <FileCode size={14} /> Import Schedule (.XER)
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => navigate('/upload')}
            id="btn-upload-dpr"
          >
            <Upload size={14} /> Upload Site DPR
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/review')}
            id="btn-review-queue"
          >
            <AlertCircle size={14} /> Review Queue ({kpis.needsReview})
          </button>
        </div>
      </div>

      {/* New Project Welcome Banner if 0 activities */}
      {!hasData && (
        <div
          className="card section"
          style={{
            background: 'linear-gradient(135deg, rgba(30,58,138,0.25), rgba(15,23,42,0.6))',
            borderColor: 'rgba(59,130,246,0.3)',
            padding: '28px 32px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ maxWidth: '640px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', color: '#60a5fa', fontWeight: 600, marginBottom: '12px' }}>
                <Sparkles size={14} /> Clean Project Workspace Ready
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Welcome to SETU Construction AI
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                You are starting with a fresh project. Begin by importing your <strong>Primavera P6 baseline schedule (.XER)</strong>. Next, upload daily site reports (Excel / text DPRs) to let our Groq Llama 3.3 AI extract events and link them against the schedule.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/schedule')}
                style={{ padding: '12px 20px', fontSize: '14px' }}
              >
                <FileCode size={16} /> Step 1: Import .XER Schedule
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/upload')}
                style={{ padding: '12px 20px', fontSize: '14px' }}
              >
                <FileSpreadsheet size={16} /> Step 2: Upload Site Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="kpi-grid section">
        <KPICard
          label="Total Activities"
          value={kpis.totalActivities}
          sub={kpis.totalActivities > 0 ? "Primavera P6 baseline WBS" : "No schedule uploaded"}
          color="#3b82f6"
          icon={<Layers size={18} />}
        />
        <KPICard
          label="Extracted Events"
          value={kpis.extractedEvents}
          sub={kpis.extractedEvents > 0 ? "From ingested DPRs" : "No DPRs processed yet"}
          color="#8b5cf6"
          icon={<Sparkles size={18} />}
        />
        <KPICard
          label="Auto-Linked"
          value={kpis.autoLinked}
          sub="Confidence >= 85%"
          color="#10b981"
          icon={<CheckCircle2 size={18} />}
        />
        <KPICard
          label="Needs Review"
          value={kpis.needsReview}
          sub="Planner approval pending"
          color="#f59e0b"
          icon={<AlertCircle size={18} />}
        />
        <KPICard
          label="Unmatched"
          value={kpis.unmatched}
          sub="No matching schedule item"
          color="#ef4444"
          icon={<AlertCircle size={18} />}
        />
        <KPICard
          label="Avg Confidence"
          value={kpis.avgConfidence}
          suffix="%"
          sub={kpis.avgConfidence > 0 ? "Across matched items" : "Awaiting DPR ingestion"}
          color="#06b6d4"
          icon={<Brain size={18} />}
        />
      </div>

      {/* Main Charts & Breakdown Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 'var(--sp-6)' }} className="section">
        {/* S-Curve Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <TrendingUp size={16} color="var(--accent)" />
              Cumulative S-Curve (Physical Progress %)
            </div>
            {hasData && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="chip">
                  <span className="indicator-dot" style={{ background: 'var(--warning)' }}></span>
                  Variance: 0.0%
                </span>
              </div>
            )}
          </div>
          <div className="card-body">
            {hasData ? (
              <>
                <SCurveChart />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span>Planned Cut-off: <strong style={{ color: 'var(--text-primary)' }}>Tracking</strong></span>
                  <span>Actual Cut-off: <strong style={{ color: 'var(--success)' }}>Active</strong></span>
                  <span>SPI: <strong style={{ color: 'var(--warning)' }}>1.00</strong></span>
                </div>
              </>
            ) : (
              <div style={{ height: '240px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <TrendingUp size={36} color="var(--text-muted)" style={{ marginBottom: '12px', opacity: 0.4 }} />
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>No Baseline Curve Available</div>
                <div style={{ fontSize: '13px', maxWidth: '340px' }}>
                  Import a Primavera P6 (.XER) file to establish target start/finish dates and calculate the cumulative progress curve.
                </div>
                <button className="btn btn-ghost btn-sm" style={{ marginTop: '14px' }} onClick={() => navigate('/schedule')}>
                  <FileCode size={13} /> Import Baseline Schedule
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Discipline Breakdown Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Layers size={16} color="var(--accent)" />
              Discipline Progress & Variance
            </div>
            {hasData && (
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/intelligence')}>
                Details <ArrowRight size={12} />
              </button>
            )}
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {discProgress.length > 0 ? (
              discProgress.map(dp => (
                <div key={dp.discipline}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                    <span style={{ fontWeight: 600, color: dp.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: dp.color }}></span>
                      {dp.discipline}
                    </span>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Plan {dp.planned}%</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Act {dp.actual}%</span>
                      <span style={{ color: dp.variance < -5 ? 'var(--danger)' : 'var(--warning)' }}>
                        {dp.variance > 0 ? `+${dp.variance}` : dp.variance}%
                      </span>
                    </div>
                  </div>

                  <div style={{ height: '8px', background: 'var(--bg-elevated)', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        width: `${dp.planned}%`,
                        background: dp.color,
                        opacity: 0.25,
                        borderRadius: '4px',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        width: `${dp.actual}%`,
                        background: dp.color,
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div style={{ height: '240px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Layers size={36} color="var(--text-muted)" style={{ marginBottom: '12px', opacity: 0.4 }} />
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>No Discipline Metrics</div>
                <div style={{ fontSize: '13px', maxWidth: '300px' }}>
                  Activities from Civil, Piping, Electrical, and Mechanical disciplines will appear here once loaded.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Pipeline Health Banner */}
      <div className="card section" style={{ background: 'linear-gradient(135deg, rgba(22,30,53,0.9), rgba(15,22,41,0.9))', borderColor: 'var(--accent-border)' }}>
        <div className="card-body" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'var(--accent-dim)',
                  border: '1px solid var(--accent-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent)',
                }}
              >
                <Brain size={22} />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Automated Field-to-Schedule Linkage Pipeline
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {kpis.autoLinked > 0
                    ? `${kpis.autoLinked} items linked automatically • Live Groq Llama 3.3 Engine`
                    : 'System standby — Ready to process field daily progress reports'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Auto-Link Threshold
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                  ≥ 85% Confidence
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Review Threshold
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
                  70% – 84%
                </div>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/review')}
              >
                Action {kpis.needsReview} Pending Matches
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Matched Events Table */}
      <div className="card section">
        <div className="card-header">
          <div className="card-title">
            <CheckCircle2 size={16} color="var(--success)" />
            Recent Field Events & Schedule Alignments
          </div>
          {recentMatches.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/matches')}>
              View All Matches <ArrowRight size={12} />
            </button>
          )}
        </div>
        <div className="table-wrapper">
          {recentMatches.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Field Extraction</th>
                  <th>Schedule Activity</th>
                  <th>Discipline</th>
                  <th>Confidence</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentMatches.map((match) => (
                  <tr key={match.id} onClick={() => navigate(`/review/${match.id}`)}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {match.reportedText || match.activityName}
                      </div>
                    </td>
                    <td>
                      <div className="td-mono" style={{ color: 'var(--accent)' }}>
                        {match.activityCode}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {match.activityName}
                      </div>
                    </td>
                    <td>
                      <span
                        className="chip"
                        style={{
                          borderColor: getDisciplineColor(match.discipline),
                          color: getDisciplineColor(match.discipline),
                        }}
                      >
                        {match.discipline}
                      </span>
                    </td>
                    <td style={{ minWidth: '150px' }}>
                      <ConfidenceBar value={Math.round((match.confidence ?? 0) * 100)} />
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(match.status)}`}>
                        {getStatusLabel(match.status)}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/review/${match.id}`);
                        }}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>No Field Events Linked Yet</div>
              <div style={{ fontSize: '13px', maxWidth: '400px', margin: '0 auto 16px' }}>
                When site reports are uploaded and processed by the Groq AI, structured events matched to schedule activities will appear here.
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/upload')}>
                <Upload size={13} /> Upload Site DPR
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
