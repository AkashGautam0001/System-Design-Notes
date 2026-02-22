// ============================================================
//  Session Manager — Conversation Memory for SahayakBot
// ============================================================
//  WHY session management?
//  An AI without memory is like a support agent with amnesia.
//  The customer says "Check order SWG-12345", then "Cancel it."
//  Without session memory, the bot doesn't know what "it" is.
//
//  Swiggy's SahayakBot maintains a conversation history for each
//  user session. This history is sent to the AI as context — the
//  "context window" — so it can understand follow-up questions,
//  resolve pronouns ("it", "that order"), and maintain coherent
//  multi-turn conversations.
//
//  KEY CONCEPTS:
//  - Session: a single conversation (user opens support → closes)
//  - Context window: last N messages sent to the AI
//  - Memory trimming: older messages are dropped to stay within
//    token limits (Gemini has a ~32K token context window)
//  - Session timeout: inactive sessions are cleaned up to prevent
//    unbounded memory growth (Swiggy handles millions daily)
// ============================================================

package session

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"sahayakbot/internal/model"

	"crypto/rand"
	"encoding/hex"
)

// Session represents a single conversation with a user.
// WHY a struct (not just []ChatMessage)? We need metadata:
//   - ID: to identify the session in HTTP requests
//   - CreatedAt: for analytics ("avg session duration")
//   - LastActiveAt: for timeout-based cleanup
//   - Metadata: for extensibility (user ID, platform, etc.)
type Session struct {
	ID           string              `json:"id"`
	Messages     []model.ChatMessage `json:"messages"`
	CreatedAt    time.Time           `json:"created_at"`
	LastActiveAt time.Time           `json:"last_active_at"`
	Metadata     map[string]string   `json:"metadata,omitempty"`
}

// Manager handles session lifecycle — create, read, update, delete.
// WHY in-memory (not Redis/DB)?
// For this chapter, in-memory is perfect — it teaches the concept
// without infrastructure dependencies. In production, Swiggy uses
// Redis for session storage because:
//   1. Persistence across restarts
//   2. Shared state across multiple bot instances
//   3. Built-in TTL for automatic expiry
// The interface is the same — swap the storage backend, keep the logic.
type Manager struct {
	sessions   map[string]*Session
	mu         sync.RWMutex
	maxHistory int           // max messages per session
	timeout    time.Duration // inactive session expiry
}

// NewManager creates a session manager with the given limits.
// WHY configurable limits? Different use cases need different sizes:
//   - Customer support: 50 messages (short, focused conversations)
//   - Enterprise chatbot: 200 messages (long research sessions)
//   - Quick FAQ bot: 10 messages (one question, one answer)
func NewManager(maxHistory int, timeout time.Duration) *Manager {
	return &Manager{
		sessions:   make(map[string]*Session),
		maxHistory: maxHistory,
		timeout:    timeout,
	}
}

// CreateSession generates a new session with a unique ID.
// WHY crypto/rand? Session IDs are exposed in API responses.
// Predictable IDs (auto-increment, UUID v1) let attackers guess
// other users' sessions. Crypto-random hex is unguessable.
func (m *Manager) CreateSession() *Session {
	m.mu.Lock()
	defer m.mu.Unlock()

	id := generateSessionID()
	now := time.Now()

	session := &Session{
		ID:           id,
		Messages:     make([]model.ChatMessage, 0),
		CreatedAt:    now,
		LastActiveAt: now,
		Metadata:     make(map[string]string),
	}

	m.sessions[id] = session
	log.Printf("[SESSION] Created session %s", id)
	return session
}

// GetSession retrieves a session by ID.
// WHY update LastActiveAt? This implements "sliding expiry" — the
// timeout resets every time the user sends a message. A 30-minute
// timeout means 30 minutes of INACTIVITY, not 30 minutes total.
func (m *Manager) GetSession(id string) (*Session, error) {
	m.mu.RLock()
	session, exists := m.sessions[id]
	m.mu.RUnlock()

	if !exists {
		return nil, fmt.Errorf("session %q not found", id)
	}

	// Update last active time (sliding expiry)
	m.mu.Lock()
	session.LastActiveAt = time.Now()
	m.mu.Unlock()

	return session, nil
}

