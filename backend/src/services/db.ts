import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function ensureDatabaseSeeded() {
  try {
    const projectCount = await prisma.project.count();
    if (projectCount === 0) {
      await prisma.project.create({
        data: {
          name: 'Refinery Expansion Phase 2 — Hydrocracker & Utilities',
          location: 'Area 4 — West Site Complex',
          startDate: new Date(),
          endDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
        },
      });
      console.log('[DB] Initialized clean project workspace for project manager (0 activities, 0 events).');
    } else {
      console.log(`[DB] Database initialized with ${projectCount} project(s). Ready for user import.`);
    }
  } catch (err) {
    console.warn('[DB] Project check note:', err);
  }
}
