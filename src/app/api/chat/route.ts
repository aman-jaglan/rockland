import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, context } = await req.json();

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
}
