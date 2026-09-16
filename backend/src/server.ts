import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ensureDatabaseSeeded } from './services/db.js';
import scheduleRoutes from './routes/schedule.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import matchesRoutes from './routes/matches.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import timeAgentRoutes from './routes/timeAgent.routes.js';
import auditRoutes from './routes/audit.routes.js';
import memoryRoutes from './routes/memory.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health & Engine Status Endpoint
app.get('/api/health', (req, res) => {
  const hasGroqKey = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 0);
  res.json({
    status: 'ONLINE',
    service: 'SETU Backend API Engine',
    database: 'SQLite (Prisma)',
    llmMode: hasGroqKey ? 'GROQ_LLAMA_3.3_ACTIVE' : 'DETERMINISTIC_NLP_FALLBACK',
    hasGroqKey,
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/schedule', scheduleRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/time-agent', timeAgentRoutes);
app.use('/api/audit-log', auditRoutes);
app.use('/api/memory', memoryRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

async function startServer() {
  try {
    await ensureDatabaseSeeded();

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 SETU Backend API running at http://localhost:${PORT}`);
      console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🤖 AI Engine: ${process.env.GROQ_API_KEY ? 'Groq Llama 3.3 70B (Active)' : 'Deterministic NLP (Offline Fallback)'}`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Failed to boot SETU server:', err);
    process.exit(1);
  }
}

startServer();
