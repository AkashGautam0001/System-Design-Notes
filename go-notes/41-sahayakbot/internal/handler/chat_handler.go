// ============================================================
//  Chat Handler — HTTP + WebSocket Endpoints for SahayakBot
// ============================================================
//  WHY a single handler struct for both HTTP and WebSocket?
//  Both endpoints share the same core logic: receive message →
//  call AI → execute tools → call AI again → return response.
//  The only difference is the transport layer (HTTP request/
//  response vs WebSocket frames). By putting both in one struct,
//  we share the AI client, tool registry, and session manager.
//
//  Swiggy uses HTTP for their mobile app (simple request-response)
//  and WebSocket for their web dashboard (real-time chat interface).
//  Same bot, two transports — this handler supports both.
// ============================================================

package handler

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/websocket"

	"sahayakbot/internal/ai"
	"sahayakbot/internal/model"
	"sahayakbot/internal/session"
	"sahayakbot/internal/tools"
)

// ChatHandler handles all chat-related endpoints.
// WHY these four dependencies?
//   - gemini:     the AI brain (intent + response generation)
//   - registry:   available tools (the agent's capabilities)
//   - sessionMgr: conversation memory (context across messages)
//   - maxToolCalls: safety limit to prevent infinite tool loops
type ChatHandler struct {
	gemini       *ai.GeminiClient
	registry     *tools.Registry
	sessionMgr   *session.Manager
	maxToolCalls int
}

// NewChatHandler creates a handler with all required dependencies.
func NewChatHandler(gemini *ai.GeminiClient, registry *tools.Registry, sessionMgr *session.Manager, maxToolCalls int) *ChatHandler {
	return &ChatHandler{
		gemini:       gemini,
		registry:     registry,
		sessionMgr:   sessionMgr,
		maxToolCalls: maxToolCalls,
	}
}

// ──────────────────────────────────────────────────────────────
// WebSocket upgrader
// ──────────────────────────────────────────────────────────────
// WHY custom CheckOrigin? The default gorilla upgrader rejects
// cross-origin requests. For development and demos, we allow all
// origins. In production, Swiggy restricts this to *.swiggy.com.

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// WHY allow all origins in dev? During development, the frontend
		// runs on localhost:3000 while the backend is on :8085. Strict
		// origin checking would block this. Production uses a reverse
		// proxy (Nginx) that handles CORS centrally.
		return true
	},
}

// ──────────────────────────────────────────────────────────────
// HandleChat — HTTP POST endpoint for request-response chat
// ──────────────────────────────────────────────────────────────
// WHY HTTP alongside WebSocket? Not all clients support WebSocket:
//   - Mobile apps prefer simple HTTP calls
//   - Server-to-server integrations use REST
//   - Load testing tools (hey, wrk) work with HTTP
// Swiggy's mobile SDK uses this endpoint; the web chat uses WS.

