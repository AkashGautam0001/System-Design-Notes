"""
============================================================
FILE 15: BACKGROUND TASKS, WEBSOCKETS, TESTING, AND DEPLOYMENT
============================================================
Topics: BackgroundTasks, WebSocket, SSE, TestClient, pytest,
        dependency overrides, async testing, Alembic, Docker,
        docker-compose, production checklist, deployment

WHY THIS MATTERS:
Shipping an API is more than writing endpoints. You need
background jobs (emails, notifications), real-time features
(WebSockets), automated tests (CI/CD), and deployment config
(Docker). This file covers the "last mile" to production.
============================================================
"""

# STORY: Hotstar (JioCinema) — Live Cricket Push to 50M Users
# During IPL 2023, Hotstar (now JioCinema) served 50M+ concurrent
# viewers — a world record for live streaming. Every six, wicket,
# and boundary triggers push notifications to millions of devices.
# This requires background tasks (send notifications without
# blocking the API), WebSockets (real-time score updates), and
# rock-solid deployment (zero downtime during India vs Pakistan).
# Their test suite runs thousands of checks before each deploy.

from typing import Optional, List
from datetime import datetime, timezone
import asyncio
import json

from fastapi import (
    FastAPI, BackgroundTasks, WebSocket, WebSocketDisconnect,
    Depends, HTTPException, Query, status
)
from fastapi.responses import StreamingResponse, HTMLResponse
from fastapi.testclient import TestClient
from pydantic import BaseModel

# ════════════════════════════════════════════════════════════
# SECTION 1 — Background Tasks
# ════════════════════════════════════════════════════════════

# WHY: When a user places an order, you need to send a
# confirmation email, update inventory, and notify the seller.
# These should NOT block the API response. Background tasks
# run AFTER the response is sent.

app = FastAPI(
    title="Hotstar/JioCinema API",
    description="Live sports, notifications, and real-time features",
    version="1.0.0",
)

# --- Simple background task: log to file ---

