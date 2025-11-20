import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './database.js';
import { initAI } from './services/aiService.js';
import scrapeRoutes from './routes/scrape.js';
import questionRoutes from './routes/question.js';
import authRoutes from './routes/auth.js';
import { authMiddleware, optionalAuth } from './middleware/auth.js';

// Load .env.local file
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database (async)
initDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Initialize AI service
initAI();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/scrape', authMiddleware, scrapeRoutes);
app.use('/api/question', optionalAuth, questionRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'WebLoom server is running' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'WebLoom API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      scrape: '/api/scrape',
      question: '/api/question'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 WebLoom server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

