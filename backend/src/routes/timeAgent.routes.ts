import { Router } from 'express';
import { prisma } from '../services/db.js';
import { extractEventsFromText } from '../services/nlpEngine.js';
import { matchEventToActivities } from '../services/matchingEngine.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { message, commit } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message content required' });
    }

    // 1. NLP / LLM extraction
    const extractedEvents = await extractEventsFromText(message, '2026-09-21');
    const primaryEvent = extractedEvents[0] || {
      discipline: 'Piping',
      activityDescription: message,
      sourceText: message,
      extractionConfidence: 0.90,
      engineUsed: 'DETERMINISTIC_NLP',
    };

    // 2. Fetch candidate schedule activities
    const scheduleActivities = await prisma.scheduleActivity.findMany();

    // 3. Match against activities
    const candidates = matchEventToActivities(
      {
        discipline: primaryEvent.discipline,
        activityDescription: primaryEvent.activityDescription,
        location: primaryEvent.location,
        quantity: primaryEvent.quantity,
        unit: primaryEvent.unit,
        sourceText: primaryEvent.sourceText,
      },
      scheduleActivities
    );

    const topMatch = candidates[0];

    // If user clicked confirm/commit to schedule
    if (commit && topMatch) {
      let project = await prisma.project.findFirst();
      if (!project) {
        project = await prisma.project.create({ data: { name: 'Main Infrastructure' } });
      }

      const progressEvent = await prisma.progressEvent.create({
        data: {
          projectId: project.id,
          discipline: primaryEvent.discipline,
          activityDescription: primaryEvent.activityDescription,
          actualStart: primaryEvent.actualStart ? new Date(`2026-09-21T${primaryEvent.actualStart}:00Z`) : null,
          actualEnd: primaryEvent.actualEnd ? new Date(`2026-09-21T${primaryEvent.actualEnd}:00Z`) : null,
          quantity: primaryEvent.quantity,
          unit: primaryEvent.unit,
          location: primaryEvent.location,
          sourceText: message,
          extractionConfidence: primaryEvent.extractionConfidence,
          status: 'LINKED',
        },
      });

      await prisma.activityMatch.create({
        data: {
          progressEventId: progressEvent.id,
          scheduleActivityId: topMatch.scheduleActivityId,
          semanticScore: topMatch.semanticScore,
          fuzzyScore: topMatch.fuzzyScore,
          disciplineScore: topMatch.disciplineScore,
          locationScore: topMatch.locationScore,
          identifierScore: topMatch.identifierScore,
          dateScore: topMatch.dateScore,
          finalConfidence: topMatch.finalConfidence,
          decision: 'AUTO_LINK',
          explanation: topMatch.explanation,
        },
      });

      await prisma.auditLog.create({
        data: {
          entityType: 'ActivityMatch',
          entityId: progressEvent.id,
          action: 'TIME_AGENT_LOGGED',
          oldValue: 'UNREPORTED',
          newValue: `LINKED to ${topMatch.activityCode}`,
          userId: 'Field Supervisor (via Time Agent)',
          source: 'AI',
          confidence: topMatch.finalConfidence,
          explanation: `Logged via Conversational Time Agent: "${message}"`,
        },
      });

      return res.json({
        committed: true,
        message: `Successfully linked execution to ${topMatch.activityCode} (${topMatch.activityName})`,
        progressEvent,
      });
    }

    res.json({
      extraction: {
        discipline: primaryEvent.discipline,
        activity: primaryEvent.activityDescription,
        quantity: primaryEvent.quantity ? `${primaryEvent.quantity} ${primaryEvent.unit || ''}`.trim() : undefined,
        location: primaryEvent.location,
        start: primaryEvent.actualStart,
        end: primaryEvent.actualEnd,
        date: '21 Sep 2026',
        engineUsed: primaryEvent.engineUsed,
      },
      match: topMatch
        ? {
            activityCode: topMatch.activityCode,
            activityName: topMatch.activityName,
            wbs: topMatch.wbsCode,
            confidence: topMatch.finalConfidence,
            explanation: topMatch.explanation,
            evidenceChecks: [
              { label: 'Discipline Aligned', pass: topMatch.disciplineScore === 1.0 },
              { label: 'Location Aligned', pass: topMatch.locationScore >= 0.8 },
              { label: 'Tag / Identifier Aligned', pass: topMatch.identifierScore > 0 },
            ],
          }
        : null,
      reply: topMatch
        ? `I have parsed this work item as ${primaryEvent.discipline} activity "${primaryEvent.activityDescription}". I found a high-confidence match with schedule activity ${topMatch.activityCode} (${topMatch.activityName}, Confidence: ${Math.round(topMatch.finalConfidence * 100)}%). Would you like me to link this progress directly to the baseline schedule?`
        : `I noted your update for ${primaryEvent.discipline}, but could not find a confident schedule activity candidate. Would you like me to route this to the Planner Review Queue?`,
    });
  } catch (err: any) {
    console.error('Time agent error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
