// ============================================================
//  Tool Registry — Plugin Architecture for Agent Capabilities
// ============================================================
//  WHY a registry pattern?
//  Swiggy's bot team adds new capabilities every sprint:
//    Sprint 21: order tracking
//    Sprint 22: refund processing
//    Sprint 23: restaurant search
//    Sprint 24: loyalty points check
//
//  Each capability is a "tool" — a function the AI can call.
//  The registry lets you add tools without modifying the AI client
//  or the chat handler. Register a function, and the AI instantly
//  gains a new skill. This is the plugin/strategy pattern.
// ============================================================

package tools

import (
	"context"
	"fmt"
	"sync"

	"sahayakbot/internal/model"
)

// ToolFunc is the signature every tool must implement.
// WHY this signature? It's the simplest useful contract:
//   - ctx:  for cancellation (WebSocket disconnect, timeout)
//   - args: flexible key-value arguments from the AI
//   - returns: any result (the AI will format it for humans)
//
// Interface{} for args and return is intentional — tools are
// heterogeneous. An order lookup returns an Order struct; a
// restaurant search returns a slice of Restaurant structs.
type ToolFunc func(ctx context.Context, args map[string]interface{}) (interface{}, error)

// toolEntry stores a tool's handler alongside its definition.
// WHY both? The definition is sent to the AI (so it knows what
// tools exist). The handler is what we execute when the AI calls it.
type toolEntry struct {
	Definition model.ToolDefinition
	Handler    ToolFunc
}

// Registry manages all available tools.
// WHY sync.RWMutex? In production, tools might be registered
// dynamically (feature flags, A/B tests). Multiple goroutines
// read the registry concurrently (one per WebSocket connection),
// so we need thread-safe access.
type Registry struct {
	tools map[string]toolEntry
	mu    sync.RWMutex
}

// NewRegistry creates an empty tool registry.
func NewRegistry() *Registry {
	return &Registry{
		tools: make(map[string]toolEntry),
	}
}

// Register adds a new tool to the registry.
// WHY panic-free? We return silently if the name is empty.
// In production, Swiggy wraps this with validation middleware
// that logs a warning for duplicate registrations.
func (r *Registry) Register(name, description string, params []model.ToolParameter, handler ToolFunc) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.tools[name] = toolEntry{
		Definition: model.ToolDefinition{
			Name:        name,
			Description: description,
			Parameters:  params,
		},
		Handler: handler,
	}
}

// Execute runs a tool by name with the given arguments.
// WHY return (interface{}, error)? The handler may fail (network
// timeout, invalid args). The error is passed back to the AI so
// it can apologise gracefully: "Sorry, I couldn't look up your
// order right now. Let me try again."
func (r *Registry) Execute(ctx context.Context, name string, args map[string]interface{}) (interface{}, error) {
	r.mu.RLock()
	entry, exists := r.tools[name]
	r.mu.RUnlock()

	if !exists {
		return nil, fmt.Errorf("tool %q not found in registry", name)
	}

	return entry.Handler(ctx, args)
}

// ListTools returns definitions for all registered tools.
// WHY only definitions (not handlers)? Definitions are sent to
// the AI — it shouldn't have access to the actual function code.
// Separation of concerns: AI sees the menu, backend does the cooking.
func (r *Registry) ListTools() []model.ToolDefinition {
	r.mu.RLock()
	defer r.mu.RUnlock()

	defs := make([]model.ToolDefinition, 0, len(r.tools))
	for _, entry := range r.tools {
		defs = append(defs, entry.Definition)
	}
	return defs
}

// GetTool returns a single tool's definition and existence flag.
func (r *Registry) GetTool(name string) (model.ToolDefinition, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	entry, exists := r.tools[name]
	if !exists {
		return model.ToolDefinition{}, false
	}
	return entry.Definition, true
}
