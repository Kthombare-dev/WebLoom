import express from 'express';
import { insertScrapedContent, getContentCount, getAllScrapedContent } from '../database.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { url, title, content, timestamp } = req.body;

    if (!url || !content) {
      return res.status(400).json({ 
        error: 'Missing required fields: url and content are required' 
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const id = await insertScrapedContent(
      url,
      title,
      content,
      timestamp || new Date().toISOString(),
      userId
    );

    const totalCount = await getContentCount(userId);

    res.status(201).json({
      success: true,
      message: 'Content scraped and saved successfully',
      data: {
        id,
        url,
        title: title || 'Untitled',
        contentLength: content.length,
        timestamp: timestamp || new Date().toISOString()
      },
      stats: {
        totalScraped: totalCount
      },
      args: req.query,
      headers: req.headers,
      url: req.originalUrl || req.url
    });
  } catch (error) {
    console.error('Error saving scraped content:', error);
    res.status(500).json({ 
      error: 'Failed to save scraped content',
      message: error.message 
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const content = await getAllScrapedContent(limit, offset, userId);
    const totalCount = await getContentCount(userId);

    res.json({
      success: true,
      data: content,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + content.length < totalCount
      },
      args: req.query,
      headers: req.headers,
      url: req.originalUrl || req.url
    });
  } catch (error) {
    console.error('Error fetching scraped content:', error);
    res.status(500).json({ 
      error: 'Failed to fetch scraped content',
      message: error.message 
    });
  }
});

export default router;

