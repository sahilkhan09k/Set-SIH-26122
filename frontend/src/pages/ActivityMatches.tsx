import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ExternalLink,
  Upload,
  Layers,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import ConfidenceBar from '../components/ui/ConfidenceBar';
import {
  getStatusBadgeClass,
  getStatusLabel,
  getDisciplineColor,
  formatDate,
} from '../data/demoData';
import { api } from '../services/api';

export default function ActivityMatches() {
  const navigate = useNavigate();
  const [matchesList, setMatchesList] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDiscipline, setFilterDiscipline] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    api.getMatches().then((data) => {
      if (Array.isArray(data)) {
        setMatchesList(data);
      }
    }).catch(() => {
      setMatchesList([]);
    });
  }, []);

  const filteredMatches = useMemo(() => {
    return matchesList.filter((match) => {
      // Status filter
      if (filterStatus !== 'ALL' && match.decision !== filterStatus) {
        return false;
      }
      // Discipline filter
      if (filterDiscipline !== 'ALL' && match.progressEvent?.discipline !== filterDiscipline) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const desc = (match.progressEvent?.activityDescription || '').toLowerCase();
        const schedName = (match.scheduleActivity?.name || '').toLowerCase();
        const actCode = (match.scheduleActivity?.activityCode || '').toLowerCase();
        const loc = (match.progressEvent?.location ?? '').toLowerCase();
        return desc.includes(query) || schedName.includes(query) || actCode.includes(query) || loc.includes(query);
      }
      return true;
    });
  }, [matchesList, filterStatus, filterDiscipline, searchQuery]);

  return (
    <div className="page-enter">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="page-title">Activity Matches & Schedule Linkages</h1>
            {matchesList.length > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', borderRadius: '12px', padding: '2px 10px', fontSize: '12px', fontWeight: 600 }}>
                <CheckCircle2 size={12} /> {matchesList.length} linked items
              </span>
            )}
          </div>
          <p className="page-subtitle">
            AI-mapped correlations between daily progress field reports and Primavera P6 schedule baseline activities
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/schedule')}>
            <Layers size={14} /> View Schedule
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/upload')}>
            <Upload size={14} /> Upload Site DPR
          </button>
        </div>
      </div>

      {/* Empty State when no matches */}
      {matchesList.length === 0 ? (
        <div
          className="card section"
          style={{
            background: 'linear-gradient(135deg, rgba(22,30,53,0.7), rgba(15,22,41,0.9))',
            borderColor: 'rgba(59,130,246,0.3)',
            padding: '48px 32px',
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: '520px', margin: '0 auto' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#a78bfa' }}>
              <Sparkles size={28} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              No Activity Linkages Found
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
              Once you import your baseline schedule and upload site progress reports (Excel or text DPRs), SETU's AI will automatically extract field events and link them to schedule activities.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/upload')}
                style={{ padding: '12px 24px', fontSize: '14px' }}
              >
                <Upload size={16} /> Upload Site Report
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/schedule')}
                style={{ padding: '12px 24px', fontSize: '14px' }}
              >
                <Layers size={16} /> Check Schedule Baseline
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Filters and Search Bar */}
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
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="filter-group">
                {[
                  { key: 'ALL', label: 'All Status' },
                  { key: 'AUTO_LINK', label: 'Auto-Linked' },
                  { key: 'NEEDS_REVIEW', label: 'Needs Review' },
                  { key: 'UNMATCHED', label: 'Unmatched' },
                ].map((item) => (
                  <button
                    key={item.key}
                    className={`filter-btn ${filterStatus === item.key ? 'active' : ''}`}
                    onClick={() => setFilterStatus(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <select
                className="search-input"
                style={{ width: '150px', padding: '8px 12px' }}
                value={filterDiscipline}
                onChange={(e) => setFilterDiscipline(e.target.value)}
              >
                <option value="ALL">All Disciplines</option>
                <option value="Civil">Civil</option>
                <option value="Piping">Piping</option>
                <option value="Electrical">Electrical</option>
                <option value="Instrumentation">Instrumentation</option>
                <option value="Mechanical">Mechanical</option>
                <option value="HSE">HSE</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="search-input-wrap" style={{ width: '300px' }}>
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search description, code, location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {filteredMatches.length} / {matchesList.length} items
              </span>
            </div>
          </div>

          {/* Matches Table */}
          <div className="card">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reported Field Progress</th>
                    <th>Matched Schedule Activity</th>
                    <th>Discipline</th>
                    <th>Confidence</th>
                    <th>Decision</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMatches.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                        No matches match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredMatches.map((match) => (
                      <tr
                        key={match.id}
                        onClick={() => navigate(`/review/${match.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {match.progressEvent?.activityDescription}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Loc: {match.progressEvent?.location ?? 'Site'} • Date: {formatDate(match.progressEvent?.reportDate)}
                            {match.progressEvent?.quantity && (
                              <span> • Scope: {match.progressEvent.quantity} {match.progressEvent.unit}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="td-mono" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                            {match.scheduleActivity?.activityCode}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {match.scheduleActivity?.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            WBS: {match.scheduleActivity?.wbsCode}
                          </div>
                        </td>
                        <td>
                          <span
                            className="chip"
                            style={{
                              borderColor: getDisciplineColor(match.progressEvent?.discipline),
                              color: getDisciplineColor(match.progressEvent?.discipline),
                            }}
                          >
                            {match.progressEvent?.discipline}
                          </span>
                        </td>
                        <td style={{ minWidth: '150px' }}>
                          <ConfidenceBar value={match.finalConfidence} />
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(match.decision)}`}>
                            {getStatusLabel(match.decision)}
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
                            Review <ExternalLink size={12} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
