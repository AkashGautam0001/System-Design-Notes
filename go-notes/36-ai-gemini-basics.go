// ============================================================
//  FILE 36 : AI — Gemini API Basics
// ============================================================
//  Topic  : SDK client setup, text generation, streaming,
//           multi-turn chat, system instructions, JSON mode,
//           safety settings, token counting
//
//  WHY THIS MATTERS:
//  Large Language Models (LLMs) like Google Gemini are becoming
//  a core building block in modern software — from customer
//  support chatbots to code assistants. Understanding how to
//  interact with an LLM API — prompt design, streaming, chat
//  history, structured output — is now as fundamental as knowing
//  how to make HTTP requests. Go's concurrency model makes it
//  especially well-suited for streaming and parallel AI calls.
// ============================================================

// ============================================================
// STORY: JioSaathi — Jio's AI Customer Support
// Jio, India's largest telecom with 450 million+ subscribers,
// handles millions of customer queries daily — plan upgrades,
// billing disputes, network troubleshooting. The support team
// builds "JioSaathi" (Jio Companion), an AI-powered assistant
// backed by Google Gemini. JioSaathi must:
//   - Understand natural language queries in English and Hinglish
//   - Stream responses in real-time (no one waits 10 seconds)
//   - Remember conversation context (multi-turn chat)
//   - Follow strict persona guidelines (polite, helpful, Jio-aware)
//   - Return structured JSON for integration with CRM systems
//   - Respect content safety filters
//   - Track token usage to manage API costs at Jio's scale
// ============================================================

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"
)

// ============================================================
// SIMULATED MODE SETUP
// ============================================================
// WHY: Not everyone has a Gemini API key. Simulated mode lets
// students learn the PATTERNS — client creation, prompt design,
// streaming, chat — without spending a single rupee. When ready,
// set GEMINI_API_KEY and swap in the real google.golang.org/genai
// SDK calls.

var geminiAPIKey = os.Getenv("GEMINI_API_KEY")
var simulatedMode = geminiAPIKey == ""

func init() {
	if simulatedMode {
		fmt.Println("==========================================================")
		fmt.Println("  SIMULATED MODE — GEMINI_API_KEY not set")
		fmt.Println("  All responses are pre-written demo data.")
		fmt.Println("  Set GEMINI_API_KEY=your-key to use real Gemini API.")
		fmt.Println("==========================================================")
		fmt.Println()
	}
}

// ============================================================
// SECTION 1 — SDK Types & Client Creation
// ============================================================
// WHY: The real Gemini Go SDK (google.golang.org/genai) follows
// this exact pattern: create a Client with your API key, then
// get a GenerativeModel handle. We mirror the SDK's types here
// so the code reads like production Gemini code. When you switch
// to the real SDK, the structure is identical — only the import
// path changes.

// GeminiClient mirrors genai.Client — the entry point to the API.
type GeminiClient struct {
	apiKey  string
	project string // optional GCP project
}

// GenerativeModel mirrors genai.GenerativeModel — a handle to
// a specific model (gemini-1.5-flash, gemini-1.5-pro, etc.).
type GenerativeModel struct {
	Name              string
	Client            *GeminiClient
	Temperature       float32 // 0.0 = deterministic, 2.0 = creative
	TopP              float32 // nucleus sampling threshold
	TopK              int     // top-k sampling
	MaxOutputTokens   int
	SystemInstruction string // persona / behavior instructions
	ResponseMIMEType  string // "application/json" for JSON mode
}

// ChatSession mirrors genai.ChatSession — maintains conversation
// history for multi-turn interactions.
type ChatSession struct {
	Model   *GenerativeModel
	History []ChatMessage
}

// ChatMessage represents a single message in a conversation.
type ChatMessage struct {
	Role    string // "user" or "model"
	Content string
}

// GenerateResponse mirrors the response from genai.GenerativeModel.GenerateContent.
type GenerateResponse struct {
	Text         string
	TokenCount   int
	FinishReason string // "STOP", "MAX_TOKENS", "SAFETY"
}

