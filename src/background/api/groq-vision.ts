import { ConversationTurn } from '../../shared/types';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT =
  'You are ScreenSense, a helpful AI assistant. The user is looking at their screen and asking a question about what they see. Analyze the screenshot and answer their question concisely in 2-4 sentences or short bullet points. Be direct, specific, and helpful -- like a knowledgeable friend explaining something quickly. Do not add preamble like "Based on the screenshot" or "I can see that". When the user asks follow-up questions, use the conversation context to give relevant answers.';

/**
 * Stream a multimodal response from Groq vision model given a screenshot, text query,
 * and optional conversation history for follow-up context.
 */
export async function streamGeminiResponse(
  screenshotDataUrl: string,
  query: string,
  apiKey: string,
  onChunk: (text: string) => void,
  history: ConversationTurn[] = []
): Promise<string> {
  // Build messages array: system + history (text-only) + current turn (with image)
  const messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  }> = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  // Add conversation history as text-only messages (no old screenshots to save context)
  for (const turn of history) {
    messages.push({ role: turn.role, content: turn.content });
  }

  // Current turn: screenshot + query
  messages.push({
    role: 'user',
    content: [
      {
        type: 'image_url',
        image_url: { url: screenshotDataUrl },
      },
      {
        type: 'text',
        text: query,
      },
    ],
  });

  const requestBody = {
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages,
    temperature: 0.7,
    max_tokens: 1024,
    stream: true,
  };

  const response = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Check your API key in Settings');
    }
    throw new Error('Something went wrong — give it another try');
  }

  if (!response.body) {
    throw new Error('No response body from Groq');
  }

  let fullText = '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith(':')) continue;

      if (trimmed === 'data: [DONE]') continue;

      if (trimmed.startsWith('data: ')) {
        const jsonStr = trimmed.slice(6);
        try {
          const parsed = JSON.parse(jsonStr);
          const text = parsed?.choices?.[0]?.delta?.content;
          if (text) {
            fullText += text;
            onChunk(text);
          }
        } catch {
          console.warn('[ScreenSense] Failed to parse Groq SSE chunk:', jsonStr);
        }
      }
    }
  }

  if (buffer.trim().startsWith('data: ') && buffer.trim() !== 'data: [DONE]') {
    const jsonStr = buffer.trim().slice(6);
    try {
      const parsed = JSON.parse(jsonStr);
      const text = parsed?.choices?.[0]?.delta?.content;
      if (text) {
        fullText += text;
        onChunk(text);
      }
    } catch {
      // Skip malformed final chunk
    }
  }

  return fullText;
}
