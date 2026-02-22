// ============================================================
//  Gemini Client — AI Engine for SahayakBot
// ============================================================
//  WHY a simulated Gemini client?
//  This chapter teaches the PATTERN of AI function calling, not
//  the specifics of any one API. The simulated client:
//  1. Analyses user intent via keyword matching
//  2. Decides which tool(s) to call
//  3. Returns structured ToolCall objects
//  4. Formats final responses from tool results
//
//  In production at Swiggy, this would call the real Gemini API.
//  The interface is identical — swap the implementation, keep the
//  pipeline. This is dependency inversion in action.
// ============================================================

package ai

import (
	"context"
	"fmt"
	"strings"
	"time"

	"sahayakbot/internal/model"
)

// GeminiClient handles all AI interactions.
// WHY apiKey AND systemPrompt fields? The apiKey determines real vs
// simulated mode. The systemPrompt is injected so different services
// (support bot, restaurant bot, delivery bot) can share the same
// client code with different personalities.
type GeminiClient struct {
	apiKey       string
	simulated    bool
	systemPrompt string
}

// NewGeminiClient creates a new Gemini client.
// WHY check apiKey here? A single check at init time prevents
// repeated "am I simulated?" checks throughout the codebase.
func NewGeminiClient(apiKey, systemPrompt string) *GeminiClient {
	return &GeminiClient{
		apiKey:       apiKey,
		simulated:    apiKey == "",
		systemPrompt: systemPrompt,
	}
}

// IsSimulated returns whether the client is running in simulation mode.
func (g *GeminiClient) IsSimulated() bool {
	return g.simulated
}

// ──────────────────────────────────────────────────────────────
// Chat — the main AI interaction method
// ──────────────────────────────────────────────────────────────
// WHY this signature? It mirrors the real Gemini API:
//   - messages: conversation history (context window)
//   - tools:    available tool definitions
//   - returns:  a ChatMessage that may contain ToolCalls OR text
//
// The caller (handler) checks response.ToolCalls — if non-empty,
// it executes the tools and calls Chat again with the results.
// This is the tool execution loop pattern.

func (g *GeminiClient) Chat(ctx context.Context, messages []model.ChatMessage, tools []model.ToolDefinition) (*model.ChatMessage, error) {
	// ──────────────────────────────────────────────────────────────
	// In production, this would make an HTTP POST to:
	// https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent
	//
	// The request body includes:
	//   - system_instruction: g.systemPrompt
	//   - contents: messages (converted to Gemini format)
	//   - tools: tool definitions (function declarations)
	//
	// For now, we simulate the entire flow locally.
	// ──────────────────────────────────────────────────────────────

	if g.simulated {
		return g.simulatedChat(ctx, messages, tools)
	}

	// Real Gemini API call would go here.
	// For educational purposes, we always use simulated mode.
	return g.simulatedChat(ctx, messages, tools)
}

// ──────────────────────────────────────────────────────────────
// simulatedChat — realistic intent detection and tool selection
// ──────────────────────────────────────────────────────────────
// WHY keyword-based intent detection? Real Gemini uses transformer
// attention to understand intent. Our simulation approximates this
// with keyword matching — good enough to demonstrate the full
// pipeline. The ARCHITECTURE (loop, tool calls, results) is
// identical regardless of how intent is detected.