def write_log(message: str):
    """
    A background task function — runs after the response is sent.
    It is a regular function (not async), so it runs in a thread pool.
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    with open("/tmp/hotstar_api.log", "a") as f:
        f.write(f"[{timestamp}] {message}\n")


def send_notification(user_id: int, title: str, body: str):
    """
    Simulate sending a push notification.
    In production, this would call Firebase Cloud Messaging
    or Apple Push Notification Service.
    """
    import time
    time.sleep(0.1)  # Simulate network call
    write_log(f"Notification sent to user {user_id}: {title}")


def update_match_stats(match_id: int, event: str):
    """
    Update match statistics after a cricket event.
    This is a CPU-light but I/O-heavy operation — perfect
    for background tasks.
    """
    write_log(f"Match {match_id} stats updated: {event}")


# --- Endpoints with background tasks ---

@app.post("/matches/{match_id}/events")
def record_match_event(
    match_id: int,
    event_type: str = Query(..., enum=["six", "four", "wicket", "century"]),
    player: str = Query(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    """
    Record a cricket match event (six, wicket, etc.).
    Returns immediately, then:
    1. Sends push notifications to subscribed users
    2. Updates match statistics
    3. Logs the event
    """
    # Add background tasks — they run AFTER response is sent
    background_tasks.add_task(
        send_notification,
        user_id=0,  # Broadcast to all
        title=f"{event_type.upper()}!",
        body=f"{player} hits a {event_type}!",
    )
    background_tasks.add_task(update_match_stats, match_id, event_type)
    background_tasks.add_task(write_log, f"Event: {player} - {event_type}")

    # Response is sent IMMEDIATELY — tasks run in background
    return {
        "status": "event_recorded",
        "match_id": match_id,
        "event": event_type,
        "player": player,
        "message": "Notifications being sent in background",
    }


# --- Background tasks with dependencies ---

def get_notification_service():
    """Dependency that provides a notification service."""
    return {"service": "firebase", "api_key": "fcm-key-123"}


@app.post("/users/{user_id}/subscribe")
def subscribe_to_match(
    user_id: int,
    match_id: int,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    notif_service: dict = Depends(get_notification_service),
):
    """Subscribe a user to match notifications."""
    # Background task can use dependency values
    background_tasks.add_task(
        write_log,
        f"User {user_id} subscribed to match {match_id} "
        f"via {notif_service['service']}",
    )
    return {"user_id": user_id, "match_id": match_id, "subscribed": True}


# ════════════════════════════════════════════════════════════
# SECTION 2 — WebSocket Basics
# ════════════════════════════════════════════════════════════

# WHY: HTTP is request-response — the client asks, server answers.
# WebSockets are bidirectional — the server can PUSH data to the
# client at any time. Essential for live scores, chat, and
# real-time dashboards.

# --- Simple WebSocket endpoint ---

@app.websocket("/ws/echo")
async def websocket_echo(websocket: WebSocket):
    """
    Simple echo WebSocket — sends back whatever it receives.
    Test with: websocat ws://localhost:8000/ws/echo
    """
    await websocket.accept()
    try:
        while True:
            # Wait for a message from the client
            data = await websocket.receive_text()
            # Send it back
            await websocket.send_text(f"Echo: {data}")
    except WebSocketDisconnect:
        print("Client disconnected from echo")


# --- WebSocket with JSON data ---

@app.websocket("/ws/score/{match_id}")
async def websocket_live_score(websocket: WebSocket, match_id: int):
    """
    Live score WebSocket — sends match updates as JSON.
    Client connects and receives score updates in real time.
    """
    await websocket.accept()
    try:
        # Send initial match state
        await websocket.send_json({
            "type": "match_state",
            "match_id": match_id,
            "team1": "India",
            "team2": "Australia",
            "score": "156/3",
            "overs": "18.2",
        })

        while True:
            # Wait for client messages (e.g., "get_stats", "subscribe_events")
            data = await websocket.receive_json()
            command = data.get("command", "")

            if command == "get_stats":
                await websocket.send_json({
                    "type": "stats",
                    "run_rate": 8.5,
                    "required_rate": 9.2,
                    "fours": 12,
                    "sixes": 5,
                })
            elif command == "ping":
                await websocket.send_json({"type": "pong"})
            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown command: {command}",
                })

    except WebSocketDisconnect:
        print(f"Client disconnected from match {match_id}")


# ════════════════════════════════════════════════════════════
# SECTION 3 — Broadcasting to Multiple Clients
# ════════════════════════════════════════════════════════════

# WHY: When Virat Kohli hits a six, ALL connected clients need
# the update — not just one. A ConnectionManager tracks all
# active WebSocket connections and broadcasts to all of them.

class ConnectionManager:
    """
    Manages active WebSocket connections.
    Supports broadcasting to all connected clients.
    """

    def __init__(self):
        # Dictionary of match_id -> list of WebSocket connections
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, match_id: int):
        """Accept connection and add to the match room."""
        await websocket.accept()
        if match_id not in self.active_connections:
            self.active_connections[match_id] = []
        self.active_connections[match_id].append(websocket)
        count = len(self.active_connections[match_id])
        print(f"Client connected to match {match_id}. Total: {count}")

    def disconnect(self, websocket: WebSocket, match_id: int):
        """Remove connection from the match room."""
        if match_id in self.active_connections:
            self.active_connections[match_id].remove(websocket)
            if not self.active_connections[match_id]:
                del self.active_connections[match_id]

    async def broadcast(self, match_id: int, message: dict):
        """Send a message to ALL clients watching a match."""
        if match_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[match_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    disconnected.append(connection)
            # Clean up dead connections
            for conn in disconnected:
                self.active_connections[match_id].remove(conn)

    def get_viewer_count(self, match_id: int) -> int:
        """Get number of viewers for a match."""
        return len(self.active_connections.get(match_id, []))


# Global connection manager instance
manager = ConnectionManager()


@app.websocket("/ws/live/{match_id}")
async def websocket_live(websocket: WebSocket, match_id: int):
    """
    Live match WebSocket with broadcasting.
    All clients connected to the same match_id receive updates.
    """
    await manager.connect(websocket, match_id)
    try:
        # Notify everyone about new viewer
        await manager.broadcast(match_id, {
            "type": "viewer_count",
            "count": manager.get_viewer_count(match_id),
        })

        while True:
            # Receive messages from this client
            data = await websocket.receive_json()

            # If an admin sends a score update, broadcast to all
            if data.get("type") == "score_update":
                await manager.broadcast(match_id, {
                    "type": "score_update",
                    "score": data.get("score"),
                    "overs": data.get("overs"),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })

    except WebSocketDisconnect:
        manager.disconnect(websocket, match_id)
        await manager.broadcast(match_id, {
            "type": "viewer_count",
            "count": manager.get_viewer_count(match_id),
        })


# ════════════════════════════════════════════════════════════
# SECTION 4 — Server-Sent Events (SSE)
# ════════════════════════════════════════════════════════════

# WHY: SSE is simpler than WebSockets — server pushes data,
# client just listens. Perfect for live scores, stock tickers,
# and notification feeds. Works with regular HTTP (no upgrade).

async def score_event_generator(match_id: int):
    """
    Async generator that yields SSE-formatted events.
    The client receives these as a stream.
    """
    scores = [
        {"score": "0/0", "overs": "0.0", "event": "Match started"},
        {"score": "18/0", "overs": "1.4", "event": "FOUR! Cover drive"},
        {"score": "24/1", "overs": "2.1", "event": "WICKET! Caught behind"},
    ]
    for score_data in scores:
        # SSE format: "data: {json}\n\n"
        yield f"data: {json.dumps(score_data)}\n\n"
        await asyncio.sleep(1)  # Simulate time between events

    # Final event
    yield f"data: {json.dumps({'event': 'stream_ended'})}\n\n"


@app.get("/sse/score/{match_id}")
async def sse_live_score(match_id: int):
    """
    Server-Sent Events endpoint for live match scores.
    Client uses EventSource API in JavaScript:
      const source = new EventSource('/sse/score/1');
      source.onmessage = (e) => console.log(JSON.parse(e.data));
    """
    return StreamingResponse(
        score_event_generator(match_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


# ════════════════════════════════════════════════════════════
# SECTION 5 — Testing with TestClient
# ════════════════════════════════════════════════════════════

# WHY: Without tests, every code change risks breaking existing
# features. Hotstar runs thousands of tests before each deploy.
# FastAPI's TestClient makes it easy to write tests.

# --- Create a test app for isolated testing ---

test_app = FastAPI()


@test_app.get("/health")
def test_health():
    return {"status": "healthy"}


@test_app.get("/matches/{match_id}")
def test_get_match(match_id: int):
    if match_id == 999:
        raise HTTPException(status_code=404, detail="Match not found")
    return {
        "match_id": match_id,
        "team1": "India",
        "team2": "Pakistan",
        "status": "live",
    }


@test_app.post("/matches")
def test_create_match(team1: str, team2: str):
    return {
        "match_id": 1,
        "team1": team1,
        "team2": team2,
        "status": "scheduled",
    }


# --- Writing tests with TestClient ---

def run_tests():
    """
    Demonstrates how to test FastAPI endpoints.
    In a real project, these would be in tests/ directory
    and run with: pytest tests/
    """
    client = TestClient(test_app)

    # Test 1: Health check
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    print("Test 1 PASSED: Health check")

    # Test 2: Get match by ID
    response = client.get("/matches/42")
    assert response.status_code == 200
    data = response.json()
    assert data["match_id"] == 42
    assert data["team1"] == "India"
    print("Test 2 PASSED: Get match")

    # Test 3: Match not found (404)
    response = client.get("/matches/999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
    print("Test 3 PASSED: Match not found 404")

    # Test 4: Create match
    response = client.post("/matches?team1=India&team2=Australia")
    assert response.status_code == 200
    data = response.json()
    assert data["team1"] == "India"
    assert data["team2"] == "Australia"
    assert data["status"] == "scheduled"
    print("Test 4 PASSED: Create match")

    print("\nAll tests passed!")


# ════════════════════════════════════════════════════════════
# SECTION 6 — Testing with Dependency Overrides
# ════════════════════════════════════════════════════════════

# WHY: In tests, you do not want to hit the real database,
# send real emails, or require real authentication. Dependency
# overrides swap real dependencies with test doubles.

# --- App with dependency to override ---

dep_test_app = FastAPI()


def get_current_viewer():
    """Real dependency — would verify JWT in production."""
    return {"viewer_id": 1, "plan": "premium"}


@dep_test_app.get("/my-matches")
def my_matches(viewer: dict = Depends(get_current_viewer)):
    """Returns matches for the current viewer."""
    return {
        "viewer": viewer,
        "matches": [
            {"id": 1, "title": "IND vs AUS"},
            {"id": 2, "title": "IND vs ENG"},
        ],
    }


def test_with_override():
    """Test with dependency override — no real auth needed."""
    # Override the real dependency with a fake one
    def fake_viewer():
        return {"viewer_id": 999, "plan": "free"}

    dep_test_app.dependency_overrides[get_current_viewer] = fake_viewer

    client = TestClient(dep_test_app)
    response = client.get("/my-matches")
    assert response.status_code == 200
    data = response.json()
    assert data["viewer"]["viewer_id"] == 999
    assert data["viewer"]["plan"] == "free"
    print("Override test PASSED: Dependency override works")

    # Clean up
    dep_test_app.dependency_overrides.clear()


# --- WebSocket testing ---

def test_websocket():
    """Test WebSocket endpoints with TestClient."""
    client = TestClient(app)
    with client.websocket_connect("/ws/echo") as websocket:
        websocket.send_text("Hello Hotstar!")
        data = websocket.receive_text()
        assert data == "Echo: Hello Hotstar!"
        print("WebSocket test PASSED: Echo works")


# ════════════════════════════════════════════════════════════
# SECTION 7 — Alembic Database Migrations
# ════════════════════════════════════════════════════════════

# WHY: You cannot DROP and recreate tables in production — you
# would lose all data. Alembic tracks schema changes (add column,
# rename table) and applies them incrementally.

# --- Alembic Setup ---
#
# pip install alembic && alembic init alembic
#
# Configure alembic/env.py:
#   from sqlmodel import SQLModel
#   target_metadata = SQLModel.metadata
#
# Common commands:
#   alembic revision --autogenerate -m "add reviews table"
#   alembic upgrade head      # Apply all pending migrations
#   alembic downgrade -1      # Rollback one migration
#   alembic current           # See current version
#   alembic history           # See all migrations


# ════════════════════════════════════════════════════════════
# SECTION 8 — Docker and Docker Compose
# ════════════════════════════════════════════════════════════

# WHY: "Works on my machine" is not deployment. Docker packages
# your app with all dependencies so it runs identically on any
# server. Docker Compose adds the database, Redis, etc.

# --- Dockerfile for FastAPI ---
#
# FROM python:3.11-slim
# WORKDIR /app
# COPY requirements.txt .
# RUN pip install --no-cache-dir -r requirements.txt
# COPY . .
# EXPOSE 8000
# CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]

# --- docker-compose.yml ---
#
# services:
#   api:
#     build: .
#     ports: ["8000:8000"]
#     environment:
#       - DATABASE_URL=postgresql://user:pass@db:5432/hotstar
#       - REDIS_URL=redis://redis:6379
#     depends_on: [db, redis]
#   db:
#     image: postgres:15-alpine
#     environment:
#       - POSTGRES_USER=user
#       - POSTGRES_PASSWORD=pass
#       - POSTGRES_DB=hotstar
#   redis:
#     image: redis:7-alpine
#
# Commands: docker-compose up -d | docker-compose down


# ════════════════════════════════════════════════════════════
# SECTION 9 — Production Checklist and Deployment
# ════════════════════════════════════════════════════════════

# WHY: Deploying to production requires more than just running
# uvicorn. Security, performance, monitoring, and reliability
# all need attention.

# --- Production Checklist ---
#
# SECURITY:
# [ ] HTTPS enabled (TLS via Let's Encrypt)
# [ ] CORS configured with specific origins (not "*")
# [ ] JWT secret is a strong random string (32+ chars)
# [ ] Passwords hashed with bcrypt
# [ ] Rate limiting enabled
# [ ] Input validation on all endpoints (Pydantic)
# [ ] Secrets in environment variables, not code
#
# PERFORMANCE:
# [ ] Database connection pooling
# [ ] GZip compression enabled
# [ ] Pagination on all list endpoints
# [ ] Background tasks for slow operations
#
# RELIABILITY:
# [ ] Health check endpoint (/health)
# [ ] Structured logging (JSON format)
# [ ] Error tracking (Sentry)
# [ ] Database migrations (Alembic)
# [ ] Automated tests in CI/CD pipeline
# [ ] Docker for reproducible deployments

# --- Deployment Options ---
# 1. Railway — one-click deploy, free tier, auto HTTPS
# 2. Render — git-push deploy, managed PostgreSQL
# 3. AWS (EC2 + RDS) — full control, auto-scaling (Hotstar level)
# 4. DigitalOcean App Platform — simple, affordable
# 5. Google Cloud Run — serverless, pay per request

# --- uvicorn production command ---
#
# uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
#
# Or use gunicorn with uvicorn workers:
# gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000


# --- HTML page for testing WebSockets ---

@app.get("/ws-test", response_class=HTMLResponse)
def websocket_test_page():
    """Serve a simple HTML page to test WebSocket connections."""
    return """
    <!DOCTYPE html>
    <html><head><title>Live Score Test</title></head>
    <body>
    <h1>WebSocket Test</h1>
    <div id="messages"></div>
    <input id="msg" type="text"><button onclick="sendMsg()">Send</button>
    <script>
    var ws = new WebSocket("ws://localhost:8000/ws/echo");
    ws.onmessage = function(e) {
        document.getElementById("messages").innerHTML += "<p>"+e.data+"</p>";
    };
    function sendMsg() {
        var i = document.getElementById("msg"); ws.send(i.value); i.value = "";
    }
    </script>
    </body></html>
    """


# ════════════════════════════════════════════════════════════
# KEY TAKEAWAYS
# ════════════════════════════════════════════════════════════
# 1. BackgroundTasks run AFTER the response — use for emails, logs, notifications
# 2. WebSockets enable bidirectional real-time communication
# 3. ConnectionManager pattern tracks and broadcasts to multiple clients
# 4. SSE (StreamingResponse) is simpler than WebSockets for server-to-client push
# 5. TestClient lets you test endpoints without running the server
# 6. dependency_overrides swaps real deps for fakes in tests
# 7. Alembic manages database schema changes without data loss
# 8. Docker + docker-compose gives reproducible multi-service deployments
# "First, solve the problem. Then, write the code." — John Johnson
