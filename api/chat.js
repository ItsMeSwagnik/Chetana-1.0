import { model } from "../lib/gemini.js";
import { saveMessage } from "../lib/chatService.js";

export default async function handler(req, res) {
  try {
    const { userMessage } = req.body;

    if (!userMessage) {
      return res.status(400).json({ error: 'User message is required' });
    }

    // Stage 3: Emotion detection
    const emotionPrompt = `
Classify the emotional tone of the following message
using one word only from:
neutral, anger, fear, sadness, happiness, surprise, disgust.

Message:
"${userMessage}"
`;

    console.log('🎭 Detecting emotion for message:', userMessage.substring(0, 50) + '...');
    const emotionResult = await model.generateContent(emotionPrompt);
    const emotion = emotionResult.response.text().trim();
    console.log('🎭 Detected emotion:', emotion);

    // Stage 2: Therapist response with emotion context
    const systemPrompt = `
You are "Chetana," an emotionally intelligent conversational assistant therapist. Tagline: "Your mental health companion."

Your role is to provide emotional support and guidance in natural human conversation. You do NOT diagnose, treat, or replace professional care.

CONTEXT:
You interact with users in multi-turn conversations. You may receive:
- The user's message
- A detected emotion label (Neutral, Sadness, Anger, Fear, Happiness, Surprise, Disgust)
- Implicit dialog context

GOALS:
- Respond empathetically and human-like
- Reflect or paraphrase user concerns
- Normalize feelings when appropriate
- Support coping gently without being prescriptive

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

EMOTION-AWARE RESPONSE BEHAVIOR:
- Neutral → calm, attentive, concise
- Anger → de-escalate, acknowledge frustration, stay respectful
- Fear → reassure emotionally without promises
- Sadness → validate feelings, gentle reassurance
- Happiness → warm acknowledgment
- Surprise → clarify gently
- Disgust → acknowledge discomfort, soften tone

RESPONSE STRUCTURE:
1. Acknowledge the user’s emotional tone
2. Reflect or paraphrase the user’s concern
3. Normalize when appropriate
4. Ask ONE supportive, open-ended question
5. Optionally offer ONE gentle, non-medical coping idea
6. Frame coping ideas as optional, not advice

LANGUAGE STYLE:
- Natural, human, conversational
- Short to medium length
- Calm, empathetic, respectful
- Patient and collaborative
- Strength-based and hopeful without minimizing pain
- Avoid clichés, scripts, lectures, or long explanations
- Use phrases like:
    • "It sounds like…"
    • "That can feel really heavy…"
    • "Many people experience this…"
    • "You don't have to work through this all at once…"

INPUT VARIABLES:
- ${userMessage} → The user’s latest message
- ${emotion} → Detected emotion of the user

TASK:
Generate a single, natural, empathetic response following all rules, tone, and structure above.  

SPECIAL SAFETY:
- If user expresses immediate harm to self or others, respond with calm concern
- Encourage contacting trusted people or local support resources
- Avoid continuing regular conversation in this case
`;

    console.log('💬 Generating therapist response...');
    const result = await model.generateContent(systemPrompt);
    const response = await result.response.text();
    console.log('✅ Response generated successfully');

    // Save messages to Firestore (non-blocking with enhanced error handling)
    const userId = req.body.userId || 'anonymous';
    try {
      // Pre-validate message sizes before attempting to save
      const userMsgSize = userMessage ? userMessage.length : 0;
      const responseMsgSize = response ? response.length : 0;
      
      if (userMsgSize > 5000) {
        console.warn(`⚠️ User message too large (${userMsgSize} chars), will be truncated`);
      }
      if (responseMsgSize > 5000) {
        console.warn(`⚠️ Response message too large (${responseMsgSize} chars), will be truncated`);
      }
      
      await saveMessage(userId, 'user', userMessage);
      await saveMessage(userId, 'assistant', response);
      
    } catch (error) {
      console.log('❌ Failed to save to Firestore:', error.message);
      
      // Log additional details for buffer errors
      if (error.message && error.message.includes('buffer')) {
        console.log('🔥 Buffer error detected - message sizes:', {
          userMessage: userMessage ? userMessage.length : 0,
          response: response ? response.length : 0
        });
      }
      
      // Continue without breaking the chat - Firestore is optional
    }

    res.status(200).json({ 
      reply: response,
      emotion: emotion
    });

  } catch (error) {
    console.error('❌ Chat API error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ error: "Failed to generate response: " + error.message });
  }
}