import { Router } from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import { parse } from 'csv-parse/sync';
import { prisma } from '../services/db.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// ============================================================
// XER Parser — Primavera P6 native format
// ============================================================
interface XerActivity {
  task_code: string;
  task_name: string;
  target_start_date?: string;
  target_end_date?: string;
  phys_complete_pct?: string;
  wbs_id?: string;
}

interface XerWbs {
  wbs_id: string;
  wbs_short_name: string;
  wbs_name: string;
}

function parseXer(content: string): { activities: XerActivity[]; wbsMap: Record<string, XerWbs> } {
  const lines = content.split('\n').map(l => l.trimEnd());
  let currentTable = '';
  let currentFields: string[] = [];
  const activities: XerActivity[] = [];
  const wbsMap: Record<string, XerWbs> = {};

  for (const line of lines) {
    if (line.startsWith('%T\t')) {
      currentTable = line.slice(3).trim();
      currentFields = [];
      continue;
    }
    if (line.startsWith('%F\t')) {
      currentFields = line.slice(3).trim().split('\t');
      continue;
    }
    if (line.startsWith('%R\t') && currentFields.length > 0) {
      const vals = line.slice(3).split('\t');
      const record: Record<string, string> = {};
      currentFields.forEach((f, i) => { record[f] = (vals[i] || '').trim(); });

      if (currentTable === 'TASK') {
        activities.push(record as any);
      } else if (currentTable === 'WBS') {
        wbsMap[record.wbs_id] = record as any;
      }
      continue;
    }
  }
  return { activities, wbsMap };
}

/** Infer discipline from activity code prefix or name keywords */
function inferDiscipline(code: string, name: string): string {
  const upper = (code + ' ' + name).toUpperCase();
  if (upper.startsWith('CIV') || upper.includes('CIVIL') || upper.includes('CONCRETE') || upper.includes('FOUNDATION') || upper.includes('STRUCTURAL')) return 'Civil';
  if (upper.startsWith('PIP') || upper.includes('PIPING') || upper.includes('SPOOL') || upper.includes('WELD') || upper.includes('LINE')) return 'Piping';
  if (upper.startsWith('ELE') || upper.includes('ELECTRICAL') || upper.includes('CABLE') || upper.includes('SWITCHGEAR') || upper.includes('EARTHING')) return 'Electrical';
  if (upper.startsWith('INS') || upper.includes('INSTRUMENT') || upper.includes('TRANSMITTER') || upper.includes('LOOP') || upper.includes('SENSOR')) return 'Instrumentation';
  if (upper.startsWith('MEC') || upper.includes('MECHANICAL') || upper.includes('PUMP') || upper.includes('COMPRESSOR') || upper.includes('HEAT EXCHANGER') || upper.includes('ALIGNMENT')) return 'Mechanical';
  if (upper.includes('HSE') || upper.includes('SAFETY') || upper.includes('PERMIT')) return 'HSE';
  return 'Civil';
}

/** Infer location from name keywords */
function inferLocation(name: string): string | null {
  const patterns = [
    /Rack\s*[A-Z0-9\-]+/i,
    /Substation\s*[A-Z0-9\-]+/i,
    /Foundation\s*[A-Z0-9\-]+/i,
    /Area\s*[A-Z0-9\-]+/i,
    /Unit\s*\d+/i,
    /Zone\s*[A-Z0-9\-]+/i,
    /Pump\s*House\s*[A-Z0-9\-]+/i,
  ];
  for (const p of patterns) {
    const m = name.match(p);
    if (m) return m[0];
  }
  return null;
}

