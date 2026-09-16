// SETU Demo Data Layer
// All realistic construction data — real activity IDs, real terminology

export type Discipline = 'Civil' | 'Piping' | 'Electrical' | 'Instrumentation' | 'Mechanical' | 'HSE';
export type MatchStatus = 'AUTO_LINK' | 'NEEDS_REVIEW' | 'UNMATCHED' | 'NEW_ACTIVITY';
export type ProcessingStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'ERROR';

export interface ScheduleActivity {
  id: string;
  activityCode: string;
  wbsCode: string;
  name: string;
  discipline: Discipline;
  plannedStart: string;
  plannedFinish: string;
  plannedDuration: number; // days
  quantity?: number;
  unit?: string;
  location?: string;
  actualStart?: string;
  actualFinish?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE' | 'DELAYED';
}

export interface ProgressEvent {
  id: string;
  documentId: string;
  discipline: Discipline;
  activityDescription: string;
  actualStart?: string;
  actualEnd?: string;
  quantity?: number;
  unit?: string;
  location?: string;
  sourceText: string;
  extractionConfidence: number;
  reportDate: string;
}

export interface ActivityMatch {
  id: string;
  progressEventId: string;
  scheduleActivityId: string;
  progressEvent: ProgressEvent;
  scheduleActivity: ScheduleActivity;
  semanticScore: number;
  fuzzyScore: number;
  disciplineScore: number;
  locationScore: number;
  identifierScore: number;
  dateScore: number;
  finalConfidence: number;
  decision: MatchStatus;
  explanation: string;
  evidenceItems: EvidenceItem[];
  alternatives?: AlternativeMatch[];
}

export interface EvidenceItem {
  label: string;
  matches: boolean;
  detail?: string;
}

export interface AlternativeMatch {
  activity: ScheduleActivity;
  confidence: number;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: string;
  newValue?: string;
  source: 'AI' | 'PLANNER' | 'SYSTEM';
  confidence?: number;
  explanation?: string;
}

export interface SCurvePoint {
  date: string;
  planned: number;
  actual: number | null;
}

export interface DisciplineProgress {
  discipline: Discipline;
  planned: number;
  actual: number;
  variance: number;
  color: string;
}

