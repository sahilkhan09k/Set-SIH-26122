import dotenv from 'dotenv';
dotenv.config();

export interface ExtractedEventDTO {
  discipline: string;
  activityDescription: string;
  quantity?: number;
  unit?: string;
  location?: string;
  actualStart?: string;
  actualEnd?: string;
  sourceText: string;
  extractionConfidence: number;
  engineUsed: 'GROQ_LLM' | 'DETERMINISTIC_NLP';
}

/**
 * Extracts structured construction events from unstructured field report text.
 * Uses Groq API (Llama 3.3 70B Versatile) if GROQ_API_KEY is available; otherwise falls back
 * gracefully to the deterministic construction NLP engine.
 */
export async function extractEventsFromText(rawText: string, reportDate = '2026-09-21'): Promise<ExtractedEventDTO[]> {
  const apiKey = process.env.GROQ_API_KEY?.trim();

  if (apiKey) {
    try {
      const llmResults = await extractWithGroq(rawText, reportDate, apiKey);
      if (llmResults && llmResults.length > 0) {
        return llmResults;
      }
    } catch (err) {
      console.warn('[NLPEngine] Groq API failed or key invalid, falling back to deterministic engine:', err);
    }
  }

  // Deterministic fallback (guaranteed reliability & offline development)
  return extractWithDeterministicEngine(rawText, reportDate);
}

/**
 * Call Groq Cloud API using OpenAI-compatible chat completions endpoint with Llama 3.3 70B Versatile
 */
async function extractWithGroq(rawText: string, reportDate: string, apiKey: string): Promise<ExtractedEventDTO[]> {
  const systemPrompt = `You are SETU AI, an expert construction engineer specializing in industrial infrastructure projects (Refinery, Petrochemical, Power).
Extract all distinct physical execution activities from the daily site report text into structured JSON.
You must return a JSON object with a single key "events" containing an array of objects. Each object must have:
- "discipline": string (one of "Piping", "Civil", "Electrical", "Instrumentation", "Mechanical", "HSE")
- "activityDescription": string (concise normalized description of work done)
- "quantity": number or null
- "unit": string or null (e.g. "inch-dia", "m3", "metres", "spools")
- "location": string or null (e.g. "Rack R24", "Foundation F-204", "Substation S2")
- "actualStart": string or null (ISO time or "HH:MM")
- "actualEnd": string or null (ISO time or "HH:MM")
- "sourceText": string (exact sentence or bullet point from input)
- "extractionConfidence": number (between 0.70 and 0.99)`;

  const userPrompt = `REPORT DATE: ${reportDate}\nRAW TEXT:\n"""\n${rawText}\n"""\nExtract all execution events now.`;

  const candidateModels = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
  let textContent = '';

  for (const model of candidateModels) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        textContent = data?.choices?.[0]?.message?.content;
        if (textContent) break;
      }
    } catch {
      // try next model
    }
  }

  if (!textContent) return [];

  const parsed = JSON.parse(textContent);
  const items: any[] = Array.isArray(parsed) ? parsed : (parsed.events || [parsed]);

  return items.map(item => ({
    discipline: item.discipline || 'Civil',
    activityDescription: item.activityDescription || 'Site Execution Work',
    quantity: typeof item.quantity === 'number' ? item.quantity : undefined,
    unit: item.unit || undefined,
    location: item.location || undefined,
    actualStart: item.actualStart || undefined,
    actualEnd: item.actualEnd || undefined,
    sourceText: item.sourceText || rawText.slice(0, 120),
    extractionConfidence: item.extractionConfidence || 0.95,
    engineUsed: 'GROQ_LLM',
  }));
}

/**
 * Deterministic Construction NLP parser based on engineering synonyms and regex
 */
function extractWithDeterministicEngine(rawText: string, reportDate: string): ExtractedEventDTO[] {
  const events: ExtractedEventDTO[] = [];
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  let currentDiscipline = 'Piping';

  for (const line of lines) {
    const upper = line.toUpperCase();
    if (upper.includes('PIPING') || upper.startsWith('PIPING:')) {
      currentDiscipline = 'Piping';
      continue;
    }
    if (upper.includes('CIVIL') || upper.startsWith('CIVIL:')) {
      currentDiscipline = 'Civil';
      continue;
    }
    if (upper.includes('ELECTRICAL') || upper.startsWith('ELECTRICAL:')) {
      currentDiscipline = 'Electrical';
      continue;
    }
    if (upper.includes('INSTRUMENT') || upper.startsWith('INSTRUMENTATION:')) {
      currentDiscipline = 'Instrumentation';
      continue;
    }

    if (line.length < 10 || upper.startsWith('DATE:') || upper.startsWith('WEATHER:')) {
      continue;
    }

    // Extract quantity and unit
    let quantity: number | undefined;
    let unit: string | undefined;

    const qtyMatch = line.match(/(\d+(?:\.\d+)?)\s*(inch-dia|inch dia|inch|dia|metres|meters|m3|cum|cu\.m|spools?|joints?|mts?)/i);
    if (qtyMatch) {
      quantity = parseFloat(qtyMatch[1]);
      unit = qtyMatch[2].toLowerCase();
      if (unit.includes('inch') && unit.includes('dia')) unit = 'inch-dia';
      else if (unit.includes('m3') || unit.includes('cum')) unit = 'm3';
      else if (unit.includes('meter') || unit.includes('metres')) unit = 'metres';
    }

    // Extract location
    let location: string | undefined;
    const locMatch = line.match(/(Rack\s*[A-Z0-9-]+|Substation\s*[A-Z0-9-]+|Foundation\s*[A-Z0-9-]+|Area\s*[A-Z0-9-]+|Unit\s*\d+)/i);
    if (locMatch) {
      location = locMatch[1];
    }

    // Extract times
    let actualStart: string | undefined;
    let actualEnd: string | undefined;
    const timeStartMatch = line.match(/started\s*(?:around|at)?\s*(\d{1,2}:\d{2})/i);
    if (timeStartMatch) actualStart = timeStartMatch[1];

    const timeEndMatch = line.match(/(?:completed|finished)\s*(?:around|at)?\s*(\d{1,2}:\d{2})/i);
    if (timeEndMatch) actualEnd = timeEndMatch[1];

    // Clean description
    let cleanDesc = line.replace(/^[-*•]\s*/, '');
    if (cleanDesc.length > 100) {
      cleanDesc = cleanDesc.slice(0, 97) + '...';
    }

    events.push({
      discipline: currentDiscipline,
      activityDescription: cleanDesc,
      quantity,
      unit,
      location,
      actualStart,
      actualEnd,
      sourceText: line,
      extractionConfidence: 0.93,
      engineUsed: 'DETERMINISTIC_NLP',
    });
  }

  // If no lines matched specifically, return single event
  if (events.length === 0) {
    events.push({
      discipline: 'Piping',
      activityDescription: rawText.slice(0, 100),
      sourceText: rawText,
      extractionConfidence: 0.85,
      engineUsed: 'DETERMINISTIC_NLP',
    });
  }

  return events;
}
