import { GoogleGenAI, Type } from "@google/genai";
import { ArticleStyle, ArticleTone, ArticleLength, ArticleAudience } from '../types';

// Helper to get client
const getClient = () => {
  const key = process.env.API_KEY;
  if (!key) throw new Error("API Key is missing. Environment variable API_KEY must be set.");
  return new GoogleGenAI({ apiKey: key });
};

export const generateArticle = async (
  modelName: string,
  transcript: string,
  config: { style: ArticleStyle; tone: ArticleTone; length: ArticleLength; audience: ArticleAudience }
) => {
  const ai = getClient();
  
  const prompt = `
    You are an expert content editor. Transform the following transcript into a structured article.
    
    Transcript:
    "${transcript.substring(0, 30000)}" 
    
    Configuration:
    - Style: ${config.style}
    - Tone: ${config.tone}
    - Length: ${config.length}
    - Audience: ${config.audience}
    
    Format Guidelines:
    1. Title: A catchy H1-style title (Plain text).
    2. Content: 
       - Start with a 150-200 word overview.
       - Use H2 (##) for sub-topics.
       - Do NOT include the "Final Takeaway" here.
    3. Takeaway:
       - This MUST be separate.
       - First, write a brief summary paragraph of the article's main points and final thoughts (approx 50-75 words).
       - Then, list 3-5 key bullet points.
    4. Hashtags: Add 3 relevant hashtags.
    
    Return the result as a JSON object.
  `;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          content: { type: Type.STRING },
          takeaway: { type: Type.STRING },
          hashtags: { type: Type.STRING }
        }
      }
    }
  });

  const parsed = JSON.parse(response.text || "{}");
  // Fallback
  if (!parsed.hashtags) parsed.hashtags = "#SessionInsights";
  if (!parsed.takeaway) parsed.takeaway = "Summary unavailable.";
  return parsed;
};

export const generateImagePrompt = async (articleTitle: string, overview: string) => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Create a 3-4 word visual description for a blog header image based on this title: "${articleTitle}" and overview: "${overview}". 
    The style should be modern flat vector art, purple and orange color palette. 
    Output ONLY the description.`
  });
  return response.text || "Modern corporate meeting abstract vector";
};

export const generateBlogImage = async (prompt: string) => {
  const ai = getClient();
  // Using gemini-2.5-flash-image
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
          parts: [{ text: prompt }]
      },
      config: {
        // imageConfig not fully typed in all SDK versions yet, passing implicitly via standard call
      }
    });

    // Check for inline data (base64)
    const candidates = response.candidates;
    if (candidates && candidates[0]?.content?.parts) {
       for (const part of candidates[0].content.parts) {
           if (part.inlineData) {
               return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
           }
       }
    }
    return null;
  } catch (e) {
    console.error("Image generation failed", e);
    // Return a placeholder if generation fails (graceful degradation)
    return `https://picsum.photos/seed/${encodeURIComponent(prompt)}/800/400`;
  }
};

export const chatWithSession = async (modelName: string, transcript: string, history: {role: string, parts: {text: string}[]}[], message: string) => {
  const ai = getClient();
  const chat = ai.chats.create({
    model: modelName,
    history: [
      {
        role: 'user',
        parts: [{ text: `You are a helpful assistant answering questions about this transcript: ${transcript.substring(0, 15000)}` }]
      },
      {
        role: 'model',
        parts: [{ text: "Understood. I am ready to answer questions about the transcript." }]
      },
      ...history
    ]
  });

  const result = await chat.sendMessage({ message });
  return result.text;
};