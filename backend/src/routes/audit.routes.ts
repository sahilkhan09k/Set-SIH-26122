import { Router } from 'express';
import { prisma } from '../services/db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { source } = req.query;

    const where: any = {};
    if (source && typeof source === 'string' && source !== 'ALL') {
      where.source = source;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    res.json(
      logs.map(l => ({
        id: l.id,
        timestamp: l.timestamp.toISOString(),
        user: l.userId,
        action: l.action,
        entity: l.entityType,
        entityId: l.entityId,
        oldValue: l.oldValue,
        newValue: l.newValue,
        source: l.source,
        confidence: l.confidence,
        explanation: l.explanation,
      }))
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
