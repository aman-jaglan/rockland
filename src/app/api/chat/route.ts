import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages: rawMessages, context } = body;

    // Validate and transform messages
    const messages: ChatMessage[] = [];

    if (Array.isArray(rawMessages)) {
      for (const msg of rawMessages) {
        if (msg && typeof msg.role === 'string' && typeof msg.content === 'string') {
          messages.push({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          });
        }
      }
    }

    if (messages.length === 0) {
      return new Response('No valid messages provided', { status: 400 });
    }

    // Build system prompt with FQHC context
    const systemPrompt = `You are a helpful grant assistant for Federally Qualified Health Centers (FQHCs).
You help CFOs understand grant opportunities and determine eligibility.

${context ? `ORGANIZATION CONTEXT:\n${context}\n\n` : ''}

Keep responses concise and actionable. Focus on:
- Explaining why a grant matches or doesn't match
- Clarifying eligibility requirements
- Answering questions about the application process
- Highlighting deadlines and key requirements

Be direct and professional. The CFO has limited time.`;

    const result = streamText({
      model: google('gemini-3-flash-preview'),
      system: systemPrompt,
      messages,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