// SafetySetting mirrors genai.SafetySetting for content filtering.
type SafetySetting struct {
	Category  string // e.g., "HARM_CATEGORY_HARASSMENT"
	Threshold string // e.g., "BLOCK_MEDIUM_AND_ABOVE"
}

// NewGeminiClient creates a new client (mirrors genai.NewClient).
// In production: client, err := genai.NewClient(ctx, option.WithAPIKey(key))
func NewGeminiClient(ctx context.Context, apiKey string) (*GeminiClient, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("API key is required")
	}
	fmt.Printf("  [Client] Created Gemini client (key: %s...%s)\n",
		apiKey[:4], apiKey[len(apiKey)-4:])
	return &GeminiClient{apiKey: apiKey}, nil
}

// GetModel returns a GenerativeModel handle.
// In production: model := client.GenerativeModel("gemini-1.5-flash")
func (c *GeminiClient) GetModel(name string) *GenerativeModel {
	fmt.Printf("  [Client] Selected model: %s\n", name)
	return &GenerativeModel{
		Name:            name,
		Client:          c,
		Temperature:     1.0, // default
		TopP:            0.95,
		TopK:            40,
		MaxOutputTokens: 2048,
	}
}

// StartChat creates a new chat session with history.
func (m *GenerativeModel) StartChat() *ChatSession {
	return &ChatSession{
		Model:   m,
		History: make([]ChatMessage, 0),
	}
}

// ============================================================
// SECTION 2 — Basic Text Generation
// ============================================================
// WHY: The simplest LLM interaction is prompt-in, text-out.
// Understanding temperature and top-p lets you control whether
// JioSaathi gives creative answers (plan recommendations) or
// deterministic answers (billing amounts).

// ──────────────────────────────────────────────────────────────
// EXAMPLE BLOCK 1 — Simple Text Generation
// ──────────────────────────────────────────────────────────────

func demoTextGeneration() {
	fmt.Println("============================================================")
	fmt.Println("DEMO 1: Basic Text Generation")
	fmt.Println("============================================================")

	ctx := context.Background()

	// Step 1: Create client
	var client *GeminiClient
	if simulatedMode {
		client = &GeminiClient{apiKey: "sim-key-demo"}
	} else {
		var err error
		client, err = NewGeminiClient(ctx, geminiAPIKey)
		if err != nil {
			fmt.Printf("  ERROR: %v\n", err)
			return
		}
	}

	// Step 2: Select model and configure
	model := client.GetModel("gemini-1.5-flash")
	model.Temperature = 0.3 // Low temperature for factual support answers
	model.TopP = 0.8
	model.MaxOutputTokens = 256

	fmt.Printf("  Model: %s | Temp: %.1f | TopP: %.1f | MaxTokens: %d\n",
		model.Name, model.Temperature, model.TopP, model.MaxOutputTokens)

	// Step 3: Send prompt
	prompt := "What are the current Jio prepaid plans under 500 rupees?"
	fmt.Printf("\n  PROMPT: %s\n", prompt)

	// Step 4: Get response
	if simulatedMode {
		resp := GenerateResponse{
			Text: `Here are popular Jio prepaid plans under Rs 500:

1. Rs 149 — 2GB/day, 24 days validity, unlimited calls
2. Rs 239 — 1.5GB/day, 28 days validity, unlimited calls
3. Rs 299 — 2GB/day, 28 days validity, unlimited calls + JioCinema
4. Rs 349 — 3GB/day, 28 days validity, unlimited calls
5. Rs 449 — 2GB/day, 56 days validity, unlimited calls

All plans include 100 SMS/day and JioTV access.
Note: Plans may vary by circle. Visit jio.com for latest details.`,
			TokenCount:   87,
			FinishReason: "STOP",
		}
		fmt.Printf("\n  RESPONSE (simulated):\n")
		for _, line := range strings.Split(resp.Text, "\n") {
			fmt.Printf("    %s\n", line)
		}
		fmt.Printf("\n  Tokens used: %d | Finish reason: %s\n", resp.TokenCount, resp.FinishReason)
	} else {
		// Real SDK call would be:
		//   resp, err := model.GenerateContent(ctx, genai.Text(prompt))
		//   text := resp.Candidates[0].Content.Parts[0]
		fmt.Println("  [Would call Gemini API here with real SDK]")
	}

	// WHY temperature matters:
	fmt.Println("\n  --- Temperature Guide ---")
	fmt.Println("  0.0  = Deterministic (billing queries, exact amounts)")
	fmt.Println("  0.3  = Mostly factual (plan recommendations)")
	fmt.Println("  0.7  = Balanced (general support)")
	fmt.Println("  1.0+ = Creative (marketing copy, casual chat)")
	fmt.Println()
}

