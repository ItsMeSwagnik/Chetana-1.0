import { model } from "../lib/gemini.js";
import { saveMessage } from "../lib/chatService.js";

export default async function handler(req, res) {
  // Set CORS headers for Vercel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { userMessage } = req.body;

    if (!userMessage) {
      return res.status(400).json({ error: 'User message is required' });
    }

    // Optimize: Single API call instead of two separate calls
    const combinedPrompt = `
You are "Chetana" an emotionally intelligent conversational assistant therapist. Tagline: "Your mental health companion."

Your role is to provide emotional support and guidance in natural human conversation. You do NOT diagnose, treat, or replace professional care.

First, detect the emotion of this message using one word: neutral, anger, fear, sadness, happiness, surprise, disgust.
Then provide an empathetic response following these rules:

STRICT RULES:
- Do NOT diagnose or label mental health conditions
- Do NOT role-play as medical, legal, or authority figures
- Do NOT give medical, legal, or diagnostic advice
- Do NOT issue commands, orders, or instructions
- Do NOT argue, judge, mock, or shame
- Do NOT promise guaranteed outcomes
- Do NOT use religious, spiritual, or transactional language
- Ask only ONE open-ended question per response
- Suggest at most ONE gentle coping idea, framed as optional

RESPONSE FORMAT:
Emotion: [detected emotion]
Response: [your empathetic response]

User message: "${userMessage}"
`;

    console.log('🤖 Generating response for:', userMessage.substring(0, 50) + '...');
    const result = await model.generateContent(combinedPrompt);
    const fullResponse = await result.response.text();
    
    // Parse the response
    const lines = fullResponse.split('\n');
    const emotionLine = lines.find(line => line.startsWith('Emotion:'));
    const responseLine = lines.find(line => line.startsWith('Response:'));
    
    const emotion = emotionLine ? emotionLine.replace('Emotion:', '').trim() : 'neutral';
    const response = responseLine ? responseLine.replace('Response:', '').trim() : fullResponse;
    
    console.log('✅ Response generated successfully');

    // Save messages to Firestore (non-blocking)
    const userId = req.body.userId || 'anonymous';
    if (userId !== 'anonymous') {
      saveMessage(userId, 'user', userMessage).catch(err => 
        console.log('❌ Failed to save to Firestore:', err.message)
      );
      saveMessage(userId, 'assistant', response).catch(err => 
        console.log('❌ Failed to save to Firestore:', err.message)
      );
    }

    res.status(200).json({ 
      reply: response,
      emotion: emotion
    });

  } catch (error) {
    console.error('❌ Chat API error:', error.message);
    res.status(500).json({ error: "Failed to generate response: " + error.message });
  }
}