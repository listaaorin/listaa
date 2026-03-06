import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '',
});

export interface ThingAnalysis {
  title: string;
  summary: string;
  destination: 'arc' | 'vault';
  category?: string;
  deadline?: string;        // ISO date string if found
  location?: string;
  tags: string[];
  suggested_bubble?: string;
  sub_tasks?: string[];
}

// ─── Classify and extract from raw content ────────────────────────────────────

export async function analyzeContent(content: string, contentType: 'text' | 'image_url' | 'voice_transcript'): Promise<ThingAnalysis> {
  const prompt = `You are Listaa's Silent Intelligence. Analyze this ${contentType} and extract structured information.

Content: "${content}"

Respond with valid JSON only (no markdown, no explanation):
{
  "title": "Short clear title (max 60 chars)",
  "summary": "One-sentence summary of what this is",
  "destination": "arc" | "vault",
  "category": "For vault: contacts | documents | discoveries | memories | other. For arc: leave blank.",
  "deadline": "ISO 8601 date string if a deadline/date is mentioned, otherwise null",
  "location": "Location if mentioned, otherwise null",
  "tags": ["array", "of", "relevant", "tags"],
  "suggested_bubble": "Suggested bubble name (e.g. 'Home', 'Health', child's name) or null",
  "sub_tasks": ["For arc items, array of actionable sub-steps, max 3, otherwise empty array"]
}

Rules:
- "arc" = requires action, has a deadline, needs to be done
- "vault" = is knowledge/reference, contact info, documents, discoveries, things to remember
- Be concise and practical. This is a busy parent's mental load manager.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';

  try {
    return JSON.parse(text) as ThingAnalysis;
  } catch {
    // Fallback if JSON parse fails
    return {
      title: content.substring(0, 60),
      summary: content.substring(0, 120),
      destination: 'vault',
      tags: [],
      sub_tasks: [],
    };
  }
}

// ─── Generate calendar event details ─────────────────────────────────────────

export async function generateCalendarEvent(arcTitle: string, description?: string, deadline?: string) {
  const prompt = `Generate Google Calendar event details for this task:
Title: "${arcTitle}"
Description: "${description ?? ''}"
Deadline: "${deadline ?? 'not specified'}"

Respond with JSON only:
{
  "event_title": "Short calendar event title",
  "event_description": "Brief description with action items",
  "start_datetime": "ISO 8601 datetime (if deadline known, set to 9am that day, else null)",
  "end_datetime": "ISO 8601 datetime (1 hour after start, or null)",
  "reminder_minutes": 60
}`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ─── Generate smart ping message ─────────────────────────────────────────────

export async function generatePingMessage(arcTitle: string, status: string, daysSinceCreated: number): Promise<string> {
  const prompt = `Write a calm, supportive push notification for a parent's uncompleted task.
Task: "${arcTitle}"
Status: ${status}
Days open: ${daysSinceCreated}

Write ONE short notification message (max 80 chars). No quotes. Be gentle, not nagging. Examples:
- "Registration opens today. Time to handle this one?"
- "This loop has been open 3 days — need help?"`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 60,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
  return text || `"${arcTitle}" is still open. Handle it today?`;
}

// ─── OCR + extract text from image via Claude Vision ─────────────────────────

export async function analyzeImageContent(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<ThingAnalysis> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: imageBase64,
          },
        },
        {
          type: 'text',
          text: `You are Listaa's Silent Intelligence. Extract all text and key information from this image.

Respond with valid JSON only (no markdown, no explanation):
{
  "title": "Short clear title describing what this image is (max 60 chars)",
  "summary": "All important text extracted from the image + a one-line description",
  "destination": "arc" | "vault",
  "category": "contacts | documents | discoveries | memories | other",
  "deadline": "ISO 8601 date string if a deadline/date is visible, otherwise null",
  "location": "Location if visible, otherwise null",
  "tags": ["relevant", "tags", "from", "content"],
  "suggested_bubble": "Suggested bubble name or null",
  "sub_tasks": []
}

Rules:
- "arc" = receipts needing action, invitations, forms to fill, things requiring a response
- "vault" = recipes, business cards, documents, screenshots, memories, discoveries
- Extract ALL visible text accurately`,
        },
      ],
    }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  try {
    return JSON.parse(text) as ThingAnalysis;
  } catch {
    return {
      title: 'Image capture',
      summary: 'Image content captured. Unable to extract text.',
      destination: 'vault',
      tags: ['image'],
      sub_tasks: [],
    };
  }
}

// ─── Search vault items ───────────────────────────────────────────────────────

export async function searchVault(query: string, items: Array<{ title: string; content: string; tags?: string[] }>): Promise<number[]> {
  const prompt = `Given this search query: "${query}"
And these vault items (by index):
${items.map((item, i) => `[${i}] "${item.title}": ${item.content}`).join('\n')}

Return a JSON array of indices (numbers only) for the most relevant items, in order of relevance. Max 10 results.
Example: [2, 0, 5]`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 64,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '[]';
  try {
    return JSON.parse(text) as number[];
  } catch {
    return [];
  }
}