// ============================================================
// SECTION 3 — Streaming Responses
// ============================================================
// WHY: Users hate staring at a blank screen. Streaming sends
// tokens as they're generated — the user sees text appear word
// by word. At Jio's scale (millions of concurrent users),
// streaming also reduces perceived latency and allows the
// frontend to start rendering immediately.

// ──────────────────────────────────────────────────────────────
// EXAMPLE BLOCK 2 — Streaming Text Generation
// ──────────────────────────────────────────────────────────────

func demoStreaming() {
	fmt.Println("============================================================")
	fmt.Println("DEMO 2: Streaming Responses")
	fmt.Println("============================================================")

	prompt := "Explain how to port my number to Jio in simple steps."
	fmt.Printf("  PROMPT: %s\n\n", prompt)
	fmt.Print("  STREAMING RESPONSE: ")

	if simulatedMode {
		// Simulate chunk-by-chunk delivery like real streaming
		chunks := []string{
			"To port your number to Jio, ",
			"follow these simple steps:\n\n  ",
			"1. **Generate Porting Code**: ",
			"Send SMS 'PORT <your-number>' to 1900. ",
			"You'll receive a UPC (Unique Porting Code).\n\n  ",
			"2. **Visit Jio Store**: ",
			"Go to the nearest Jio Store or Reliance Digital ",
			"with your Aadhaar and UPC code.\n\n  ",
			"3. **Choose a Plan**: ",
			"Select your preferred Jio prepaid or postpaid plan.\n\n  ",
			"4. **SIM Activation**: ",
			"Your new Jio SIM will be activated ",
			"within 3-5 working days. ",
			"Your old SIM will be deactivated automatically.\n\n  ",
			"That's it! Welcome to Jio.",
		}

		for i, chunk := range chunks {
			fmt.Print(chunk)
			// Simulate network delay between chunks (50-120ms)
			delay := 50 + (i%4)*25
			time.Sleep(time.Duration(delay) * time.Millisecond)
		}
		fmt.Println()
	} else {
		// Real SDK streaming:
		//   iter := model.GenerateContentStream(ctx, genai.Text(prompt))
		//   for {
		//       resp, err := iter.Next()
		//       if err == iterator.Done { break }
		//       fmt.Print(resp.Candidates[0].Content.Parts[0])
		//   }
		fmt.Println("[Would stream from Gemini API here]")
	}

	fmt.Println("\n  --- Streaming Notes ---")
	fmt.Println("  - Use GenerateContentStream() instead of GenerateContent()")
	fmt.Println("  - Each chunk may contain partial words — buffer if needed")
	fmt.Println("  - Perfect for SSE (Server-Sent Events) in web apps")
	fmt.Println("  - Reduces time-to-first-token from seconds to milliseconds")
	fmt.Println()
}

// ============================================================
// SECTION 4 — Multi-turn Chat
// ============================================================
// WHY: Real customer support is a conversation, not a single
// question. The user asks about a plan, then follows up about
// data limits, then asks to recharge. Chat sessions maintain
// history so the model understands context from previous turns.

// ──────────────────────────────────────────────────────────────
// EXAMPLE BLOCK 3 — Multi-turn Chat with History
// ──────────────────────────────────────────────────────────────

// SendMessage adds user message to history, gets model response,
// and appends both to history for context continuity.
func (cs *ChatSession) SendMessage(ctx context.Context, userMsg string) (*GenerateResponse, error) {
	// Append user message to history
	cs.History = append(cs.History, ChatMessage{Role: "user", Content: userMsg})

	if simulatedMode {
		// Generate contextual simulated responses
		resp := simulateChatResponse(cs.History)
		cs.History = append(cs.History, ChatMessage{Role: "model", Content: resp.Text})
		return resp, nil
	}

	// Real SDK:
	//   resp, err := cs.session.SendMessage(ctx, genai.Text(userMsg))
	//   return convertResponse(resp), nil
	return &GenerateResponse{Text: "[real API response]"}, nil
}

