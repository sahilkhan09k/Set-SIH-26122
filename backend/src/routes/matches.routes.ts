import { Router } from 'express';
import { prisma } from '../services/db.js';

const router = Router();

// GET /api/matches - list matches, optionally filtered by status
router.get('/', async (req, res) => {
  try {
    const { status, discipline } = req.query;

    const where: any = {};
    if (status && typeof status === 'string' && status !== 'ALL') {
      where.decision = status;
    }

    const matches = await prisma.activityMatch.findMany({
      where,
      include: {
        progressEvent: true,
        scheduleActivity: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format matches for UI consumption
    const formatted = matches.map(m => ({
      id: m.id,
      progressEventId: m.progressEventId,
      scheduleActivityId: m.scheduleActivityId,
      progressEvent: {
        id: m.progressEvent.id,
        discipline: m.progressEvent.discipline,
        activityDescription: m.progressEvent.activityDescription,
        actualStart: m.progressEvent.actualStart?.toISOString().slice(11, 16),
        actualEnd: m.progressEvent.actualEnd?.toISOString().slice(11, 16),
        quantity: m.progressEvent.quantity ?? undefined,
        unit: m.progressEvent.unit ?? undefined,
        location: m.progressEvent.location ?? undefined,
        sourceText: m.progressEvent.sourceText,
        extractionConfidence: m.progressEvent.extractionConfidence,
        reportDate: m.progressEvent.createdAt.toISOString().slice(0, 10),
      },
      scheduleActivity: {
        id: m.scheduleActivity.id,
        activityCode: m.scheduleActivity.activityCode,
        wbsCode: m.scheduleActivity.wbsCode,
        name: m.scheduleActivity.name,
        discipline: m.scheduleActivity.discipline,
        plannedStart: m.scheduleActivity.plannedStart.toISOString().slice(0, 10),
        plannedFinish: m.scheduleActivity.plannedFinish.toISOString().slice(0, 10),
        plannedDuration: m.scheduleActivity.plannedDuration,
        quantity: m.scheduleActivity.quantity ?? undefined,
        unit: m.scheduleActivity.unit ?? undefined,
        location: m.scheduleActivity.location ?? undefined,
        status: m.scheduleActivity.status,
      },
      semanticScore: m.semanticScore,
      fuzzyScore: m.fuzzyScore,
      disciplineScore: m.disciplineScore,
      locationScore: m.locationScore,
      identifierScore: m.identifierScore,
      dateScore: m.dateScore,
      finalConfidence: m.finalConfidence,
      decision: m.decision,
      explanation: m.explanation,
      evidenceItems: [
        { label: 'Discipline Verification', matches: m.disciplineScore === 1.0, detail: `${m.progressEvent.discipline} ↔ ${m.scheduleActivity.discipline}` },
        { label: 'Spatial Location Match', matches: m.locationScore >= 0.8, detail: m.progressEvent.location || 'Site sector' },
        { label: 'Tag / Spec Correlation', matches: m.identifierScore > 0, detail: 'Tag identified' },
        { label: 'WBS Level Alignment', matches: true, detail: `WBS ${m.scheduleActivity.wbsCode}` },
      ],
    }));

    // Filter discipline if specified
    const filtered = discipline && discipline !== 'ALL'
      ? formatted.filter(item => item.progressEvent.discipline.toLowerCase() === (discipline as string).toLowerCase())
      : formatted;

    res.json(filtered);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/matches/:id/approve - approve suggested match
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewerId = 'Lead Planner', reason } = req.body;

    const match = await prisma.activityMatch.findUnique({
      where: { id },
      include: { scheduleActivity: true, progressEvent: true },
    });

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Update match decision to AUTO_LINK / APPROVED
    await prisma.activityMatch.update({
      where: { id },
      data: { decision: 'AUTO_LINK' },
    });

    // Update progress event status
    await prisma.progressEvent.update({
      where: { id: match.progressEventId },
      data: { status: 'LINKED' },
    });

    // Update schedule activity status to COMPLETE
    const act = match.scheduleActivity;
    const event = match.progressEvent;
    const today = new Date();
    const finishDate = event.actualEnd ? new Date(event.actualEnd) : (event.createdAt ? new Date(event.createdAt) : today);
    const startDate = act.actualStart ? new Date(act.actualStart) : (act.plannedStart ? new Date(act.plannedStart) : finishDate);

    await prisma.scheduleActivity.update({
      where: { id: match.scheduleActivityId },
      data: {
        status: 'COMPLETE',
        actualStart: startDate,
        actualFinish: finishDate,
        quantity: event.quantity != null ? Number(event.quantity) : act.quantity,
        unit: event.unit || act.unit,
        location: event.location || act.location,
      },
    });

    // Create planner review record
    await prisma.plannerReview.create({
      data: {
        matchId: id,
        reviewerId,
        action: 'APPROVED',
        selectedActivityId: match.scheduleActivityId,
        reason: reason || 'Planner verified alignment between reported execution and scheduled work.',
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'ActivityMatch',
        entityId: id,
        action: 'PLANNER_APPROVED',
        oldValue: 'NEEDS_REVIEW',
        newValue: `LINKED to ${match.scheduleActivity.activityCode}`,
        userId: reviewerId,
        source: 'PLANNER',
        confidence: match.finalConfidence,
        explanation: reason || 'Approved by planner during reconciliation review.',
      },
    });

    res.json({ success: true, message: 'Match approved successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/matches/:id/reject - reject match
router.post('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewerId = 'Lead Planner', reason } = req.body;

    const match = await prisma.activityMatch.findUnique({
      where: { id },
      include: { scheduleActivity: true },
    });

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    await prisma.activityMatch.update({
      where: { id },
      data: { decision: 'UNMATCHED' },
    });

    await prisma.plannerReview.create({
      data: {
        matchId: id,
        reviewerId,
        action: 'REJECTED',
        reason: reason || 'Field report scope does not correspond to candidate activity.',
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'ActivityMatch',
        entityId: id,
        action: 'PLANNER_REJECTED',
        oldValue: match.scheduleActivity.activityCode,
        newValue: 'UNMATCHED',
        userId: reviewerId,
        source: 'PLANNER',
        confidence: match.finalConfidence,
        explanation: reason || 'Rejected by planner.',
      },
    });

    res.json({ success: true, message: 'Match rejected' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/matches/:id/correct - select another schedule activity
router.post('/:id/correct', async (req, res) => {
  try {
    const { id } = req.params;
    const { newScheduleActivityId, reviewerId = 'Lead Planner', reason } = req.body;

    const match = await prisma.activityMatch.findUnique({
      where: { id },
      include: { scheduleActivity: true },
    });

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const newActivity = await prisma.scheduleActivity.findUnique({
      where: { id: newScheduleActivityId },
    });

    if (!newActivity) {
      return res.status(404).json({ error: 'Target schedule activity not found' });
    }

    const oldActivityCode = match.scheduleActivity.activityCode;

    // Update match with new activity and mark as AUTO_LINK / LINKED
    await prisma.activityMatch.update({
      where: { id },
      data: {
        scheduleActivityId: newScheduleActivityId,
        decision: 'AUTO_LINK',
        finalConfidence: 1.0,
        explanation: `Planner manual override to ${newActivity.activityCode} (${newActivity.name}). Reason: ${reason || 'Direct assignment'}`,
      },
    });

    await prisma.progressEvent.update({
      where: { id: match.progressEventId },
      data: { status: 'LINKED' },
    });

    // Update target schedule activity to COMPLETE
    const pe = await prisma.progressEvent.findUnique({ where: { id: match.progressEventId } });
    const today = new Date();
    const finishDate = pe?.actualEnd ? new Date(pe.actualEnd) : (pe?.createdAt ? new Date(pe.createdAt) : today);
    const startDate = newActivity.actualStart ? new Date(newActivity.actualStart) : (newActivity.plannedStart ? new Date(newActivity.plannedStart) : finishDate);

    await prisma.scheduleActivity.update({
      where: { id: newScheduleActivityId },
      data: {
        status: 'COMPLETE',
        actualStart: startDate,
        actualFinish: finishDate,
        quantity: pe?.quantity != null ? Number(pe?.quantity) : newActivity.quantity,
        unit: pe?.unit || newActivity.unit,
        location: pe?.location || newActivity.location,
      },
    });

    await prisma.plannerReview.create({
      data: {
        matchId: id,
        reviewerId,
        action: 'REASSIGNED',
        originalActivityId: match.scheduleActivityId,
        selectedActivityId: newScheduleActivityId,
        reason: reason || 'Planner corrected candidate mapping.',
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'ActivityMatch',
        entityId: id,
        action: 'REASSIGNED',
        oldValue: oldActivityCode,
        newValue: newActivity.activityCode,
        userId: reviewerId,
        source: 'PLANNER',
        confidence: 1.0,
        explanation: reason || 'Planner manual correction.',
      },
    });

    res.json({ success: true, message: 'Match corrected successfully', newActivity });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
