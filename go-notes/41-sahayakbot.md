# Chapter 41 — SahayakBot: AI Conversational Agent
## *The Intelligent Customer Support Agent*

> **Sahayak** (सहायक) = Helper / Assistant &nbsp;|&nbsp; **Bot** = Automated Agent
>
> Every minute, Swiggy's customer support handles 10,000+ queries — "Where is
> my biryani?", "I want a refund for cold food", "Find me good South Indian
> restaurants near Koramangala." SahayakBot is the AI-powered agent that
> understands intent, calls the right internal tools (order lookup, refund
> processing, restaurant search), and maintains conversation memory so users
> never have to repeat themselves.

---

## Why This Chapter?

Conversational AI agents are the fastest-growing pattern in modern backend
systems. Unlike simple request-response APIs, an AI agent must:

1. **Understand intent** from natural language
2. **Decide which tools to call** (function calling / tool use)
3. **Execute tools** and feed results back to the AI
4. **Maintain memory** across a conversation session
5. **Communicate in real-time** via WebSocket

This chapter builds a production-style AI agent that teaches:

| Concern | Tool | Why |
|---|---|---|
| Routing | Chi | Lightweight, `net/http` compatible, middleware-first |
| Real-time Chat | WebSocket (gorilla) | Bidirectional, persistent connection |
| AI Reasoning | Gemini (simulated) | Function calling / tool use pattern |
| Memory | Session Manager | Context windows, conversation history |
| Tool Execution | Tool Registry | Plugin-style architecture for agent capabilities |

---

## Core Concepts

### 1. AI Function Calling / Tool Use Pattern

Modern LLMs don't just generate text — they can decide to **call functions**.
The pattern works like a conversation loop:

```
User: "Where is my order #12345?"
         │
         ▼
┌─────────────────────┐
│   AI (Gemini)       │ ← Receives user message + tool definitions
│   Analyzes intent   │
│   Decides: I need   │
│   check_order_status│
└────────┬────────────┘
         │ ToolCall: check_order_status(order_id: "12345")
         ▼
┌─────────────────────┐
│   Tool Executor     │ ← Runs the actual function
│   Looks up order    │
│   Returns status    │
└────────┬────────────┘
         │ ToolResult: {status: "Out for Delivery", eta: "12 mins"}
         ▼
┌─────────────────────┐
│   AI (Gemini)       │ ← Receives tool result
│   Formats response  │
│   for the user      │
└─────────────────────┘
         │
         ▼
Bot: "Your order #12345 (Biryani from Paradise) is out for delivery!
      Estimated arrival: 12 minutes. Your delivery partner Rahul is
      on the way."
```

**Key insight:** The AI doesn't execute tools directly. It *requests* tool
calls, and our backend executes them. This separation is critical for security
— the AI never has direct database access.

### 2. The Tool Execution Loop

The core of any AI agent is the **tool loop**:

```
while tool_calls_remaining and iterations < MAX:
    response = AI.chat(messages, available_tools)
    if response.has_tool_calls:
        for each tool_call in response.tool_calls:
            result = registry.execute(tool_call)
            messages.append(tool_result)
        continue  ← ask AI to process results
    else:
        return response.text  ← final answer
```

**Why a max iteration limit?** Without it, a confused AI could loop forever:
- Call tool A → result suggests calling tool B → tool B suggests tool A → ...
- Swiggy caps this at 3 iterations (configurable via `MAX_TOOL_CALLS`)

### 3. WebSocket for Real-Time Chat

HTTP is request-response: client asks, server answers, connection closes.
Chat needs something better:

```
HTTP (Traditional):
Client ──POST──→ Server    (new connection each message)
Client ←──200──  Server    (connection closes)

WebSocket (SahayakBot):
Client ──Upgrade──→ Server    (one-time handshake)
Client ←──────────→ Server    (persistent bidirectional channel)
  │                    │
  │  "where is order?" │
  │ ──────────────────→│
  │                    │ (AI thinks, calls tools...)
  │  "Your biryani is" │
  │ ←──────────────────│
  │                    │
  │  "get me a refund" │
  │ ──────────────────→│
  │   ...              │
```

**Why WebSocket over HTTP for chat?**
- No connection overhead per message
- Server can push updates (tool execution progress)
- Natural fit for conversation flow
- Ping/pong keeps connection alive

### 4. Session Memory Management

An AI without memory is useless for support:

```
Without Memory:
User: "Check order #12345"
Bot:  "Your biryani is out for delivery!"
User: "Cancel it"
Bot:  "Cancel what? I don't have any context."  ← BAD

With Session Memory:
User: "Check order #12345"
Bot:  "Your biryani is out for delivery!"
User: "Cancel it"
Bot:  "I'll cancel order #12345 for you."       ← GOOD (remembers context)
```