func simulateChatResponse(history []ChatMessage) *GenerateResponse {
	lastMsg := strings.ToLower(history[len(history)-1].Content)
	turnCount := len(history)

	var response string
	switch {
	case turnCount == 1 && strings.Contains(lastMsg, "plan"):
		response = "Namaste! I'd be happy to help you with Jio plans. Could you tell me your monthly budget and how much data you typically use per day? This will help me recommend the best plan for you."
	case turnCount <= 3 && (strings.Contains(lastMsg, "300") || strings.Contains(lastMsg, "budget")):
		response = "Great! For around Rs 300, I recommend the Jio Rs 299 plan:\n- 2GB data per day\n- 28 days validity\n- Unlimited voice calls\n- JioCinema Premium included\nWould you like to recharge now, or do you have questions about this plan?"
	case strings.Contains(lastMsg, "data") && strings.Contains(lastMsg, "finish"):
		response = "If your daily data finishes, your speed drops to 64 Kbps. You can buy a data add-on:\n- Rs 15 for 1GB (1 day)\n- Rs 25 for 2GB (1 day)\nOr upgrade to the Rs 349 plan which gives 3GB/day. Shall I help with an add-on?"
	case strings.Contains(lastMsg, "recharge") || strings.Contains(lastMsg, "yes"):
		response = "To recharge, you can:\n1. MyJio App (instant, with UPI/cards)\n2. jio.com website\n3. Any Jio Store or Reliance Digital\n4. Authorized retailers\nThe MyJio app is the fastest. Anything else I can help with?"
	case strings.Contains(lastMsg, "thank") || strings.Contains(lastMsg, "bye"):
		response = "You're welcome! Happy to help. Remember, for any future queries you can reach JioSaathi 24/7. Have a wonderful day! Jai Hind!"
	default:
		response = "I understand your question. Let me help you with that. Could you provide a few more details so I can give you the most accurate information?"
	}

	return &GenerateResponse{
		Text:         response,
		TokenCount:   len(strings.Fields(response)) * 2, // rough estimate
		FinishReason: "STOP",
	}
}

func demoChat() {
	fmt.Println("============================================================")
	fmt.Println("DEMO 3: Multi-turn Chat (JioSaathi Conversation)")
	fmt.Println("============================================================")

	ctx := context.Background()
	client := &GeminiClient{apiKey: "sim-key-demo"}
	model := client.GetModel("gemini-1.5-flash")
	chat := model.StartChat()

	// Simulate a realistic customer conversation
	turns := []string{
		"I want to know about Jio plans",
		"My budget is around 300 rupees per month",
		"What happens if my data finishes before 28 days?",
		"Okay, recharge me with the 299 plan",
		"Thank you JioSaathi!",
	}

	for i, userMsg := range turns {
		fmt.Printf("\n  [Turn %d] USER: %s\n", i+1, userMsg)
		resp, err := chat.SendMessage(ctx, userMsg)
		if err != nil {
			fmt.Printf("  ERROR: %v\n", err)
			continue
		}
		fmt.Printf("  [Turn %d] JIOSAATHI: %s\n", i+1, resp.Text)
	}

	// Show conversation history
	fmt.Printf("\n  --- Chat History (%d messages) ---\n", len(chat.History))
	for i, msg := range chat.History {
		role := "USER "
		if msg.Role == "model" {
			role = "MODEL"
		}
		preview := msg.Content
		if len(preview) > 60 {
			preview = preview[:60] + "..."
		}
		fmt.Printf("  %2d. [%s] %s\n", i+1, role, preview)
	}
	fmt.Println()
}

// ============================================================
// SECTION 5 — System Instructions
// ============================================================
// WHY: System instructions set the model's persona and rules
// BEFORE any user interaction. For JioSaathi, this means: always
// be polite, never discuss competitor plans, always suggest Jio
// products, respond in Hinglish if the user does. System
// instructions are sent as a preamble — invisible to the user
// but shaping every response.