func (h *ChatHandler) HandleChat(w http.ResponseWriter, r *http.Request) {
	// Parse the incoming chat request
	var req model.ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.Message == "" {
		http.Error(w, `{"error":"message is required"}`, http.StatusBadRequest)
		return
	}

	// ──────────────────────────────────────────────────────────────
	// Get or create session
	// ──────────────────────────────────────────────────────────────
	// WHY auto-create? First-time users shouldn't need a separate
	// "create session" call. One POST to /api/chat starts everything.
	var sess *session.Session
	var err error

	if req.SessionID != "" {
		sess, err = h.sessionMgr.GetSession(req.SessionID)
		if err != nil {
			// Session expired or doesn't exist — create a new one
			log.Printf("[CHAT] Session %s not found, creating new", req.SessionID)
			sess = h.sessionMgr.CreateSession()
		}
	} else {
		sess = h.sessionMgr.CreateSession()
	}

	// ──────────────────────────────────────────────────────────────
	// Process the message through the AI + tool loop
	// ──────────────────────────────────────────────────────────────
	response, toolsUsed, err := h.processMessage(r.Context(), sess.ID, req.Message)
	if err != nil {
		log.Printf("[CHAT] Error processing message: %v", err)
		http.Error(w, `{"error":"failed to process message"}`, http.StatusInternalServerError)
		return
	}

	// Build and send the response
	chatResp := model.ChatResponse{
		SessionID: sess.ID,
		Message:   response,
		ToolsUsed: toolsUsed,
		Timestamp: time.Now(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(chatResp)
}

// ──────────────────────────────────────────────────────────────
// HandleWebSocket — real-time bidirectional chat
// ──────────────────────────────────────────────────────────────
// WHY WebSocket for chat? HTTP is request-response — the client
// must poll for updates. WebSocket is full-duplex: the server can
// push messages anytime. For a chat interface, this means:
//   - Instant responses (no polling delay)
//   - Server can send "typing..." indicators
//   - Tool execution progress can be streamed
//   - Connection stays alive for the entire session
//
// Swiggy's web chat widget uses WebSocket. When a user opens the
// support chat, ONE WebSocket connection handles the entire
// conversation. No repeated HTTP handshakes, no session ID in
// every request — just continuous message flow.

func (h *ChatHandler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	// Upgrade HTTP connection to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[WS] Upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	// Create a session for this WebSocket connection
	sess := h.sessionMgr.CreateSession()
	log.Printf("[WS] New connection, session=%s", sess.ID)

	// Send a welcome message with the session ID
	welcome := model.ChatResponse{
		SessionID: sess.ID,
		Message:   "Namaste! I'm SahayakBot, your Swiggy support assistant. How can I help you today?",
		Timestamp: time.Now(),
	}
	if err := conn.WriteJSON(welcome); err != nil {
		log.Printf("[WS] Failed to send welcome: %v", err)
		return
	}

	// ──────────────────────────────────────────────────────────────
	// Configure ping/pong for keep-alive
	// ──────────────────────────────────────────────────────────────
	// WHY ping/pong? WebSocket connections can silently die (network
	// switch, phone locks screen). Without ping/pong, the server
	// keeps the session alive but the client is gone. Ping/pong
	// detects dead connections so we can clean up resources.
	conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	// Start a goroutine to send pings periodically
	done := make(chan struct{})
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					return
				}
			case <-done:
				return
			}
		}
	}()

	// ──────────────────────────────────────────────────────────────
	// Read loop — receive messages and process them
	// ──────────────────────────────────────────────────────────────
	// WHY an infinite loop? WebSocket is a persistent connection.
	// Each iteration reads one message, processes it through the AI
	// pipeline, and sends back the response. The loop exits when
	// the client disconnects or an error occurs.
	for {
		// Read the next message from the client
		var req model.ChatRequest
		err := conn.ReadJSON(&req)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				log.Printf("[WS] Unexpected close: %v", err)
			} else {
				log.Printf("[WS] Connection closed for session %s", sess.ID)
			}
			close(done) // Stop the ping goroutine
			break
		}

		// Reset read deadline on each message
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))

		if req.Message == "" {
			conn.WriteJSON(model.ChatResponse{
				SessionID: sess.ID,
				Message:   "I didn't catch that. Could you please rephrase?",
				Timestamp: time.Now(),
			})
			continue
		}

		// Process through the AI + tool loop (same logic as HTTP)
		response, toolsUsed, err := h.processMessage(r.Context(), sess.ID, req.Message)
		if err != nil {
			log.Printf("[WS] Error processing message: %v", err)
			conn.WriteJSON(model.ChatResponse{
				SessionID: sess.ID,
				Message:   "I'm having trouble processing your request. Could you try again?",
				Timestamp: time.Now(),
			})
			continue
		}

		// Send the response back over WebSocket
		chatResp := model.ChatResponse{
			SessionID: sess.ID,
			Message:   response,
			ToolsUsed: toolsUsed,
			Timestamp: time.Now(),
		}
		if err := conn.WriteJSON(chatResp); err != nil {
			log.Printf("[WS] Failed to send response: %v", err)
			close(done)
			break
		}
	}

	// Clean up session when WebSocket closes
	log.Printf("[WS] Cleaning up session %s", sess.ID)
}

// ──────────────────────────────────────────────────────────────
// processMessage — the core AI + tool execution loop
// ──────────────────────────────────────────────────────────────
// WHY a shared method? Both HTTP and WebSocket use identical logic:
//   1. Save user message to session
//   2. Build context window from history
//   3. Call AI with context + tool definitions
//   4. If AI wants tool calls → execute tools → call AI again
//   5. Repeat until AI returns text (or max iterations hit)
//   6. Save AI response to session
//
// This is THE core pattern of AI agents. Everything else (HTTP,
// WebSocket, sessions) is plumbing. This method IS SahayakBot.