// ============================================================
// SCHEDULE ACTIVITIES
// ============================================================
export const scheduleActivities: ScheduleActivity[] = [
  {
    id: 'sa-001', activityCode: 'PIP-2401', wbsCode: 'MRE-03.02.01',
    name: 'Erect Line 24-XX — 8IN Process Line', discipline: 'Piping',
    plannedStart: '2026-09-18', plannedFinish: '2026-09-20', plannedDuration: 3,
    quantity: 120, unit: 'inch-dia', location: 'Rack R24',
    actualStart: '2026-09-21', status: 'IN_PROGRESS',
  },
  {
    id: 'sa-002', activityCode: 'PIP-2402', wbsCode: 'MRE-03.02.01',
    name: 'Erect Line 24-YY — 6IN Utility Line', discipline: 'Piping',
    plannedStart: '2026-09-19', plannedFinish: '2026-09-22', plannedDuration: 4,
    quantity: 88, unit: 'inch-dia', location: 'Rack R24',
    status: 'NOT_STARTED',
  },
  {
    id: 'sa-003', activityCode: 'PIP-1801', wbsCode: 'MRE-03.01.02',
    name: 'Install Spool P18 — 12IN Feed Line', discipline: 'Piping',
    plannedStart: '2026-09-15', plannedFinish: '2026-09-18', plannedDuration: 4,
    quantity: 200, unit: 'inch-dia', location: 'Area A-18',
    actualStart: '2026-09-15', actualFinish: '2026-09-18', status: 'COMPLETE',
  },
  {
    id: 'sa-004', activityCode: 'CIV-2041', wbsCode: 'MRE-01.04.01',
    name: 'Concrete Foundation F-204 — Equipment Pad', discipline: 'Civil',
    plannedStart: '2026-09-20', plannedFinish: '2026-09-21', plannedDuration: 2,
    quantity: 45, unit: 'CUM', location: 'Area F-204',
    actualStart: '2026-09-21', actualFinish: '2026-09-21', status: 'COMPLETE',
  },
  {
    id: 'sa-005', activityCode: 'CIV-2042', wbsCode: 'MRE-01.04.02',
    name: 'Concrete Foundation F-205 — Structural Pad', discipline: 'Civil',
    plannedStart: '2026-09-22', plannedFinish: '2026-09-23', plannedDuration: 2,
    quantity: 38, unit: 'CUM', location: 'Area F-205',
    status: 'NOT_STARTED',
  },
  {
    id: 'sa-006', activityCode: 'ELE-S201', wbsCode: 'MRE-05.02.01',
    name: 'Cable Tray Installation — Substation S2', discipline: 'Electrical',
    plannedStart: '2026-09-20', plannedFinish: '2026-09-25', plannedDuration: 6,
    quantity: 120, unit: 'metre', location: 'Substation S2',
    actualStart: '2026-09-21', status: 'IN_PROGRESS',
  },
  {
    id: 'sa-007', activityCode: 'ELE-S202', wbsCode: 'MRE-05.02.02',
    name: 'LV Cable Laying — Motor Control Centre MCC-02', discipline: 'Electrical',
    plannedStart: '2026-09-26', plannedFinish: '2026-09-30', plannedDuration: 5,
    quantity: 850, unit: 'metre', location: 'MCC-02',
    status: 'NOT_STARTED',
  },
  {
    id: 'sa-008', activityCode: 'INS-TT401', wbsCode: 'MRE-06.04.01',
    name: 'Install Temperature Transmitter TT-401', discipline: 'Instrumentation',
    plannedStart: '2026-09-23', plannedFinish: '2026-09-24', plannedDuration: 2,
    location: 'Area T-401', status: 'NOT_STARTED',
  },
  {
    id: 'sa-009', activityCode: 'INS-PT501', wbsCode: 'MRE-06.05.01',
    name: 'Install Pressure Transmitter PT-501', discipline: 'Instrumentation',
    plannedStart: '2026-09-24', plannedFinish: '2026-09-25', plannedDuration: 2,
    location: 'Area P-501', status: 'NOT_STARTED',
  },
  {
    id: 'sa-010', activityCode: 'MEC-P301', wbsCode: 'MRE-04.03.01',
    name: 'Align and Couple Pump P-301 — Centrifugal Feed Pump', discipline: 'Mechanical',
    plannedStart: '2026-09-28', plannedFinish: '2026-09-29', plannedDuration: 2,
    location: 'Pump House', status: 'NOT_STARTED',
  },
  {
    id: 'sa-011', activityCode: 'PIP-3301', wbsCode: 'MRE-03.03.01',
    name: 'Install Line 33-AA — 4IN Instrument Air', discipline: 'Piping',
    plannedStart: '2026-09-17', plannedFinish: '2026-09-19', plannedDuration: 3,
    quantity: 65, unit: 'inch-dia', location: 'Area A-33',
    actualStart: '2026-09-17', actualFinish: '2026-09-20', status: 'COMPLETE',
  },
  {
    id: 'sa-012', activityCode: 'CIV-1601', wbsCode: 'MRE-01.06.01',
    name: 'Structural Steel Erection — Pipe Rack R16', discipline: 'Civil',
    plannedStart: '2026-09-14', plannedFinish: '2026-09-16', plannedDuration: 3,
    quantity: 12.5, unit: 'MT', location: 'Rack R16',
    actualStart: '2026-09-14', actualFinish: '2026-09-16', status: 'COMPLETE',
  },
  {
    id: 'sa-013', activityCode: 'ELE-HV301', wbsCode: 'MRE-05.03.01',
    name: 'HV Cable Termination — Transformer TR-01', discipline: 'Electrical',
    plannedStart: '2026-09-30', plannedFinish: '2026-10-01', plannedDuration: 2,
    location: 'Substation S1', status: 'NOT_STARTED',
  },
  {
    id: 'sa-014', activityCode: 'PIP-4401', wbsCode: 'MRE-03.04.01',
    name: 'Hydro Test Line 44-XX — 10IN Product Line', discipline: 'Piping',
    plannedStart: '2026-09-25', plannedFinish: '2026-09-26', plannedDuration: 2,
    location: 'Area A-44', status: 'NOT_STARTED',
  },
  {
    id: 'sa-015', activityCode: 'MEC-V101', wbsCode: 'MRE-04.01.01',
    name: 'Install Vertical Vessel V-101 — Flash Drum', discipline: 'Mechanical',
    plannedStart: '2026-10-01', plannedFinish: '2026-10-03', plannedDuration: 3,
    quantity: 1, unit: 'EA', location: 'Area V-101',
    status: 'NOT_STARTED',
  },
];

