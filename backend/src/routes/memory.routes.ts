import { Router } from 'express';
import { prisma } from '../services/db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const historicals = await prisma.historicalExecution.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      historicals.map(h => ({
        id: h.id,
        discipline: h.discipline,
        activityName: h.activityName,
        plannedDuration: h.plannedDuration,
        actualDuration: h.actualDuration,
        variance: h.variance,
        delayReason: h.delayReason,
        contractor: h.contractor,
        quantity: h.quantity,
        productivity: h.productivity,
      }))
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
