import { Router } from 'express';
import { prisma } from '../services/db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const totalActivities = await prisma.scheduleActivity.count();
    const extractedEvents = await prisma.progressEvent.count();

    const matches = await prisma.activityMatch.findMany({
      include: {
        scheduleActivity: true,
        progressEvent: true,
      },
    });

    let autoLinked = 0;
    let needsReview = 0;
    let unmatched = 0;
    let sumConfidence = 0;

    for (const m of matches) {
      if (m.decision === 'AUTO_LINK') autoLinked++;
      else if (m.decision === 'NEEDS_REVIEW') needsReview++;
      else unmatched++;

      sumConfidence += m.finalConfidence;
    }

    const averageConfidence = matches.length > 0 ? Math.round((sumConfidence / matches.length) * 100) : 0;

    const delayedActivities = await prisma.scheduleActivity.count({
      where: { status: 'DELAYED' },
    });

    // Discipline progress calculation
    const allActivities = await prisma.scheduleActivity.findMany();
    const disciplines = ['Civil', 'Piping', 'Electrical', 'Instrumentation', 'Mechanical', 'HSE'];
    const colors: Record<string, string> = {
      Civil: '#3b82f6',
      Piping: '#10b981',
      Electrical: '#f59e0b',
      Instrumentation: '#8b5cf6',
      Mechanical: '#06b6d4',
      HSE: '#ec4899',
    };

    let disciplineProgress: any[] = [];
    if (allActivities.length > 0) {
      disciplineProgress = disciplines.map(disc => {
        const acts = allActivities.filter(a => a.discipline.toLowerCase() === disc.toLowerCase());
        const total = acts.length;
        const completed = acts.filter(a => a.status === 'COMPLETE').length;
        const inProgress = acts.filter(a => a.status === 'IN_PROGRESS').length;

        const planned = total > 0 ? 65 : 0;
        const actual = total > 0 ? Math.min(100, Math.round(((completed + inProgress * 0.4) / total) * 100)) : 0;

        return {
          discipline: disc,
          planned,
          actual,
          variance: actual - planned,
          color: colors[disc] || '#3b82f6',
        };
      });
    }

    // S-Curve points - only if activities exist
    let sCurvePoints: any[] = [];
    if (allActivities.length > 0) {
      sCurvePoints = [
        { date: '01 Jun', planned: 2, actual: 2 },
        { date: '15 Jun', planned: 6, actual: 5 },
        { date: '01 Jul', planned: 12, actual: 11 },
        { date: '15 Jul', planned: 20, actual: 18 },
        { date: '01 Aug', planned: 30, actual: 27 },
        { date: '15 Aug', planned: 42, actual: 38 },
        { date: '01 Sep', planned: 56, actual: 51 },
        { date: '15 Sep', planned: 70, actual: 64 },
        { date: '21 Sep', planned: 76, actual: 69 },
        { date: '01 Oct', planned: 84, actual: null },
        { date: '15 Oct', planned: 92, actual: null },
        { date: '01 Nov', planned: 98, actual: null },
        { date: '15 Nov', planned: 100, actual: null },
      ];
    }

    // Recent documents
    const recentDocs = await prisma.ingestionDocument.findMany({
      take: 5,
      orderBy: { uploadedAt: 'desc' },
      include: { progressEvents: true },
    });

    const recentMatches = matches.slice(0, 5).map(m => ({
      id: m.id,
      activityCode: m.scheduleActivity.activityCode,
      activityName: m.scheduleActivity.name,
      reportedText: m.progressEvent.activityDescription,
      confidence: m.finalConfidence,
      status: m.decision,
      discipline: m.progressEvent.discipline,
    }));

    res.json({
      kpis: {
        totalActivities,
        extractedEvents,
        autoLinked,
        needsReview,
        unmatched,
        averageConfidence,
        delayedActivities,
      },
      disciplineProgress,
      sCurvePoints,
      recentDocuments: recentDocs,
      recentMatches,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
