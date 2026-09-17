import { Router } from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import { prisma } from '../services/db.js';
import { extractEventsFromText } from '../services/nlpEngine.js';
import { matchEventToActivities } from '../services/matchingEngine.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

function parseSafeDate(timeStr?: string | null, baseDate = '2026-09-21'): Date | null {
  if (!timeStr) return null;
  const d = new Date(timeStr);
  if (!isNaN(d.getTime())) return d;

  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const mins = parseInt(timeMatch[2], 10);
    const secs = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
    const base = new Date(baseDate);
    if (!isNaN(base.getTime())) {
      base.setHours(hours, mins, secs, 0);
      return base;
    }
  }
  return null;
}

// GET /api/reports/documents - list ingested documents
router.get('/documents', async (req, res) => {
  try {
    const documents = await prisma.ingestionDocument.findMany({
      orderBy: { uploadedAt: 'desc' },
      include: {
        progressEvents: {
          include: { matches: true },
        },
      },
    });

    const formatted = documents.map(doc => {
      let extractedCount = doc.progressEvents.length;
      let autoMatched = 0;
      let needsReview = 0;

      for (const ev of doc.progressEvents) {
        for (const m of ev.matches) {
          if (m.decision === 'AUTO_LINK') autoMatched++;
          if (m.decision === 'NEEDS_REVIEW') needsReview++;
        }
      }

      return {
        id: doc.id,
        name: doc.filename,
        format: doc.sourceType,
        uploadedAt: doc.uploadedAt,
        status: doc.processingStatus,
        extractedCount,
        autoMatched,
        needsReview,
      };
    });

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/reports/clear - wipe all ingested documents, progress events and matches
router.delete('/clear', async (req, res) => {
  try {
    await prisma.activityMatch.deleteMany({});
    await prisma.plannerReview.deleteMany({});
    await prisma.progressEvent.deleteMany({});
    await prisma.ingestionDocument.deleteMany({});
    // Reset schedule activities status back to NOT_STARTED
    await prisma.scheduleActivity.updateMany({
      data: { status: 'NOT_STARTED', actualStart: null, actualFinish: null },
    });
    res.json({ success: true, message: 'All ingested reports and matches cleared.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reports/upload - upload a DPR file or text
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    let filename = 'DPR_DirectInput.txt';
    let sourceType = 'TXT';
    let rawContent = req.body.rawContent || '';

    if (req.file) {
      filename = req.file.originalname;
      const lower = filename.toLowerCase();

      if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
        sourceType = 'XLSX';
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const textLines: string[] = [];

        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const rows: any[] = xlsx.utils.sheet_to_json(sheet);

          for (const r of rows) {
            const disc = r.Discipline || r.discipline || '';
            const desc = r['Activity Description'] || r.Activity || r.Description || r.description || r.activity || '';
            const loc = r.Location || r.location || r.Area || r.area || '';
            const qty = r.Quantity || r.quantity || '';
            const unit = r.Unit || r.unit || '';
            const date = r.Date || r.date || r['Report Date'] || '';
            const start = r['Start Time'] || r.StartTime || r.start || '';
            const end = r['End Time'] || r.EndTime || r.end || '';
            const remarks = r.Remarks || r.remarks || '';
            const reportedBy = r['Reported By'] || r.reportedBy || '';

            let line = '';
            if (date) line += `Date: ${date}. `;
            if (disc) line += `[${disc}] `;
            if (desc) line += `${desc}. `;
            if (loc) line += `Location: ${loc}. `;
            if (qty) line += `Quantity: ${qty} ${unit}. `;
            if (start || end) line += `Hours: ${start} - ${end}. `;
            if (remarks) line += `Notes: ${remarks}. `;
            if (reportedBy) line += `Reported by: ${reportedBy}.`;

            if (line.trim()) {
              textLines.push(line.trim());
            } else {
              const parts = Object.entries(r)
                .filter(([_, v]) => v != null && String(v).trim() !== '')
                .map(([k, v]) => `${k}: ${v}`);
              if (parts.length > 0) textLines.push(parts.join(' | '));
            }
          }
        }
        rawContent = textLines.join('\n');
      } else if (lower.endsWith('.csv')) {
        sourceType = 'CSV';
        rawContent = req.file.buffer.toString('utf-8');
      } else if (lower.endsWith('.pdf')) {
        sourceType = 'PDF';
        rawContent = req.file.buffer.toString('utf-8');
      } else {
        sourceType = 'TXT';
        rawContent = req.file.buffer.toString('utf-8');
      }
    }

    if (!rawContent || rawContent.trim().length === 0) {
      return res.status(400).json({ error: 'Report content cannot be empty' });
    }

    let project = await prisma.project.findFirst();
    if (!project) {
      project = await prisma.project.create({
        data: { name: 'Main Infrastructure Project' },
      });
    }

    const doc = await prisma.ingestionDocument.create({
      data: {
        projectId: project.id,
        filename,
        sourceType,
        uploadedBy: req.body.uploadedBy || 'Site Supervisor',
        rawContent,
        processingStatus: 'PENDING',
      },
    });

    res.json({
      document_id: doc.id,
      filename: doc.filename,
      status: doc.processingStatus,
    });
  } catch (err: any) {
    console.error('Report upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reports/process - execute parsing, extraction & matching pipeline
router.post('/process', async (req, res) => {
  try {
    const { document_id, rawText, reportDate } = req.body;
    const effectiveReportDate = reportDate || new Date().toISOString().slice(0, 10);

    let doc: any = null;
    let contentToProcess = '';

    if (document_id) {
      doc = await prisma.ingestionDocument.findUnique({ where: { id: document_id } });
      if (doc && doc.rawContent) {
        contentToProcess = doc.rawContent;
      }
    }

    if (!contentToProcess && rawText) {
      contentToProcess = rawText;
    }

    if (!contentToProcess) {
      return res.status(400).json({ error: 'No content to process' });
    }

    let project = await prisma.project.findFirst();
    if (!project) {
      project = await prisma.project.create({
        data: { name: 'Main Infrastructure Project' },
      });
    }

    // 1. AI or Deterministic Extraction
    const extractedEvents = await extractEventsFromText(contentToProcess, effectiveReportDate);

    // 2. Load all schedule activities
    const scheduleActivities = await prisma.scheduleActivity.findMany({
      where: { projectId: project.id },
    });

    let autoMatchedCount = 0;
    let needsReviewCount = 0;
    const createdMatches: any[] = [];

    // 3. Process each event
    for (const item of extractedEvents) {
      const progressEvent = await prisma.progressEvent.create({
        data: {
          projectId: project.id,
          documentId: doc ? doc.id : undefined,
          discipline: item.discipline,
          activityDescription: item.activityDescription,
          actualStart: parseSafeDate(item.actualStart, reportDate),
          actualEnd: parseSafeDate(item.actualEnd, reportDate),
          quantity: item.quantity ?? null,
          unit: item.unit ?? null,
          location: item.location ?? null,
          sourceText: item.sourceText,
          extractionConfidence: item.extractionConfidence,
          status: 'EXTRACTED',
        },
      });

      // Match against schedule activities
      const matches = matchEventToActivities(
        {
          id: progressEvent.id,
          discipline: item.discipline,
          activityDescription: item.activityDescription,
          quantity: item.quantity,
          unit: item.unit,
          location: item.location,
          sourceText: item.sourceText,
          extractionConfidence: item.extractionConfidence,
          reportDate: reportDate || '2026-09-21',
        },
        scheduleActivities.map(a => ({
          id: a.id,
          activityCode: a.activityCode,
          wbsCode: a.wbsCode,
          name: a.name,
          discipline: a.discipline,
          plannedStart: a.plannedStart.toISOString().slice(0, 10),
          plannedFinish: a.plannedFinish.toISOString().slice(0, 10),
          plannedDuration: a.plannedDuration,
          quantity: a.quantity ?? undefined,
          unit: a.unit ?? undefined,
          location: a.location ?? undefined,
          status: a.status as any,
        }))
      );

      if (matches.length > 0) {
        const top = matches[0];

        if (top.decision === 'AUTO_LINK') autoMatchedCount++;
        else if (top.decision === 'NEEDS_REVIEW') needsReviewCount++;

        // Update progressEvent status
        await prisma.progressEvent.update({
          where: { id: progressEvent.id },
          data: {
            status: top.decision === 'AUTO_LINK' ? 'LINKED' : 'NEEDS_REVIEW',
          },
        });

        // Update schedule activity status if auto-linked
        if (top.decision === 'AUTO_LINK') {
          const act = scheduleActivities.find(a => a.id === top.scheduleActivityId);
          const today = new Date();
          const finishDate = reportDate ? new Date(reportDate) : today;
          const startDate = act?.plannedStart ? new Date(act.plannedStart) : finishDate;

          await prisma.scheduleActivity.update({
            where: { id: top.scheduleActivityId },
            data: {
              status: 'COMPLETE',
              actualStart: act?.actualStart ? act.actualStart : startDate,
              actualFinish: finishDate,
              quantity: item.quantity != null ? Number(item.quantity) : act?.quantity,
              unit: item.unit || act?.unit,
              location: item.location || act?.location,
            },
          });
        }

        // Save activity match record
        const matchRecord = await prisma.activityMatch.create({
          data: {
            progressEventId: progressEvent.id,
            scheduleActivityId: top.scheduleActivityId,
            semanticScore: top.semanticScore,
            fuzzyScore: top.fuzzyScore,
            disciplineScore: top.disciplineScore,
            locationScore: top.locationScore,
            identifierScore: top.identifierScore,
            dateScore: top.dateScore,
            finalConfidence: top.finalConfidence,
            decision: top.decision,
            explanation: top.explanation,
          },
          include: {
            scheduleActivity: true,
            progressEvent: true,
          },
        });

        createdMatches.push(matchRecord);
      }
    }

    if (doc) {
      await prisma.ingestionDocument.update({
        where: { id: doc.id },
        data: { processingStatus: 'COMPLETED' },
      });
    }

    res.json({
      success: true,
      document_id: doc ? doc.id : null,
      extractedCount: extractedEvents.length,
      autoMatched: autoMatchedCount,
      needsReview: needsReviewCount,
      matches: createdMatches,
    });
  } catch (err: any) {
    console.error('Report processing error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