// GET /api/schedule/activities - list all baseline activities
router.get('/activities', async (req, res) => {
  try {
    const activities = await prisma.scheduleActivity.findMany({
      orderBy: { activityCode: 'asc' },
    });
    res.json(activities);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/schedule/activities - clear all activities (for fresh XER import)
router.delete('/activities', async (req, res) => {
  try {
    await prisma.activityMatch.deleteMany({});
    await prisma.progressEvent.deleteMany({});
    await prisma.scheduleActivity.deleteMany({});
    res.json({ success: true, message: 'All activities cleared' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/schedule/upload - upload baseline schedule (XER, CSV, or XLSX)
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get default project
    let project = await prisma.project.findFirst();
    if (!project) {
      project = await prisma.project.create({
        data: {
          name: 'Primary Infrastructure Project',
          location: 'Main Complex',
        },
      });
    }

    let importedCount = 0;
    const filename = file.originalname.toLowerCase();

    // ── XER (Primavera P6) ──────────────────────────────────────────────────
    if (filename.endsWith('.xer')) {
      const content = file.buffer.toString('utf-8');
      const { activities, wbsMap } = parseXer(content);

      if (activities.length === 0) {
        return res.status(400).json({ error: 'No TASK records found in XER file. Ensure the file contains %T TASK sections.' });
      }

      for (const act of activities) {
        const code = act.task_code || `ACT-${Math.floor(Math.random() * 9000 + 1000)}`;
        const name = act.task_name || 'Scheduled Construction Task';
        const wbsEntry = act.wbs_id ? wbsMap[act.wbs_id] : null;
        const wbsCode = wbsEntry ? wbsEntry.wbs_short_name : '1.0';
        const discipline = inferDiscipline(code, name);
        const location = inferLocation(name);

        const plannedStart = act.target_start_date ? new Date(act.target_start_date) : new Date();
        const plannedFinish = act.target_end_date ? new Date(act.target_end_date) : new Date(Date.now() + 7 * 86400000);
        const plannedDuration = Math.max(1, Math.round((plannedFinish.getTime() - plannedStart.getTime()) / (1000 * 3600 * 24)));
        const pct = parseFloat(act.phys_complete_pct || '0');
        const status = pct >= 100 ? 'COMPLETE' : pct > 0 ? 'IN_PROGRESS' : 'NOT_STARTED';

        await prisma.scheduleActivity.create({
          data: {
            projectId: project.id,
            activityCode: code,
            wbsCode,
            name,
            discipline,
            plannedStart,
            plannedFinish,
            plannedDuration,
            location,
            status,
          },
        });
        importedCount++;
      }
    }
    // ── CSV ─────────────────────────────────────────────────────────────────
    else if (filename.endsWith('.csv')) {
      const records: any[] = parse(file.buffer.toString('utf-8'), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      for (const row of records) {
        const code = row['Activity ID'] || row['Activity Code'] || row['activity_code'] || row['ID'] || `ACT-${Math.floor(Math.random() * 9000 + 1000)}`;
        const name = row['Activity Name'] || row['Description'] || row['activity_name'] || row['Name'] || 'Scheduled Construction Task';
        const wbs = row['WBS'] || row['WBS Code'] || row['wbs_code'] || '1.0';
        const discipline = row['Discipline'] || row['discipline'] || inferDiscipline(code, name);
        const location = row['Location'] || row['location'] || row['Area'] || inferLocation(name);
        const quantity = parseFloat(row['Quantity'] || row['quantity'] || '0') || null;
        const unit = row['Unit'] || row['unit'] || null;

        const startDateStr = row['Planned Start'] || row['Start'] || row['planned_start'];
        const finishDateStr = row['Planned Finish'] || row['Finish'] || row['planned_finish'];

        const plannedStart = startDateStr ? new Date(startDateStr) : new Date();
        const plannedFinish = finishDateStr ? new Date(finishDateStr) : new Date(Date.now() + 7 * 86400000);
        const plannedDuration = Math.max(1, Math.round((plannedFinish.getTime() - plannedStart.getTime()) / (1000 * 3600 * 24)));

        await prisma.scheduleActivity.create({
          data: {
            projectId: project.id,
            activityCode: String(code),
            wbsCode: String(wbs),
            name: String(name),
            discipline: String(discipline),
            plannedStart,
            plannedFinish,
            plannedDuration,
            quantity,
            unit: unit ? String(unit) : null,
            location: location ? String(location) : null,
            status: 'NOT_STARTED',
          },
        });
        importedCount++;
      }
    }
    // ── XLSX ─────────────────────────────────────────────────────────────────
    else {
      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      const firstSheet = workbook.SheetNames[0];
      const records: any[] = xlsx.utils.sheet_to_json(workbook.Sheets[firstSheet]);

      for (const row of records) {
        const code = row['Activity ID'] || row['Activity Code'] || row['activity_code'] || row['ID'] || `ACT-${Math.floor(Math.random() * 9000 + 1000)}`;
        const name = row['Activity Name'] || row['Description'] || row['activity_name'] || row['Name'] || 'Scheduled Construction Task';
        const wbs = row['WBS'] || row['WBS Code'] || row['wbs_code'] || '1.0';
        const discipline = row['Discipline'] || row['discipline'] || inferDiscipline(code, name);
        const location = row['Location'] || row['location'] || row['Area'] || inferLocation(name);
        const quantity = parseFloat(row['Quantity'] || row['quantity'] || '0') || null;
        const unit = row['Unit'] || row['unit'] || null;

        const startDateStr = row['Planned Start'] || row['Start'] || row['planned_start'];
        const finishDateStr = row['Planned Finish'] || row['Finish'] || row['planned_finish'];

        const plannedStart = startDateStr ? new Date(startDateStr) : new Date();
        const plannedFinish = finishDateStr ? new Date(finishDateStr) : new Date(Date.now() + 7 * 86400000);
        const plannedDuration = Math.max(1, Math.round((plannedFinish.getTime() - plannedStart.getTime()) / (1000 * 3600 * 24)));

        await prisma.scheduleActivity.create({
          data: {
            projectId: project.id,
            activityCode: String(code),
            wbsCode: String(wbs),
            name: String(name),
            discipline: String(discipline),
            plannedStart,
            plannedFinish,
            plannedDuration,
            quantity,
            unit: unit ? String(unit) : null,
            location: location ? String(location) : null,
            status: 'NOT_STARTED',
          },
        });
        importedCount++;
      }
    }

    // Log to audit
    await prisma.auditLog.create({
      data: {
        entityType: 'ScheduleActivity',
        entityId: project.id,
        action: 'SCHEDULE_IMPORTED',
        oldValue: '0',
        newValue: `${importedCount} activities`,
        userId: 'Lead Planner',
        source: 'PLANNER',
        explanation: `Imported schedule file: ${file.originalname} (${filename.endsWith('.xer') ? 'Primavera P6 XER' : filename.endsWith('.csv') ? 'CSV' : 'Excel'})`,
      },
    });

    res.json({
      success: true,
      filename: file.originalname,
      format: filename.endsWith('.xer') ? 'XER' : filename.endsWith('.csv') ? 'CSV' : 'XLSX',
      activities_imported: importedCount,
    });
  } catch (err: any) {
    console.error('Schedule upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