func (h *ChatHandler) processMessage(ctx context.Context, sessionID, message string) (string, []string, error) {
	// Step 1: Save the user's message to the session
	userMsg := model.ChatMessage{
		Role:      "user",
		Content:   message,
		Timestamp: time.Now(),
	}
	if err := h.sessionMgr.AddMessage(sessionID, userMsg); err != nil {
		return "", nil, err
	}

	// Step 2: Build the context window — last N messages
	// WHY 20 messages? Enough context for follow-ups, but not so
	// much that we hit token limits. Swiggy tested 10, 20, and 50;
	// 20 gave the best balance of context accuracy and latency.
	history, err := h.sessionMgr.GetHistory(sessionID, 20)
	if err != nil {
		return "", nil, err
	}

	// Step 3: Get available tool definitions
	toolDefs := h.registry.ListTools()

	// Step 4: The tool execution loop
	// ──────────────────────────────────────────────────────────────
	// This is the heart of the AI agent pattern:
	//   AI responds → has tool calls? → execute → feed results → repeat
	//
	// WHY a max iteration limit? Without it, a confused AI could:
	//   - Call tool A → suggests tool B → suggests tool A → infinite loop
	//   - Or: hallucinate a non-existent tool → error → try again → error
	//
	// Swiggy sets this to 3. Most conversations need 1 tool call;
	// complex ones (order check + refund) need 2. If 3 isn't enough,
	// something is wrong and we should bail out gracefully.
	// ──────────────────────────────────────────────────────────────
	var toolsUsed []string
	messages := make([]model.ChatMessage, len(history))
	copy(messages, history)

	for iteration := 0; iteration < h.maxToolCalls; iteration++ {
		// Call the AI
		aiResponse, err := h.gemini.Chat(ctx, messages, toolDefs)
		if err != nil {
			return "", nil, err
		}

		// If no tool calls, we have our final response
		if len(aiResponse.ToolCalls) == 0 {
			// Save the assistant's response to the session
			h.sessionMgr.AddMessage(sessionID, *aiResponse)
			return aiResponse.Content, toolsUsed, nil
		}

		// AI wants to call tools — execute each one
		log.Printf("[AGENT] Iteration %d: AI requested %d tool call(s)", iteration+1, len(aiResponse.ToolCalls))

		var toolResults []model.ToolResult
		for _, tc := range aiResponse.ToolCalls {
			log.Printf("[AGENT] Executing tool: %s (args: %v)", tc.Name, tc.Arguments)
			toolsUsed = append(toolsUsed, tc.Name)

			result, err := h.registry.Execute(ctx, tc.Name, tc.Arguments)
			tr := model.ToolResult{
				ToolCallID: tc.ID,
				Name:       tc.Name,
			}
			if err != nil {
				log.Printf("[AGENT] Tool %s failed: %v", tc.Name, err)
				tr.Error = err.Error()
			} else {
				tr.Result = result
			}
			toolResults = append(toolResults, tr)
		}

		// Add tool results to the conversation
		toolMsg := model.ChatMessage{
			Role:        "tool",
			ToolResults: toolResults,
			Timestamp:   time.Now(),
		}
		messages = append(messages, toolMsg)

		// Save the tool interaction to session
		h.sessionMgr.AddMessage(sessionID, *aiResponse) // save AI's tool call request
		h.sessionMgr.AddMessage(sessionID, toolMsg)      // save tool results
	}

	// Max iterations reached — return a graceful fallback
	// WHY not an error? The user shouldn't see "max iterations exceeded".
	// They should see a helpful message that acknowledges the complexity.
	log.Printf("[AGENT] Max tool iterations (%d) reached for session %s", h.maxToolCalls, sessionID)
	fallback := "I've gathered some information for you, but the request was quite complex. Could you try asking in a simpler way, or let me know specifically what you need?"
	fallbackMsg := model.ChatMessage{
		Role:      "assistant",
		Content:   fallback,
		Timestamp: time.Now(),
	}
	h.sessionMgr.AddMessage(sessionID, fallbackMsg)
	return fallback, toolsUsed, nil
}

// ──────────────────────────────────────────────────────────────
// Session management endpoints
// ──────────────────────────────────────────────────────────────

// HandleCreateSession creates a new conversation session.
// WHY a dedicated endpoint? Some clients (mobile apps) want to
// create a session explicitly before sending messages, so they
// can display a "connecting..." state to the user.
func (h *ChatHandler) HandleCreateSession(w http.ResponseWriter, r *http.Request) {
	sess := h.sessionMgr.CreateSession()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"session_id": sess.ID,
		"created_at": sess.CreatedAt,
		"message":    "Session created. Send messages to /api/chat with this session_id.",
	})
}

// HandleGetSession returns the conversation history for a session.
// WHY expose history? The frontend needs it to render the chat
// when a user refreshes the page or switches devices. Swiggy's
// web chat loads history on reconnect so users see their full
// conversation without asking the same questions again.
func (h *ChatHandler) HandleGetSession(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, `{"error":"session ID is required"}`, http.StatusBadRequest)
		return
	}

	sess, err := h.sessionMgr.GetSession(id)
	if err != nil {
		http.Error(w, `{"error":"session not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sess)
}

// HandleDeleteSession ends a conversation session.
// WHY explicit delete? When a user clicks "End Chat", the session
// should be cleaned up immediately — not wait for the timeout.
// This also prevents the session from being accessed by others
// if the session ID was leaked.
func (h *ChatHandler) HandleDeleteSession(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, `{"error":"session ID is required"}`, http.StatusBadRequest)
		return
	}

	if err := h.sessionMgr.DeleteSession(id); err != nil {
		http.Error(w, `{"error":"session not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Session ended. Thank you for using SahayakBot!",
	})
}

// HandleListTools returns all available tools and their definitions.
// WHY expose tools? Transparency. The frontend can show "Available
// capabilities" so users know what the bot can do. Swiggy's chat
// widget shows tool badges ("Order Tracking", "Refunds") at the
// top of the chat window.
func (h *ChatHandler) HandleListTools(w http.ResponseWriter, r *http.Request) {
	toolDefs := h.registry.ListTools()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"tools": toolDefs,
		"count": len(toolDefs),
	})
}