// ──────────────────────────────────────────────────────────────
// EXAMPLE BLOCK 4 — System Instruction / Persona Setup
// ──────────────────────────────────────────────────────────────

func demoSystemInstruction() {
	fmt.Println("============================================================")
	fmt.Println("DEMO 4: System Instructions (JioSaathi Persona)")
	fmt.Println("============================================================")

	client := &GeminiClient{apiKey: "sim-key-demo"}
	model := client.GetModel("gemini-1.5-pro")

	// Set system instruction — this shapes ALL model responses
	model.SystemInstruction = `You are JioSaathi, the official AI customer support assistant for Jio Telecom India.

RULES:
1. Always greet with "Namaste" on first interaction.
2. Be polite, concise, and helpful.
3. If the user writes in Hinglish, respond in Hinglish.
4. Never discuss or recommend competitor plans (Airtel, Vi, BSNL).
5. For billing disputes, always offer to escalate to a human agent.
6. Suggest relevant Jio products when appropriate (JioCinema, JioFiber, JioMart).
7. End conversations with a positive note.
8. Never share personal data or account details without OTP verification.

KNOWLEDGE:
- You know all current Jio prepaid and postpaid plans.
- You can help with recharges, plan changes, number porting, and troubleshooting.
- For complex issues (tower complaints, fraud), escalate to human support.`

	fmt.Println("  SYSTEM INSTRUCTION SET:")
	for _, line := range strings.Split(model.SystemInstruction, "\n") {
		fmt.Printf("    %s\n", line)
	}

	// Demonstrate how system instruction affects responses
	fmt.Println("\n  --- Effect on Responses ---")

	if simulatedMode {
		// Without system instruction
		fmt.Println("  WITHOUT system instruction:")
		fmt.Println("    User: 'Compare Jio and Airtel plans'")
		fmt.Println("    Model: 'Here's a comparison of Jio vs Airtel...'")
		fmt.Println()

		// With system instruction
		fmt.Println("  WITH JioSaathi system instruction:")
		fmt.Println("    User: 'Compare Jio and Airtel plans'")
		fmt.Println("    Model: 'Namaste! I'd be happy to tell you about our")
		fmt.Println("            amazing Jio plans! We have options for every budget.")
		fmt.Println("            I focus on Jio services — shall I help you find")
		fmt.Println("            the perfect Jio plan for your needs?'")
	}

	// In production:
	// model.SystemInstruction = &genai.Content{
	//     Parts: []genai.Part{genai.Text(systemPrompt)},
	// }

	fmt.Println("\n  --- System Instruction Tips ---")
	fmt.Println("  - Set ONCE before starting chat (not per-message)")
	fmt.Println("  - Keep under 1000 tokens for cost efficiency")
	fmt.Println("  - Be specific: 'Never' and 'Always' work better than 'Try to'")
	fmt.Println("  - Test with adversarial prompts to verify compliance")
	fmt.Println()
}

// ============================================================
// SECTION 6 — JSON Mode / Structured Output
// ============================================================
// WHY: When AI output feeds into downstream systems (CRM,
// database, API), you need structured data — not free text.
// JSON mode forces the model to output valid JSON matching your
// schema. JioSaathi uses this to create structured tickets in
// Jio's CRM system.

// ──────────────────────────────────────────────────────────────
// EXAMPLE BLOCK 5 — JSON Mode and Structured Parsing
// ──────────────────────────────────────────────────────────────

// SupportTicket represents a structured CRM ticket.
type SupportTicket struct {
	CustomerName string `json:"customer_name"`
	PhoneNumber  string `json:"phone_number"`
	IssueType    string `json:"issue_type"`
	Priority     string `json:"priority"`
	Summary      string `json:"summary"`
	Resolution   string `json:"suggested_resolution"`
}

