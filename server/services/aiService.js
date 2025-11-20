import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;
let model = null;

export function initAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️  GEMINI_API_KEY not found in environment variables');
    console.warn('   AI features will be disabled. Set GEMINI_API_KEY in .env file');
    return false;
  }

  try {
    genAI = new GoogleGenerativeAI(apiKey);
    try {
      model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      console.log('✅ Gemini AI initialized successfully (Gemini 2.0 Flash)');
    } catch (e) {
      model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      console.log('✅ Gemini AI initialized (Gemini 1.5 Flash - fallback)');
    }
    return true;
  } catch (error) {
    console.error('Error initializing Gemini AI:', error);
    return false;
  }
}

export async function generateAnswer(question, relevantContent) {
  if (!model) {
    throw new Error('AI model not initialized. Please set GEMINI_API_KEY in .env file');
  }

  try {
    const contextText = relevantContent
      .map((item, index) => {
        const contentPreview = item.content.length > 1000 
          ? item.content.substring(0, 1000) + '...' 
          : item.content;
        return `[Source ${index + 1}]
Title: ${item.title}
URL: ${item.url}
Content: ${contentPreview}`;
      })
      .join('\n\n');

    const prompt = `You are a helpful assistant that answers questions based on the provided web content that was scraped from various websites.

User Question: ${question}

Relevant Content from Scraped Sources:
${contextText || 'No relevant content found.'}

Instructions:
1. Answer the question based ONLY on the provided scraped content
2. If the content doesn't contain enough information to answer the question, say so clearly
3. Be concise and accurate
4. Cite which source(s) you used for your answer
5. If no relevant content is provided, suggest that the user scrape more content or rephrase their question

Answer:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const answer = response.text();

    return answer;
  } catch (error) {
    console.error('Error generating AI answer:', error);
    throw new Error(`AI generation failed: ${error.message}`);
  }
}

export function isAIAvailable() {
  return model !== null;
}

