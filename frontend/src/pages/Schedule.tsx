import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Upload,
  FileCode,
  RefreshCw,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import {
  getDisciplineColor,
} from '../data/demoData';
import type { ScheduleActivity } from '../data/demoData';
import { api } from '../services/api';
import type { ToastData } from '../components/ui/Toast';

interface ScheduleProps {
  addToast?: (toast: Omit<ToastData, 'id'>) => void;
}

export default function Schedule({ addToast }: ScheduleProps) {
  const [activitiesList, setActivitiesList] = useState<ScheduleActivity[]>([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState('');
  const [isFromDB, setIsFromDB] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadActivities = () => {
    api.getScheduleActivities().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setActivitiesList(data);
        setIsFromDB(true);
      } else {
        setActivitiesList([]);
        setIsFromDB(false);
      }
    }).catch(() => {
      setActivitiesList([]);
      setIsFromDB(false);
    });
  };

  useEffect(() => {
    loadActivities();
  }, []);

  const handleXerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsUploading(true);
    setUploadStep('Reading file format...');

    try {
      if (file.name.toLowerCase().endsWith('.xer')) {
        setUploadStep('Parsing Primavera P6 XER (%T TASK and %T WBS tables)...');
      } else {
        setUploadStep('Parsing spreadsheet columns and activities...');
      }
      await new Promise(r => setTimeout(r, 400));

      setUploadStep('Extracting task codes, disciplines, start/finish dates...');
      await new Promise(r => setTimeout(r, 400));

      setUploadStep('Saving activities to project baseline schedule in database...');
      const result = await api.uploadSchedule(file);

      setIsUploading(false);

      addToast?.({
        type: 'success',
        message: `✓ Schedule Loaded: ${result.activities_imported} activities successfully imported from "${file.name}".`,
      });

      // Reload activities from DB
      loadActivities();
    } catch (err: any) {
      setIsUploading(false);
      addToast?.({
        type: 'error',
        message: `Schedule import failed: ${err.message}`,
      });
    }
  };

  const handleClearActivities = async () => {
    if (!confirm('Are you sure you want to clear all activities from this project?')) return;
    try {
      await api.clearSchedule();
      setActivitiesList([]);
      setIsFromDB(false);
      addToast?.({ type: 'success', message: 'Project schedule cleared. Ready for fresh import.' });
    } catch {
      addToast?.({ type: 'error', message: 'Failed to clear activities.' });
    }
  };

  const filteredActivities = useMemo(() => {
    return activitiesList.filter((act) => {
      if (selectedDiscipline !== 'ALL' && act.discipline.toLowerCase() !== selectedDiscipline.toLowerCase()) {
        return false;
      }
      if (selectedStatus !== 'ALL' && act.status !== selectedStatus) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          act.activityCode.toLowerCase().includes(q) ||
          act.name.toLowerCase().includes(q) ||
          act.wbsCode.toLowerCase().includes(q) ||
          (act.location ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activitiesList, selectedDiscipline, selectedStatus, searchQuery]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETE':
        return <span className="badge badge-auto">Completed</span>;
      case 'IN_PROGRESS':
        return <span className="badge badge-primary">In Progress</span>;
      case 'DELAYED':
        return <span className="badge badge-danger">Delayed</span>;
      default:
        return <span className="badge badge-neutral">Not Started</span>;
    }
  };

  const calculateVariance = (act: ScheduleActivity) => {
    if (!act.actualFinish || !act.plannedFinish) return null;
    const plan = new Date(act.plannedFinish).getTime();
    const actl = new Date(act.actualFinish).getTime();
    return Math.round((actl - plan) / (1000 * 3600 * 24));
  };

  return (
    <div className="page-enter">
      {/* Hidden file input for XER/CSV/XLSX */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xer,.csv,.xlsx,.xls"
        style={{ display: 'none' }}
        onChange={handleXerUpload}
        id="schedule-xer-input"
      />

      {/* Page Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="page-title">Baseline Schedule & WBS Architecture</h1>
            {isFromDB ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', borderRadius: '12px', padding: '2px 10px', fontSize: '12px', fontWeight: 600 }}>
                <CheckCircle2 size={12} /> Live Database ({activitiesList.length} activities)
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24', borderRadius: '12px', padding: '2px 10px', fontSize: '12px', fontWeight: 600 }}>
                No Schedule Loaded
              </span>
            )}
          </div>
          <p className="page-subtitle">
            Primavera P6 Level 4 WBS schedule network • Critical path monitoring & baseline variance tracking
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {activitiesList.length > 0 && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)' }}
              onClick={handleClearActivities}
              title="Clear all activities to import fresh"
            >
              <Trash2 size={14} /> Clear Schedule
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            id="btn-import-xer"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {isUploading ? (
              <>
                <RefreshCw size={14} className="spin" /> Importing...
              </>
            ) : (
              <>
                <Upload size={14} /> Import XER / CSV
              </>
            )}
          </button>
        </div>
      </div>

      {/* Upload Processing Notification Banner */}
      {isUploading && (
        <div
          className="card section"
          style={{
            background: 'linear-gradient(135deg, rgba(30,42,69,0.9), rgba(15,22,41,0.95))',
            borderColor: 'var(--accent)',
            padding: '16px 20px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
              <RefreshCw size={18} className="spin" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Processing Schedule File...
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {uploadStep}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State Banner when 0 activities */}
      {activitiesList.length === 0 && !isUploading && (
        <div
          className="card section"
          style={{
            background: 'linear-gradient(135deg, rgba(22,30,53,0.7), rgba(15,22,41,0.9))',
            borderColor: 'rgba(59,130,246,0.3)',
            padding: '48px 32px',
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: '540px', margin: '0 auto' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#60a5fa' }}>
              <FileCode size={28} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              No Baseline Schedule Loaded
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
              Upload your Primavera P6 export file (<strong>.XER</strong>), CSV, or Excel file to establish your project's baseline WBS and activity network.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={() => fileInputRef.current?.click()}
                style={{ padding: '12px 24px', fontSize: '14px' }}
              >
                <Upload size={16} /> Choose .XER or .CSV File
              </button>
            </div>
            <div style={{ marginTop: '20px', fontSize: '12px', color: 'var(--text-muted)' }}>
              Demo file ready: <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px' }}>demo_files/Refinery_Phase2_Schedule.xer</code>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar (Only shown when activities exist) */}
      {activitiesList.length > 0 && (
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
            {/* Discipline Filter */}
            <div className="filter-group">
              {['ALL', 'Civil', 'Piping', 'Electrical', 'Instrumentation', 'Mechanical', 'HSE'].map((disc) => (
                <button
                  key={disc}
                  className={`filter-btn ${selectedDiscipline === disc ? 'active' : ''}`}
                  onClick={() => setSelectedDiscipline(disc)}
                >
                  {disc}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <select
              className="search-input"
              style={{ width: '150px', padding: '8px 12px' }}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETE">Completed</option>
              <option value="NOT_STARTED">Not Started</option>
              <option value="DELAYED">Delayed</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Search Input */}
            <div className="search-input-wrap" style={{ width: '300px' }}>
              <Search size={14} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search activity code, WBS, name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {filteredActivities.length} / {activitiesList.length} activities
            </span>
          </div>
        </div>
      )}

      {/* Schedule Table (Only shown when activities exist) */}
      {activitiesList.length > 0 && (
        <div className="card">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Activity Code / WBS</th>
                  <th>Activity Description &amp; Location</th>
                  <th>Discipline</th>
                  <th>Planned Start / Finish</th>
                  <th>Actual Start / Finish</th>
                  <th>Scope / Qty</th>
                  <th>Variance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No activities match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredActivities.map((act) => {
                    const variance = calculateVariance(act);
                    return (
                      <tr key={act.id}>
                        <td>
                          <div className="td-mono" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                            {act.activityCode}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{act.wbsCode}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{act.name}</div>
                          {act.location && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Area: {act.location}
                            </div>
                          )}
                        </td>
                        <td>
                          <span
                            className="chip"
                            style={{
                              borderColor: getDisciplineColor(act.discipline),
                              color: getDisciplineColor(act.discipline),
                            }}
                          >
                            {act.discipline}
                          </span>
                        </td>
                        <td className="td-mono" style={{ fontSize: '12px' }}>
                          <div>{act.plannedStart?.slice ? act.plannedStart.slice(0, 10) : act.plannedStart}</div>
                          <div style={{ color: 'var(--text-muted)' }}>{act.plannedFinish?.slice ? act.plannedFinish.slice(0, 10) : act.plannedFinish}</div>
                        </td>
                        <td className="td-mono" style={{ fontSize: '12px' }}>
                          {act.actualStart ? (
                            <>
                              <div style={{ color: 'var(--success)' }}>{act.actualStart.slice ? act.actualStart.slice(0, 10) : act.actualStart}</div>
                              <div style={{ color: act.actualFinish ? 'var(--success)' : 'var(--text-muted)' }}>
                                {act.actualFinish ? (act.actualFinish.slice ? act.actualFinish.slice(0, 10) : act.actualFinish) : 'In progress'}
                              </div>
                            </>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                          {act.quantity ? `${act.quantity} ${act.unit || ''}` : '—'}
                        </td>
                        <td>
                          {variance !== null ? (
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: variance > 0 ? 'var(--danger)' : variance < 0 ? 'var(--success)' : 'var(--text-secondary)',
                              }}
                            >
                              {variance > 0 ? `+${variance}d late` : variance === 0 ? 'On time' : `${variance}d early`}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>{getStatusBadge(act.status)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