func (g *GeminiClient) simulatedChat(ctx context.Context, messages []model.ChatMessage, tools []model.ToolDefinition) (*model.ChatMessage, error) {
	// Check for context cancellation — important for WebSocket handlers
	// where the client might disconnect mid-conversation.
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	// Simulate a small processing delay — real API calls take 200-800ms.
	// WHY? Without this, the bot responds instantly which feels unnatural
	// and doesn't test timeout handling in the handler.
	time.Sleep(100 * time.Millisecond)

	// Find the last user message — this is what we need to respond to.
	lastUserMsg := findLastUserMessage(messages)
	if lastUserMsg == "" {
		return &model.ChatMessage{
			Role:      "assistant",
			Content:   "Namaste! I'm SahayakBot, your Swiggy support assistant. How can I help you today?",
			Timestamp: time.Now(),
		}, nil
	}

	// Check if the last message contains tool results — if so, the AI
	// should format a response based on those results, not call more tools.
	lastMsg := messages[len(messages)-1]
	if lastMsg.Role == "tool" && len(lastMsg.ToolResults) > 0 {
		return g.formatToolResponse(lastMsg.ToolResults)
	}

	// ──────────────────────────────────────────────────────────────
	// Intent detection — which tool should we call?
	// ──────────────────────────────────────────────────────────────
	lower := strings.ToLower(lastUserMsg)

	// Order status / tracking intent
	if containsAny(lower, []string{"order", "status", "track", "where is", "delivery", "package"}) {
		orderID := extractOrderID(lower)
		if orderID == "" {
			orderID = "SWG-12345" // default for demo
		}
		return &model.ChatMessage{
			Role: "assistant",
			ToolCalls: []model.ToolCall{
				{
					ID:   fmt.Sprintf("call_%d", time.Now().UnixNano()),
					Name: "check_order_status",
					Arguments: map[string]interface{}{
						"order_id": orderID,
					},
				},
			},
			Timestamp: time.Now(),
		}, nil
	}

	// Refund intent
	if containsAny(lower, []string{"refund", "return", "money back", "cancel", "wrong order", "cold food", "stale", "missing"}) {
		orderID := extractOrderID(lower)
		if orderID == "" {
			orderID = "SWG-12345"
		}
		reason := extractRefundReason(lower)
		return &model.ChatMessage{
			Role: "assistant",
			ToolCalls: []model.ToolCall{
				{
					ID:   fmt.Sprintf("call_%d", time.Now().UnixNano()),
					Name: "process_refund",
					Arguments: map[string]interface{}{
						"order_id": orderID,
						"reason":   reason,
					},
				},
			},
			Timestamp: time.Now(),
		}, nil
	}

	// Restaurant search intent
	if containsAny(lower, []string{"restaurant", "food", "eat", "hungry", "find", "suggest", "recommend", "biryani", "dosa", "pizza", "chinese", "north indian", "south indian"}) {
		cuisine := extractCuisine(lower)
		location := extractLocation(lower)
		return &model.ChatMessage{
			Role: "assistant",
			ToolCalls: []model.ToolCall{
				{
					ID:   fmt.Sprintf("call_%d", time.Now().UnixNano()),
					Name: "find_restaurants",
					Arguments: map[string]interface{}{
						"cuisine":  cuisine,
						"location": location,
					},
				},
			},
			Timestamp: time.Now(),
		}, nil
	}

	// ETA intent
	if containsAny(lower, []string{"eta", "how long", "when will", "time", "arriving"}) {
		orderID := extractOrderID(lower)
		if orderID == "" {
			orderID = "SWG-12345"
		}
		return &model.ChatMessage{
			Role: "assistant",
			ToolCalls: []model.ToolCall{
				{
					ID:   fmt.Sprintf("call_%d", time.Now().UnixNano()),
					Name: "get_delivery_eta",
					Arguments: map[string]interface{}{
						"order_id": orderID,
					},
				},
			},
			Timestamp: time.Now(),
		}, nil
	}

	// General conversation — no tools needed
	response := g.generateGeneralResponse(lower)
	return &model.ChatMessage{
		Role:      "assistant",
		Content:   response,
		Timestamp: time.Now(),
	}, nil
}

// ──────────────────────────────────────────────────────────────
// formatToolResponse — turn tool results into human-friendly text
// ──────────────────────────────────────────────────────────────
// WHY a separate method? In real Gemini, the model does this
// automatically — it reads tool results and generates a response.
// Our simulation needs to do the same formatting manually.