// ============================================================
// PROGRESS EVENTS (extracted from field reports)
// ============================================================
export const progressEvents: ProgressEvent[] = [
  {
    id: 'pe-001', documentId: 'doc-001', discipline: 'Piping',
    activityDescription: '8 inch process line erection at Rack R24',
    actualStart: '2026-09-21T08:30:00', actualEnd: '2026-09-21T17:00:00',
    quantity: 42, unit: 'inch-dia', location: 'Rack R24',
    sourceText: 'Team completed erection of 8 inch process line at Rack R24. 42 inch-dia installed during day shift. Work started around 08:30 and was completed at 17:00.',
    extractionConfidence: 0.94, reportDate: '2026-09-21',
  },
  {
    id: 'pe-002', documentId: 'doc-001', discipline: 'Civil',
    activityDescription: 'Foundation F-204 concreting',
    actualStart: '2026-09-21T09:00:00', actualEnd: '2026-09-21T15:30:00',
    quantity: 45, unit: 'CUM', location: 'Area F-204',
    sourceText: 'Foundation F-204 concreting completed. Work started at 09:00 and finished at 15:30.',
    extractionConfidence: 0.97, reportDate: '2026-09-21',
  },
  {
    id: 'pe-003', documentId: 'doc-001', discipline: 'Electrical',
    activityDescription: 'Cable tray installation at Substation S2',
    actualStart: '2026-09-21T08:00:00', actualEnd: '2026-09-21T16:00:00',
    quantity: 35, unit: 'metre', location: 'Substation S2',
    sourceText: 'Cable tray installation started in Substation S2. Approximately 35 metres installed.',
    extractionConfidence: 0.88, reportDate: '2026-09-21',
  },
  {
    id: 'pe-004', documentId: 'doc-001', discipline: 'Piping',
    activityDescription: 'Spool P24-17 erection at Rack R24',
    actualStart: '2026-09-21T10:00:00', actualEnd: '2026-09-21T14:00:00',
    location: 'Rack R24',
    sourceText: 'Spool P24-17 was erected successfully at Rack R24 during morning shift.',
    extractionConfidence: 0.91, reportDate: '2026-09-21',
  },
  {
    id: 'pe-005', documentId: 'doc-002', discipline: 'Piping',
    activityDescription: '4 inch instrument air line installation',
    actualStart: '2026-09-20T08:00:00', actualEnd: '2026-09-20T17:00:00',
    quantity: 28, unit: 'inch-dia', location: 'Area A-33',
    sourceText: 'Instrument air piping 4" DN100 erected in Area A-33, 28 inch-dia completed today.',
    extractionConfidence: 0.82, reportDate: '2026-09-20',
  },
];