// AddMessage appends a message to a session and trims if needed.
// WHY trim here (not in GetHistory)? Trimming on write prevents
// unbounded memory growth. If we only trimmed on read, a session
// with 10,000 messages would use memory even though we only ever
// send the last 50 to the AI. Swiggy learned this the hard way
// when a bot test session grew to 50MB.
func (m *Manager) AddMessage(sessionID string, msg model.ChatMessage) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	session, exists := m.sessions[sessionID]
	if !exists {
		return fmt.Errorf("session %q not found", sessionID)
	}

	// Set timestamp if not already set
	if msg.Timestamp.IsZero() {
		msg.Timestamp = time.Now()
	}

	session.Messages = append(session.Messages, msg)
	session.LastActiveAt = time.Now()

	// ──────────────────────────────────────────────────────────────
	// Context window trimming
	// ──────────────────────────────────────────────────────────────
	// WHY trim from the front? Newer messages are more relevant.
	// The AI needs to know the recent context ("I asked about order
	// SWG-12345") more than what happened 40 messages ago. This is
	// how all major AI APIs handle context windows.
	if len(session.Messages) > m.maxHistory {
		// Keep the last maxHistory messages
		excess := len(session.Messages) - m.maxHistory
		session.Messages = session.Messages[excess:]
		log.Printf("[SESSION] Trimmed %d old messages from session %s", excess, sessionID)
	}

	return nil
}

// DeleteSession removes a session from memory.
// WHY explicit delete? Some sessions should end immediately
// (user clicks "End Chat"). Without this, the session would
// linger until the cleanup goroutine runs.
func (m *Manager) DeleteSession(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.sessions[id]; !exists {
		return fmt.Errorf("session %q not found", id)
	}

	delete(m.sessions, id)
	log.Printf("[SESSION] Deleted session %s", id)
	return nil
}

// GetHistory returns the last N messages for building the AI context window.
// WHY a separate method? The handler needs a SLICE of messages for
// the AI — not the full session struct. This encapsulates the
// "how much context to send" decision.
func (m *Manager) GetHistory(id string, lastN int) ([]model.ChatMessage, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	session, exists := m.sessions[id]
	if !exists {
		return nil, fmt.Errorf("session %q not found", id)
	}

	msgs := session.Messages
	if lastN > 0 && lastN < len(msgs) {
		msgs = msgs[len(msgs)-lastN:]
	}

	// Return a copy to prevent concurrent modification
	result := make([]model.ChatMessage, len(msgs))
	copy(result, msgs)
	return result, nil
}

// CleanupExpired removes sessions that have been inactive longer
// than the configured timeout.
// WHY run periodically? Swiggy handles millions of support sessions.
// Without cleanup, the in-memory map grows forever. This goroutine
// acts like a garbage collector for conversations.
func (m *Manager) CleanupExpired() int {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now()
	cleaned := 0

	for id, session := range m.sessions {
		if now.Sub(session.LastActiveAt) > m.timeout {
			delete(m.sessions, id)
			cleaned++
		}
	}

	if cleaned > 0 {
		log.Printf("[SESSION] Cleaned up %d expired sessions", cleaned)
	}
	return cleaned
}

// CleanupLoop runs CleanupExpired at the given interval until ctx is cancelled.
// WHY a loop (not a one-shot)? Sessions expire continuously. A
// single cleanup at startup does nothing. The loop runs every minute
// (configurable), keeping memory usage bounded. This is the same
// pattern Redis uses for lazy key expiration.
func (m *Manager) CleanupLoop(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("[SESSION] Cleanup loop stopped")
			return
		case <-ticker.C:
			m.CleanupExpired()
		}
	}
}

// SessionCount returns the number of active sessions (for monitoring).
func (m *Manager) SessionCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.sessions)
}

// ──────────────────────────────────────────────────────────────
// Helper — generate a crypto-random session ID
// ──────────────────────────────────────────────────────────────

func generateSessionID() string {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		// Fallback to timestamp-based ID (should never happen)
		return fmt.Sprintf("session-%d", time.Now().UnixNano())
	}
	return "ses-" + hex.EncodeToString(bytes)
}
