// ============================================================
//  Chat Models — Core Data Structures for AI Conversations
// ============================================================
//  WHY separate models?
//  These structs are shared across every package — the AI client
//  produces ChatMessages, the handler consumes them, the session
//  manager stores them, and the tool registry uses ToolCall /
//  ToolResult. Putting them in a dedicated package prevents import
//  cycles. Swiggy's Go style guide mandates this "model" package
//  pattern for all microservices.
// ============================================================

package model

import "time"

// ──────────────────────────────────────────────────────────────
// ChatMessage — a single turn in the conversation
// ──────────────────────────────────────────────────────────────
// WHY Role field? The AI needs to know who said what:
//   - "user"      → the customer's message
//   - "assistant" → the AI's response
//   - "tool"      → result from a tool execution
// This mirrors the Gemini / OpenAI message format exactly.

type ChatMessage struct {
	Role        string       `json:"role"`                   // user, assistant, tool
	Content     string       `json:"content"`                // text content
	ToolCalls   []ToolCall   `json:"tool_calls,omitempty"`   // tools the AI wants to call
	ToolResults []ToolResult `json:"tool_results,omitempty"` // results from tool execution
	Timestamp   time.Time    `json:"timestamp"`              // when this message was created
}

// ──────────────────────────────────────────────────────────────
// ToolCall — AI's request to execute a specific tool
// ──────────────────────────────────────────────────────────────
// WHY a separate struct? When Gemini says "I need to check order
// status", it returns a structured ToolCall — not free text.
// This lets our backend safely parse and execute the right function.

type ToolCall struct {
	ID        string                 `json:"id"`        // unique call ID for matching results
	Name      string                 `json:"name"`      // tool name, e.g., "check_order_status"
	Arguments map[string]interface{} `json:"arguments"` // tool arguments as key-value pairs
}

// ──────────────────────────────────────────────────────────────
// ToolResult — the output from executing a tool
// ──────────────────────────────────────────────────────────────
// WHY Error as string? The AI needs to understand failures too.
// If a refund fails, the AI should say "Sorry, the refund couldn't
// be processed because..." — it needs the error message for that.

type ToolResult struct {
	ToolCallID string      `json:"tool_call_id"` // matches ToolCall.ID
	Name       string      `json:"name"`         // which tool produced this
	Result     interface{} `json:"result"`        // the actual result data
	Error      string      `json:"error"`         // error message if tool failed
}

// ──────────────────────────────────────────────────────────────
// Request / Response — HTTP API contracts
// ──────────────────────────────────────────────────────────────

// ChatRequest is what the client sends to POST /api/chat.
// WHY optional SessionID? First message creates a new session;
// subsequent messages include the session ID for continuity.
type ChatRequest struct {
	SessionID string `json:"session_id,omitempty"` // existing session (optional)
	Message   string `json:"message"`              // user's message text
}

// ChatResponse is what the server returns from POST /api/chat.
// WHY ToolsUsed? Transparency — the client can show "Checked order
// status" badges so the user knows the bot actually did something.
type ChatResponse struct {
	SessionID string   `json:"session_id"`          // session for follow-up messages
	Message   string   `json:"message"`             // bot's response text
	ToolsUsed []string `json:"tools_used,omitempty"` // which tools were invoked
	Timestamp time.Time `json:"timestamp"`           // response timestamp
}

// ──────────────────────────────────────────────────────────────
// Tool Definitions — schema that tells the AI what tools exist
// ──────────────────────────────────────────────────────────────
// WHY structured definitions? The AI reads these to understand:
//   1. What tools are available
//   2. What arguments each tool expects
//   3. What each tool does (description)
// This is the "function calling" contract between AI and backend.

type ToolDefinition struct {
	Name        string          `json:"name"`        // unique tool name
	Description string          `json:"description"` // what this tool does
	Parameters  []ToolParameter `json:"parameters"`  // expected arguments
}

// ToolParameter describes a single argument for a tool.
type ToolParameter struct {
	Name        string `json:"name"`        // parameter name
	Type        string `json:"type"`        // string, number, boolean
	Description string `json:"description"` // what this parameter is
	Required    bool   `json:"required"`    // is this mandatory?
}