func demoJSONMode() {
	fmt.Println("============================================================")
	fmt.Println("DEMO 5: JSON Mode — Structured Output")
	fmt.Println("============================================================")

	// Configure model for JSON output
	client := &GeminiClient{apiKey: "sim-key-demo"}
	model := client.GetModel("gemini-1.5-flash")
	model.ResponseMIMEType = "application/json" // KEY: Forces JSON output

	prompt := `Extract a support ticket from this customer message:
"Hi, I'm Rajesh Kumar (9876543210). My 4G is not working since
yesterday in Noida Sector 62 area. Very frustrated, need immediate fix."

Respond in JSON with fields: customer_name, phone_number, issue_type,
priority, summary, suggested_resolution.`

	fmt.Printf("  PROMPT:\n")
	for _, line := range strings.Split(prompt, "\n") {
		fmt.Printf("    %s\n", line)
	}

	if simulatedMode {
		// Simulated JSON response (mirrors what Gemini would return)
		jsonResponse := `{
  "customer_name": "Rajesh Kumar",
  "phone_number": "9876543210",
  "issue_type": "network_connectivity",
  "priority": "high",
  "summary": "4G network not working in Noida Sector 62 since yesterday",
  "suggested_resolution": "Check tower status for Noida Sector 62. If tower maintenance is ongoing, inform customer of ETA. Otherwise, escalate to network ops team for immediate investigation."
}`

		fmt.Printf("\n  JSON RESPONSE:\n")
		for _, line := range strings.Split(jsonResponse, "\n") {
			fmt.Printf("    %s\n", line)
		}

		// Parse JSON into Go struct
		var ticket SupportTicket
		if err := json.Unmarshal([]byte(jsonResponse), &ticket); err != nil {
			fmt.Printf("  PARSE ERROR: %v\n", err)
			return
		}

		fmt.Println("\n  PARSED INTO Go STRUCT:")
		fmt.Printf("    Name:       %s\n", ticket.CustomerName)
		fmt.Printf("    Phone:      %s\n", ticket.PhoneNumber)
		fmt.Printf("    Issue:      %s\n", ticket.IssueType)
		fmt.Printf("    Priority:   %s\n", ticket.Priority)
		fmt.Printf("    Summary:    %s\n", ticket.Summary)
		fmt.Printf("    Resolution: %s\n", ticket.Resolution)
	}

	// In production:
	// model.ResponseMIMEType = "application/json"
	// model.ResponseSchema = &genai.Schema{...}  // optional schema enforcement
	// resp, _ := model.GenerateContent(ctx, genai.Text(prompt))

	fmt.Println("\n  --- JSON Mode Tips ---")
	fmt.Println("  - Set ResponseMIMEType = 'application/json'")
	fmt.Println("  - Optionally provide ResponseSchema for strict validation")
	fmt.Println("  - Always json.Unmarshal into a typed struct (not map[string]any)")
	fmt.Println("  - Add 'respond in JSON' in the prompt as reinforcement")
	fmt.Println()
}

// ============================================================
// SECTION 7 — Safety Settings
// ============================================================
// WHY: A customer-facing bot must not generate harmful content.
// Gemini provides configurable safety filters for categories
// like harassment, hate speech, sexually explicit, and dangerous
// content. Jio configures strict safety for JioSaathi.

// ──────────────────────────────────────────────────────────────
// EXAMPLE BLOCK 6 — Safety Settings Configuration
// ──────────────────────────────────────────────────────────────