func (g *GeminiClient) formatToolResponse(results []model.ToolResult) (*model.ChatMessage, error) {
	var parts []string

	for _, r := range results {
		if r.Error != "" {
			parts = append(parts, fmt.Sprintf("I'm sorry, I encountered an issue: %s. Let me try to help you another way.", r.Error))
			continue
		}

		switch r.Name {
		case "check_order_status":
			parts = append(parts, formatOrderResponse(r.Result))
		case "process_refund":
			parts = append(parts, formatRefundResponse(r.Result))
		case "find_restaurants":
			parts = append(parts, formatRestaurantResponse(r.Result))
		case "get_delivery_eta":
			parts = append(parts, formatETAResponse(r.Result))
		default:
			parts = append(parts, fmt.Sprintf("Here's what I found: %v", r.Result))
		}
	}

	content := strings.Join(parts, "\n\n")
	if content == "" {
		content = "I've processed your request. Is there anything else I can help with?"
	}

	return &model.ChatMessage{
		Role:      "assistant",
		Content:   content,
		Timestamp: time.Now(),
	}, nil
}

// generateGeneralResponse creates a response for non-tool queries.
func (g *GeminiClient) generateGeneralResponse(lower string) string {
	if containsAny(lower, []string{"hello", "hi", "hey", "namaste"}) {
		return "Namaste! Welcome to Swiggy support. I'm SahayakBot, your personal assistant. I can help you with order tracking, refunds, and finding great restaurants. What would you like to do?"
	}
	if containsAny(lower, []string{"thank", "thanks", "dhanyavaad"}) {
		return "You're welcome! Happy to help. If you need anything else, I'm always here. Enjoy your meal! 🍽️"
	}
	if containsAny(lower, []string{"help", "support", "what can you"}) {
		return "I can help you with:\n- Tracking your order status\n- Processing refunds for problematic orders\n- Finding restaurants and cuisines near you\n- Checking delivery ETAs\n\nJust tell me what you need!"
	}
	if containsAny(lower, []string{"bye", "goodbye", "alvida"}) {
		return "Goodbye! Thanks for using Swiggy. Have a great day! Alvida!"
	}
	return "I'd be happy to help! Could you tell me more about what you need? I can track orders, process refunds, or help you find great restaurants."
}

// ──────────────────────────────────────────────────────────────
// Response formatting helpers
// ──────────────────────────────────────────────────────────────

func formatOrderResponse(result interface{}) string {
	if m, ok := result.(map[string]interface{}); ok {
		return fmt.Sprintf("Here's your order update:\n- Order: %v\n- Restaurant: %v\n- Status: %v\n- Items: %v\n- Total: ₹%v\n- Estimated delivery: %v\n\nIs there anything else you'd like to know?",
			m["id"], m["restaurant"], m["status"], m["items"], m["total"], m["delivery_time"])
	}
	return fmt.Sprintf("Your order details: %v", result)
}

func formatRefundResponse(result interface{}) string {
	if m, ok := result.(map[string]interface{}); ok {
		return fmt.Sprintf("Your refund has been processed!\n- Refund ID: %v\n- Amount: ₹%v\n- Status: %v\n- Expected credit: %v business days\n\nThe amount will be returned to your original payment method. Is there anything else I can help with?",
			m["refund_id"], m["amount"], m["status"], m["estimated_days"])
	}
	return fmt.Sprintf("Refund processed: %v", result)
}

func formatRestaurantResponse(result interface{}) string {
	if restaurants, ok := result.([]interface{}); ok {
		var lines []string
		lines = append(lines, "Here are some great options for you:")
		for i, r := range restaurants {
			if m, ok := r.(map[string]interface{}); ok {
				status := "Open"
				if isOpen, ok := m["is_open"].(bool); ok && !isOpen {
					status = "Closed"
				}
				lines = append(lines, fmt.Sprintf("%d. %v (%v) - Rating: %v, Delivery: %v [%s]",
					i+1, m["name"], m["cuisine"], m["rating"], m["delivery_time"], status))
			}
		}
		lines = append(lines, "\nWould you like to order from any of these?")
		return strings.Join(lines, "\n")
	}
	return fmt.Sprintf("Restaurants found: %v", result)
}

