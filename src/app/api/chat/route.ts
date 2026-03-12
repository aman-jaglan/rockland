import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages: rawMessages, context } = body;

    // Validate and transform messages
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

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

    // Build comprehensive system prompt
    const systemPrompt = `You are a knowledgeable and helpful grant assistant for Federally Qualified Health Centers (FQHCs). You help CFOs and grant managers understand federal funding opportunities.

${context ? `## ORGANIZATION & GRANT CONTEXT:\n${context}\n\n` : ''}

## YOUR ROLE:
You are an expert grant advisor. Your job is to:
1. Answer questions clearly and directly
2. Provide actionable guidance
3. Be honest about eligibility concerns
4. Help users understand requirements

## RESPONSE GUIDELINES:
- Write in a conversational, professional tone
- Use clear paragraphs, not bullet points for main responses
- When listing items, use simple formatting
- Be specific and cite details from the grant when relevant
- If you don't know something, say so honestly
- Keep responses focused and helpful - not too short, not too long

## IMPORTANT:
- Be honest about whether the organization appears eligible
- Point out any concerns or gaps
- Suggest concrete next steps when appropriate
- The CFO has limited time, so be efficient but thorough`;

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