// ============================================================
// ACTIVITY MATCHES
// ============================================================
export const activityMatches: ActivityMatch[] = [
  {
    id: 'am-001', progressEventId: 'pe-001', scheduleActivityId: 'sa-001',
    progressEvent: progressEvents[0],
    scheduleActivity: scheduleActivities[0],
    semanticScore: 0.91, fuzzyScore: 0.84, disciplineScore: 1.0,
    locationScore: 1.0, identifierScore: 0.85, dateScore: 0.6,
    finalConfidence: 92,
    decision: 'AUTO_LINK',
    explanation: 'Strong semantic match. Both records reference 8-inch line erection at Rack R24. Discipline (Piping), location (Rack R24), and action (Erect) all match. Schedule date overlaps reported execution date.',
    evidenceItems: [
      { label: 'Discipline match', matches: true, detail: 'Both: Piping' },
      { label: 'Location match', matches: true, detail: 'Both: Rack R24' },
      { label: 'Size match', matches: true, detail: 'Both: 8IN / 8 inch' },
      { label: 'Action match', matches: true, detail: 'Erect / Erection' },
      { label: 'Date overlap', matches: true, detail: 'Report: 21 Sep, Plan: 18–20 Sep (±3 days)' },
      { label: 'Activity ID match', matches: false, detail: 'No explicit ID in report' },
    ],
    alternatives: [
      { activity: scheduleActivities[1], confidence: 61 },
    ],
  },
  {
    id: 'am-002', progressEventId: 'pe-002', scheduleActivityId: 'sa-003',
    progressEvent: progressEvents[1],
    scheduleActivity: scheduleActivities[3],
    semanticScore: 0.96, fuzzyScore: 0.92, disciplineScore: 1.0,
    locationScore: 1.0, identifierScore: 0.95, dateScore: 0.8,
    finalConfidence: 97,
    decision: 'AUTO_LINK',
    explanation: 'Near-perfect match. Foundation F-204 explicitly mentioned in both records. Discipline, location, quantity (45 CUM) all match exactly.',
    evidenceItems: [
      { label: 'Discipline match', matches: true, detail: 'Both: Civil' },
      { label: 'Location/ID match', matches: true, detail: 'Both: F-204' },
      { label: 'Quantity match', matches: true, detail: 'Both: 45 CUM' },
      { label: 'Action match', matches: true, detail: 'Concreting / Concrete' },
      { label: 'Date overlap', matches: true, detail: 'Report: 21 Sep, Plan: 20–21 Sep' },
      { label: 'Activity ID match', matches: false, detail: 'No explicit ID in report' },
    ],
  },
  {
    id: 'am-003', progressEventId: 'pe-003', scheduleActivityId: 'sa-005',
    progressEvent: progressEvents[2],
    scheduleActivity: scheduleActivities[5],
    semanticScore: 0.79, fuzzyScore: 0.72, disciplineScore: 1.0,
    locationScore: 1.0, identifierScore: 0.7, dateScore: 0.7,
    finalConfidence: 78,
    decision: 'NEEDS_REVIEW',
    explanation: 'Good match on discipline and location. However, quantity reported (35m) vs planned (120m) suggests partial progress. Review required to confirm this is the correct activity and not a different cable tray run.',
    evidenceItems: [
      { label: 'Discipline match', matches: true, detail: 'Both: Electrical' },
      { label: 'Location match', matches: true, detail: 'Both: Substation S2' },
      { label: 'Action match', matches: true, detail: 'Installation / Install' },
      { label: 'Quantity variance', matches: false, detail: 'Reported 35m vs planned 120m total' },
      { label: 'Date overlap', matches: true, detail: 'Report: 21 Sep, Plan: 20–25 Sep' },
    ],
    alternatives: [
      { activity: scheduleActivities[6], confidence: 45 },
    ],
  },
  {
    id: 'am-004', progressEventId: 'pe-004', scheduleActivityId: 'sa-000',
    progressEvent: progressEvents[3],
    scheduleActivity: scheduleActivities[0],
    semanticScore: 0.88, fuzzyScore: 0.81, disciplineScore: 1.0,
    locationScore: 1.0, identifierScore: 0.9, dateScore: 0.6,
    finalConfidence: 90,
    decision: 'AUTO_LINK',
    explanation: 'Spool P24-17 is part of Line 24-XX. Location and discipline match. This is a granular sub-event of the same schedule activity.',
    evidenceItems: [
      { label: 'Discipline match', matches: true, detail: 'Both: Piping' },
      { label: 'Location match', matches: true, detail: 'Both: Rack R24' },
      { label: 'Spool ID match', matches: true, detail: 'P24-17 → Line 24-XX' },
      { label: 'Action match', matches: true, detail: 'Erected / Erect' },
      { label: 'Date overlap', matches: true, detail: 'Within plan window' },
    ],
  },
  {
    id: 'am-005', progressEventId: 'pe-005', scheduleActivityId: 'sa-010',
    progressEvent: progressEvents[4],
    scheduleActivity: scheduleActivities[10],
    semanticScore: 0.74, fuzzyScore: 0.68, disciplineScore: 1.0,
    locationScore: 0.8, identifierScore: 0.75, dateScore: 0.9,
    finalConfidence: 76,
    decision: 'NEEDS_REVIEW',
    explanation: 'Good discipline and action match. "Instrument air" usage matches "Instrument Air" in schedule. Location coding (A-33) partially matches. Date aligns well. Review quantity discrepancy (28 vs 65 planned).',
    evidenceItems: [
      { label: 'Discipline match', matches: true, detail: 'Both: Piping' },
      { label: 'Commodity match', matches: true, detail: 'Both: Instrument Air' },
      { label: 'Location match', matches: true, detail: 'Area A-33 matches' },
      { label: 'Size match', matches: true, detail: '4IN / 4 inch' },
      { label: 'Quantity variance', matches: false, detail: 'Reported 28 vs planned 65 inch-dia' },
    ],
  },
];

// Fix am-004 reference
activityMatches[3].scheduleActivityId = 'sa-001';

