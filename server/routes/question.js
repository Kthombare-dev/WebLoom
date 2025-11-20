import express from 'express';
import { searchScrapedContent, getAllScrapedContent } from '../database.js';
import { generateAnswer, isAIAvailable } from '../services/aiService.js';

const router = express.Router();

// POST /api/question - Ask a question with AI-powered answers
router.post('/', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Question is required' 
      });
    }

    // Search for relevant content
    const userId = req.user?.id || null;

    let searchResults = await searchScrapedContent(question, userId, 10);
    
    // If no search results, get recent content to use with AI
    if (searchResults.length === 0) {
      const allContent = await getAllScrapedContent(5, 0, userId);
      if (allContent.length > 0) {
        // Use recent content even if search didn't match
        searchResults = allContent;
      }
    }

    // Format response with reference links
    const references = searchResults.map(item => ({
      id: item.id,
      url: item.url,
      title: item.title,
      snippet: item.content.substring(0, 200) + (item.content.length > 200 ? '...' : ''),
      timestamp: item.timestamp
    }));

    let answer;
    let aiUsed = false;

    // Use AI if available and we have content
    if (isAIAvailable() && searchResults.length > 0) {
      try {
        answer = await generateAnswer(question, searchResults);
        aiUsed = true;
      } catch (aiError) {
        console.error('AI generation error:', aiError);
        // Fallback to basic answer if AI fails
        answer = `Found ${searchResults.length} content item(s). See the reference links below for more details.`;
      }
    } else if (searchResults.length > 0) {
      // Fallback: Basic answer if AI not available
      answer = `Found ${searchResults.length} content item(s). See the reference links below for more details.

Note: AI features are not enabled. Set GEMINI_API_KEY in your .env file to get AI-powered answers.`;
    } else {
      answer = 'No content found in the database. Please scrape some content first using the Chrome extension.';
    }

    res.json({
      success: true,
      question: question.trim(),
      answer: answer,
      references: references,
      aiPowered: aiUsed,
      ...(aiUsed && { note: 'Answer generated using Gemini AI' }),
      // Request metadata for testing/debugging
      args: req.query,
      headers: req.headers,
      url: req.originalUrl || req.url
    });
  } catch (error) {
    console.error('Error processing question:', error);
    res.status(500).json({ 
      error: 'Failed to process question',
      message: error.message 
    });
  }
});

export default router;