**Context window management:**
- Sessions store message history
- Only the last N messages are sent to the AI (context window)
- Old messages are trimmed to stay within token limits
- Session timeout cleans up inactive conversations

### 5. Tool Definition and Execution

Tools are defined with a schema that tells the AI what's available:

```json
{
  "name": "check_order_status",
  "description": "Check the current status of a Swiggy order",
  "parameters": [
    {"name": "order_id", "type": "string", "description": "The order ID", "required": true}
  ]
}
```

The AI reads these definitions and decides which tool to call based on user
intent. This is the **plugin architecture** pattern — new tools can be added
without changing the AI logic.

### 6. Error Handling in AI Agents

AI agents have unique error scenarios:

| Error | Handling |
|---|---|
| Tool not found | Return friendly "I can't do that" message |
| Tool execution fails | Inform AI of failure, let it apologize gracefully |
| AI returns invalid tool call | Log, skip, respond with fallback |
| Max iterations exceeded | Break loop, return partial response |
| Session expired | Create new session, inform user |
| WebSocket disconnect | Clean up session, log |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     SahayakBot                          │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────────┐ │
│  │  HTTP     │  │WebSocket │  │   Session Manager     │ │
│  │  Handler  │  │ Handler  │  │   (memory store)      │ │
│  └─────┬─────┘  └────┬─────┘  └──────────┬────────────┘ │
│        │              │                   │              │
│        └──────┬───────┘                   │              │
│               ▼                           │              │
│  ┌────────────────────────┐               │              │
│  │   Gemini AI Client     │◄──────────────┘              │
│  │   (intent detection)   │                              │
│  └───────────┬────────────┘                              │
│              │ tool calls                                │
│              ▼                                           │
│  ┌────────────────────────┐                              │
│  │   Tool Registry        │                              │
│  │   ┌─────────────────┐  │                              │
│  │   │ check_order     │  │                              │
│  │   │ process_refund  │  │                              │
│  │   │ find_restaurants│  │                              │
│  │   │ get_delivery_eta│  │                              │
│  │   └─────────────────┘  │                              │
│  └────────────────────────┘                              │
└─────────────────────────────────────────────────────────┘
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/chat` | HTTP chat (request-response) |
| `GET` | `/ws/chat` | WebSocket chat (real-time) |
| `POST` | `/api/sessions` | Create new session |
| `GET` | `/api/sessions/{id}` | Get session history |
| `DELETE` | `/api/sessions/{id}` | End session |
| `GET` | `/api/tools` | List available tools |
| `GET` | `/health` | Health check |

---

## Example Conversations

### Order Tracking
```
User: "Where is my order SWG-98765?"
Bot:  [calls check_order_status] →
      "Your order from Paradise Biryani is currently being prepared!
       Estimated delivery: 25 minutes. I'll keep you posted."
```

### Refund Flow
```
User: "The paneer was cold and stale. I want my money back."
Bot:  [calls process_refund] →
      "I'm sorry about that! I've initiated a refund of ₹349 for your
       order. It'll be credited to your account within 2-3 business days.
       Refund ID: REF-44521."
```

### Restaurant Discovery
```
User: "I'm hungry. What's good for South Indian food near Indiranagar?"
Bot:  [calls find_restaurants] →
      "Here are some great South Indian spots near Indiranagar:
       1. MTR — ⭐ 4.6, 20 min delivery
       2. Vidyarthi Bhavan — ⭐ 4.5, 25 min
       3. Mavalli Tiffin Rooms — ⭐ 4.4, 30 min
       Shall I help you place an order?"
```

---

## Key Takeaways

1. **AI agents are loops, not single calls** — The tool execution loop
   (AI → tool → AI → tool → response) is the fundamental pattern
2. **Tools are plugins** — Registry pattern lets you add capabilities
   without changing AI logic
3. **Memory is essential** — Session management turns a chatbot into a
   useful assistant
4. **WebSocket fits chat** — Persistent connections eliminate per-message
   overhead
5. **Always cap iterations** — Prevent infinite tool-calling loops
6. **Simulate first, integrate later** — Build the full pipeline with
   simulated AI, swap in real API when ready

---

## Running the Project

```bash
# Without API key (simulated mode)
cd 41-sahayakbot
go run main.go

# With Gemini API key
GEMINI_API_KEY=your-key-here go run main.go

# Docker
docker compose up --build
```

```bash
# Test HTTP chat
curl -X POST http://localhost:8085/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Where is my order SWG-12345?"}'

# Test WebSocket (using websocat or similar)
websocat ws://localhost:8085/ws/chat
> {"message": "Find me good biryani places"}
```
