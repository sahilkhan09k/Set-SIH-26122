import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../services/db.js';
import { extractEventsFromText } from '../services/nlpEngine.js';
import { matchEventToActivities } from '../services/matchingEngine.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

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

// POST /api/reports/upload - upload a DPR file or text
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    let filename = 'DPR_DirectInput.txt';
    let sourceType = 'TXT';
    let rawContent = req.body.rawContent || '';

    if (req.file) {
      filename = req.file.originalname;
      rawContent = req.file.buffer.toString('utf-8');
      if (filename.endsWith('.csv')) sourceType = 'CSV';
      else if (filename.endsWith('.xlsx')) sourceType = 'XLSX';
      else if (filename.endsWith('.pdf')) sourceType = 'PDF';
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

    let doc: any = null;
    let contentToProcess = rawText || '';

    if (document_id) {
      doc = await prisma.ingestionDocument.findUnique({ where: { id: document_id } });
      if (doc && doc.rawContent) {
        contentToProcess = doc.rawContent;
      }
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
    const extractedEvents = await extractEventsFromText(contentToProcess, reportDate || '2026-09-21');

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
          documentId: doc ? doc.id : undefined,
          projectId: project.id,
          discipline: item.discipline,
          activityDescription: item.activityDescription,
          actualStart: item.actualStart ? new Date(`2026-09-21T${item.actualStart}:00Z`) : null,
          actualEnd: item.actualEnd ? new Date(`2026-09-21T${item.actualEnd}:00Z`) : null,
          quantity: item.quantity,
          unit: item.unit,
          location: item.location,
          sourceText: item.sourceText,
          extractionConfidence: item.extractionConfidence,
          status: 'PROCESSED',
        },
      });

      // Match against schedule activities
      const candidateMatches = matchEventToActivities(
        {
          discipline: item.discipline,
          activityDescription: item.activityDescription,
          location: item.location,
          quantity: item.quantity,
          unit: item.unit,
          sourceText: item.sourceText,
        },
        scheduleActivities
      );

      if (candidateMatches.length > 0) {
        const top = candidateMatches[0];

        if (top.decision === 'AUTO_LINK') {
          autoMatchedCount++;
          // Update event status to LINKED
          await prisma.progressEvent.update({
            where: { id: progressEvent.id },
            data: { status: 'LINKED' },
          });

          // Create audit log
          await prisma.auditLog.create({
            data: {
              entityType: 'ActivityMatch',
              entityId: progressEvent.id,
              action: 'AUTO_LINKED',
              oldValue: 'UNLINKED',
              newValue: top.activityCode,
              userId: 'SETU Hybrid Engine (AI)',
              source: 'AI',
              confidence: top.finalConfidence,
              explanation: top.explanation,
            },
          });
        } else if (top.decision === 'NEEDS_REVIEW') {
          needsReviewCount++;
        }

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