// ============================================================
// AUDIT LOG
// ============================================================
export const auditLog: AuditEntry[] = [
  {
    id: 'al-001', timestamp: '2026-09-21T17:42:00',
    user: 'System (AI)', action: 'AUTO_LINK', entity: 'ActivityMatch', entityId: 'am-001',
    newValue: 'PIP-2401 → pe-001 (Confidence: 92%)',
    source: 'AI', confidence: 92,
  },
  {
    id: 'al-002', timestamp: '2026-09-21T17:42:01',
    user: 'System (AI)', action: 'AUTO_LINK', entity: 'ActivityMatch', entityId: 'am-002',
    newValue: 'CIV-2041 → pe-002 (Confidence: 97%)',
    source: 'AI', confidence: 97,
  },
  {
    id: 'al-003', timestamp: '2026-09-21T17:42:02',
    user: 'System (AI)', action: 'NEEDS_REVIEW', entity: 'ActivityMatch', entityId: 'am-003',
    newValue: 'ELE-S201 → pe-003 (Confidence: 78%) — Quantity variance',
    source: 'AI', confidence: 78,
  },
  {
    id: 'al-004', timestamp: '2026-09-21T17:42:03',
    user: 'System (AI)', action: 'AUTO_LINK', entity: 'ActivityMatch', entityId: 'am-004',
    newValue: 'PIP-2401 → pe-004 (Confidence: 90%) — Granular sub-event',
    source: 'AI', confidence: 90,
  },
  {
    id: 'al-005', timestamp: '2026-09-21T17:42:04',
    user: 'System (AI)', action: 'NEEDS_REVIEW', entity: 'ActivityMatch', entityId: 'am-005',
    newValue: 'PIP-3301 → pe-005 (Confidence: 76%) — Quantity discrepancy',
    source: 'AI', confidence: 76,
  },
  {
    id: 'al-006', timestamp: '2026-09-21T17:43:15',
    user: 'Rajan Mehta', action: 'UPLOAD', entity: 'IngestionDocument', entityId: 'doc-001',
    newValue: 'Daily_Progress_Report_21Sep2026.txt',
    source: 'PLANNER',
  },
];

// ============================================================
// S-CURVE DATA
// ============================================================
export const sCurveData: SCurvePoint[] = [
  { date: 'Apr',  planned: 2,   actual: 1.8 },
  { date: 'May',  planned: 6,   actual: 5.2 },
  { date: 'Jun',  planned: 12,  actual: 10.8 },
  { date: 'Jul',  planned: 22,  actual: 19.5 },
  { date: 'Aug',  planned: 36,  actual: 31.2 },
  { date: 'Sep',  planned: 52,  actual: 44.1 },
  { date: 'Oct',  planned: 66,  actual: null },
  { date: 'Nov',  planned: 78,  actual: null },
  { date: 'Dec',  planned: 88,  actual: null },
  { date: 'Jan',  planned: 95,  actual: null },
  { date: 'Feb',  planned: 100, actual: null },
];

// ============================================================
// DISCIPLINE PROGRESS
// ============================================================
export const disciplineProgress: DisciplineProgress[] = [
  { discipline: 'Civil',           planned: 68, actual: 61, variance: -7,  color: '#64748b' },
  { discipline: 'Piping',          planned: 54, actual: 44, variance: -10, color: '#3b82f6' },
  { discipline: 'Electrical',      planned: 38, actual: 29, variance: -9,  color: '#f59e0b' },
  { discipline: 'Instrumentation', planned: 22, actual: 18, variance: -4,  color: '#8b5cf6' },
  { discipline: 'Mechanical',      planned: 31, actual: 25, variance: -6,  color: '#10b981' },
];

// ============================================================
// DASHBOARD KPI
// ============================================================
export const dashboardKPIs = {
  totalActivities: 1247,
  extractedEvents: 234,
  autoLinked: 192,
  needsReview: 31,
  unmatched: 11,
  avgConfidence: 89,
  activitiesComplete: 387,
  activitiesStarted: 142,
  activitiesDelayed: 28,
  overallProgress: 44.1,
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================
export function getConfidenceClass(score: number): string {
  if (score >= 85) return 'confidence-fill-high';
  if (score >= 70) return 'confidence-fill-mid';
  return 'confidence-fill-low';
}

export function getStatusBadgeClass(status: MatchStatus): string {
  switch (status) {
    case 'AUTO_LINK':    return 'badge-auto';
    case 'NEEDS_REVIEW': return 'badge-review';
    case 'UNMATCHED':    return 'badge-unmatch';
    case 'NEW_ACTIVITY': return 'badge-process';
    default: return 'badge-neutral';
  }
}

export function getStatusLabel(status: MatchStatus): string {
  switch (status) {
    case 'AUTO_LINK':    return 'Auto Linked';
    case 'NEEDS_REVIEW': return 'Needs Review';
    case 'UNMATCHED':    return 'Unmatched';
    case 'NEW_ACTIVITY': return 'New Activity';
    default: return status;
  }
}

export function getDisciplineColor(disc: Discipline): string {
  const map: Record<Discipline, string> = {
    Civil: '#64748b', Piping: '#3b82f6', Electrical: '#f59e0b',
    Instrumentation: '#8b5cf6', Mechanical: '#10b981', HSE: '#ef4444',
  };
  return map[disc] ?? '#64748b';
}

export function formatDatetime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
