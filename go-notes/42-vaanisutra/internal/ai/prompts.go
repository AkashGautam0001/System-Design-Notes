package ai

// ============================================================
// Prompt Templates — Gemini API Prompts for Each AI Stage
// ============================================================
// WHY templates? When Jio switches from simulated mode to real
// Gemini API calls, these prompts guide the model to produce
// structured output. Good prompts are the difference between
// useful AI results and garbage.
//
// Each prompt is designed for call center transcript analysis
// and instructs the model to return structured JSON output.
// ============================================================

// ──────────────────────────────────────────────────────────────
// SentimentPrompt instructs the AI to analyze emotional tone.
// WHY this structure? Gemini performs best with clear role
// definition, explicit output format, and concrete examples.
// ──────────────────────────────────────────────────────────────
const SentimentPrompt = `You are a sentiment analysis expert specializing in telecom customer service.
Analyze the following call center transcript and determine the customer's sentiment.

Return a JSON object with:
- "score": a float from -1.0 (very negative) to 1.0 (very positive)
- "label": one of "Positive", "Negative", or "Neutral"
- "confidence": a float from 0.0 to 1.0 indicating your confidence

Transcript:
%s

Return ONLY the JSON object, no other text.`

// ──────────────────────────────────────────────────────────────
// EntityExtractionPrompt instructs the AI to find named entities.
// WHY specify entity types? Jio only cares about specific types
// — plans, products, locations, and issues. Without specifying,
// the model might return generic entities like dates.
// ──────────────────────────────────────────────────────────────
const EntityExtractionPrompt = `You are a named entity recognition expert for Indian telecom transcripts.
Extract entities from the following call center transcript.

Entity types to look for:
- Plan: Jio plan names (e.g., "Jio 999 plan", "Jio Fiber Gold")
- Product: Jio products (JioFiber, JioTV, JioCinema, JioPhone, etc.)
- Location: Indian cities and regions mentioned
- Issue: Specific problems (slow internet, call drops, billing error, etc.)
- Person: Customer or agent names mentioned
- Amount: Monetary values mentioned

Return a JSON array of objects with:
- "text": the entity text as it appears in the transcript
- "type": the entity type from the list above
- "start_pos": character position where the entity starts
- "end_pos": character position where the entity ends

Transcript:
%s

Return ONLY the JSON array, no other text.`

// ──────────────────────────────────────────────────────────────
// SummarizationPrompt instructs the AI to create a brief summary.
// ──────────────────────────────────────────────────────────────
const SummarizationPrompt = `You are a summarization expert for telecom call center transcripts.
Create a brief 2-3 sentence summary of the following transcript.

Focus on:
1. The main reason for the call
2. Key issues or requests mentioned
3. The resolution or outcome (if any)

Transcript:
%s

Return ONLY the summary text, no other formatting.`

// ──────────────────────────────────────────────────────────────
// KeywordPrompt instructs the AI to extract important keywords.
// ──────────────────────────────────────────────────────────────
const KeywordPrompt = `You are a keyword extraction expert for telecom customer service.
Extract the 5-10 most important keywords from the following transcript.

Focus on terms relevant to:
- Telecom services and products
- Customer issues and complaints
- Plan names and features
- Technical terms

Transcript:
%s

Return ONLY a JSON array of keyword strings, no other text.`