func demoSafetySettings() {
	fmt.Println("============================================================")
	fmt.Println("DEMO 6: Safety Settings")
	fmt.Println("============================================================")

	// Define safety settings for JioSaathi
	safetySettings := []SafetySetting{
		{Category: "HARM_CATEGORY_HARASSMENT", Threshold: "BLOCK_LOW_AND_ABOVE"},
		{Category: "HARM_CATEGORY_HATE_SPEECH", Threshold: "BLOCK_LOW_AND_ABOVE"},
		{Category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", Threshold: "BLOCK_LOW_AND_ABOVE"},
		{Category: "HARM_CATEGORY_DANGEROUS_CONTENT", Threshold: "BLOCK_MEDIUM_AND_ABOVE"},
	}

	fmt.Println("  JioSaathi Safety Configuration:")
	fmt.Println("  +------------------------------------+---------------------------+")
	fmt.Println("  | Category                           | Threshold                 |")
	fmt.Println("  +------------------------------------+---------------------------+")
	for _, s := range safetySettings {
		fmt.Printf("  | %-34s | %-25s |\n", s.Category, s.Threshold)
	}
	fmt.Println("  +------------------------------------+---------------------------+")

	fmt.Println("\n  Threshold Levels (least to most strict):")
	fmt.Println("    BLOCK_NONE             — Allow everything (not for production!)")
	fmt.Println("    BLOCK_ONLY_HIGH        — Block only high-confidence harmful content")
	fmt.Println("    BLOCK_MEDIUM_AND_ABOVE — Block medium + high (recommended default)")
	fmt.Println("    BLOCK_LOW_AND_ABOVE    — Block low + medium + high (strict)")

	if simulatedMode {
		fmt.Println("\n  --- Simulated Safety Block ---")
		fmt.Println("  Prompt: 'How to hack a Jio SIM card?'")
		fmt.Println("  Response: BLOCKED")
		fmt.Println("  Reason: HARM_CATEGORY_DANGEROUS_CONTENT")
		fmt.Println("  FinishReason: SAFETY")
		fmt.Println("  JioSaathi fallback: 'I'm sorry, I can't help with that request.")
		fmt.Println("    For security concerns, please call Jio Security at 198.'")
	}

	// In production:
	// model.SafetySettings = []*genai.SafetySetting{
	//     {Category: genai.HarmCategoryHarassment, Threshold: genai.HarmBlockLowAndAbove},
	//     ...
	// }

	fmt.Println()
}

// ============================================================
// SECTION 8 — Token Counting
// ============================================================
// WHY: Gemini charges per token. At Jio's scale — 10 million
// queries/day — even 10 extra tokens per request = 100 million
// wasted tokens/day. Token counting helps:
//   - Estimate costs before making API calls
//   - Truncate long inputs to fit context windows
//   - Monitor and optimize prompt efficiency
//   - Set MaxOutputTokens appropriately

// ──────────────────────────────────────────────────────────────
// EXAMPLE BLOCK 7 — Token Counting and Cost Estimation
// ──────────────────────────────────────────────────────────────

// estimateTokens provides a rough token count.
// Real implementation: resp, _ := model.CountTokens(ctx, genai.Text(text))
// Rule of thumb: 1 token ~ 4 characters in English, ~2-3 chars in Hindi.
func estimateTokens(text string) int {
	// Simple heuristic: split by whitespace and punctuation
	words := strings.Fields(text)
	// Most tokenizers produce ~1.3 tokens per word on average
	return int(float64(len(words)) * 1.3)
}

func demoTokenCounting() {
	fmt.Println("============================================================")
	fmt.Println("DEMO 7: Token Counting & Cost Estimation")
	fmt.Println("============================================================")

	texts := map[string]string{
		"Short query":          "What is my balance?",
		"Medium query":         "I recharged with Rs 299 plan yesterday but my data is showing zero. Can you check my account and fix this issue?",
		"Long query with hist": "I've been a Jio user for 3 years. Last month I upgraded from prepaid to postpaid on the Rs 399 plan. My bill shows Rs 847 which includes international roaming charges but I never went abroad. I called support twice already (ref: JIO-2024-887766 and JIO-2024-887912) but no resolution. I need this fixed today or I'll port out to Airtel. Very disappointed with the service quality.",
		"System instruction":   "You are JioSaathi, the official AI customer support assistant for Jio Telecom India. Always greet with Namaste. Be polite and helpful. Never discuss competitors.",
	}

	fmt.Println("  Token Estimates:")
	fmt.Println("  +----------------------------+--------+--------+-----------+")
	fmt.Println("  | Text                       | Words  | Tokens | Est. Cost |")
	fmt.Println("  +----------------------------+--------+--------+-----------+")

	for label, text := range texts {
		words := len(strings.Fields(text))
		tokens := estimateTokens(text)
		// Gemini 1.5 Flash pricing: ~$0.075 per 1M input tokens
		cost := float64(tokens) * 0.000000075
		fmt.Printf("  | %-26s | %6d | %6d | $%.7f |\n", label, words, tokens, cost)
	}
	fmt.Println("  +----------------------------+--------+--------+-----------+")

	// Scale calculation for Jio
	fmt.Println("\n  --- Jio Scale Cost Estimate ---")
	dailyQueries := 10_000_000
	avgTokensPerQuery := 150 // input + output
	dailyTokens := dailyQueries * avgTokensPerQuery
	dailyCostFlash := float64(dailyTokens) * 0.000000075
	dailyCostPro := float64(dailyTokens) * 0.00000125

	fmt.Printf("  Daily queries:     %d (10M)\n", dailyQueries)
	fmt.Printf("  Avg tokens/query:  %d\n", avgTokensPerQuery)
	fmt.Printf("  Daily tokens:      %d (1.5B)\n", dailyTokens)
	fmt.Printf("  Daily cost (Flash): $%.2f\n", dailyCostFlash)
	fmt.Printf("  Daily cost (Pro):   $%.2f\n", dailyCostPro)
	fmt.Printf("  Monthly (Flash):    $%.2f\n", dailyCostFlash*30)
	fmt.Printf("  Monthly (Pro):      $%.2f\n", dailyCostPro*30)
	fmt.Println("  Lesson: Model selection matters! Flash is 16x cheaper than Pro.")

	// Token counting in production:
	// resp, err := model.CountTokens(ctx, genai.Text(prompt))
	// fmt.Printf("Input tokens: %d\n", resp.TotalTokens)

	fmt.Println()
}

// ============================================================
// SECTION 9 — Key Takeaways
// ============================================================

func printKeyTakeaways() {
	fmt.Println("============================================================")
	fmt.Println("KEY TAKEAWAYS — Gemini API Basics")
	fmt.Println("============================================================")
	fmt.Println()
	fmt.Println("  1. CLIENT SETUP")
	fmt.Println("     - Create client with API key, then get model handle")
	fmt.Println("     - Model choice: Flash (fast/cheap) vs Pro (smart/expensive)")
	fmt.Println()
	fmt.Println("  2. TEXT GENERATION")
	fmt.Println("     - Temperature controls creativity (0=deterministic, 2=wild)")
	fmt.Println("     - TopP/TopK fine-tune token sampling distribution")
	fmt.Println()
	fmt.Println("  3. STREAMING")
	fmt.Println("     - Use GenerateContentStream for real-time output")
	fmt.Println("     - Essential for user-facing applications (reduces perceived latency)")
	fmt.Println()
	fmt.Println("  4. MULTI-TURN CHAT")
	fmt.Println("     - Chat sessions maintain history automatically")
	fmt.Println("     - History grows with each turn — watch token limits!")
	fmt.Println()
	fmt.Println("  5. SYSTEM INSTRUCTIONS")
	fmt.Println("     - Set persona, rules, and constraints before user interaction")
	fmt.Println("     - Critical for brand safety (JioSaathi never recommends Airtel)")
	fmt.Println()
	fmt.Println("  6. JSON MODE")
	fmt.Println("     - ResponseMIMEType = 'application/json' for structured output")
	fmt.Println("     - Always parse into typed Go structs, not map[string]any")
	fmt.Println()
	fmt.Println("  7. SAFETY SETTINGS")
	fmt.Println("     - Configure per harm category (harassment, hate, explicit, dangerous)")
	fmt.Println("     - Customer-facing bots need strict settings")
	fmt.Println()
	fmt.Println("  8. TOKEN COUNTING")
	fmt.Println("     - CountTokens before sending to estimate cost")
	fmt.Println("     - At scale, model selection = millions in cost difference")
	fmt.Println()
	fmt.Println("  NEXT: Chapter 37 covers embeddings — turning text into vectors")
	fmt.Println("  for semantic search, powering IRCTC's FAQ search system.")
	fmt.Println()
}

// ============================================================
// MAIN — Run all demos
// ============================================================

func main() {
	fmt.Println()
	fmt.Println("============================================================")
	fmt.Println("  FILE 36 : AI — Gemini API Basics (JioSaathi)")
	fmt.Println("============================================================")
	fmt.Println()

	demoTextGeneration()
	demoStreaming()
	demoChat()
	demoSystemInstruction()
	demoJSONMode()
	demoSafetySettings()
	demoTokenCounting()
	printKeyTakeaways()
}