func formatETAResponse(result interface{}) string {
	if m, ok := result.(map[string]interface{}); ok {
		return fmt.Sprintf("Delivery update for order %v:\n- Current status: %v\n- Estimated arrival: %v\n- Delivery partner: %v\n\nI'll keep you posted if anything changes!",
			m["order_id"], m["status"], m["eta"], m["delivery_partner"])
	}
	return fmt.Sprintf("Delivery ETA: %v", result)
}

// ──────────────────────────────────────────────────────────────
// Text analysis helpers — keyword extraction
// ──────────────────────────────────────────────────────────────

func findLastUserMessage(messages []model.ChatMessage) string {
	for i := len(messages) - 1; i >= 0; i-- {
		if messages[i].Role == "user" {
			return messages[i].Content
		}
	}
	return ""
}

func containsAny(text string, keywords []string) bool {
	for _, kw := range keywords {
		if strings.Contains(text, kw) {
			return true
		}
	}
	return false
}

func extractOrderID(text string) string {
	// Look for patterns like SWG-12345, #12345, order 12345
	words := strings.Fields(text)
	for _, w := range words {
		w = strings.Trim(w, ".,!?#")
		if strings.HasPrefix(strings.ToUpper(w), "SWG-") {
			return strings.ToUpper(w)
		}
		// Check for pure numeric order IDs
		if len(w) >= 4 && len(w) <= 8 && isNumeric(w) {
			return "SWG-" + w
		}
	}
	return ""
}

func isNumeric(s string) bool {
	for _, c := range s {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}

func extractRefundReason(text string) string {
	if strings.Contains(text, "cold") {
		return "Food was cold on delivery"
	}
	if strings.Contains(text, "wrong") {
		return "Wrong order delivered"
	}
	if strings.Contains(text, "missing") {
		return "Items missing from order"
	}
	if strings.Contains(text, "stale") {
		return "Food quality was poor"
	}
	if strings.Contains(text, "late") || strings.Contains(text, "delay") {
		return "Extremely late delivery"
	}
	return "Customer requested refund"
}

func extractCuisine(text string) string {
	cuisines := map[string]string{
		"biryani":      "Hyderabadi",
		"dosa":         "South Indian",
		"south indian": "South Indian",
		"north indian": "North Indian",
		"chinese":      "Chinese",
		"pizza":        "Italian",
		"italian":      "Italian",
		"mughlai":      "Mughlai",
		"street food":  "Street Food",
		"chaat":        "Street Food",
		"thai":         "Thai",
	}

	lower := strings.ToLower(text)
	for keyword, cuisine := range cuisines {
		if strings.Contains(lower, keyword) {
			return cuisine
		}
	}
	return "Multi-Cuisine"
}

func extractLocation(text string) string {
	locations := []string{
		"koramangala", "indiranagar", "hsr layout", "whitefield",
		"marathahalli", "jayanagar", "jp nagar", "electronic city",
		"mg road", "brigade road", "church street", "bandra",
		"andheri", "powai", "juhu", "connaught place", "hauz khas",
		"saket", "gurgaon", "noida",
	}

	lower := strings.ToLower(text)
	for _, loc := range locations {
		if strings.Contains(lower, loc) {
			return titleCase(loc)
		}
	}
	return "Koramangala" // default Bangalore location
}

// titleCase capitalises the first letter of each word.
// WHY not strings.Title? It was deprecated in Go 1.18 because it
// doesn't handle Unicode properly (e.g., Dutch "ij" digraph).
// For English location names, a simple split-capitalise works fine.
func titleCase(s string) string {
	words := strings.Fields(s)
	for i, w := range words {
		if len(w) > 0 {
			words[i] = strings.ToUpper(w[:1]) + w[1:]
		}
	}
	return strings.Join(words, " ")
}
