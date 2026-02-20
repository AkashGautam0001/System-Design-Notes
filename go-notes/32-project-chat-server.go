// ============================================================
//  FILE 32 : Project — Chat Server ("NukkadChat")
// ============================================================
//  Topic  : net, bufio, fmt, sync, strings, time,
//           context, goroutines, TCP networking
//
//  WHY THIS MATTERS:
//  A TCP chat server is the classic concurrency exercise that
//  combines networking, goroutines, synchronization, and
//  protocol design into one project. It forces you to think
//  about shared state (client list), fan-out (broadcasting),
//  and graceful shutdown — the exact skills needed for any
//  networked Go service.
// ============================================================

// ============================================================
// STORY: NukkadChat — The Mohalla Intercom
// The mohalla (neighbourhood) has grown so large that shouting
// across the gali no longer works. The residents install
// NukkadChat: a TCP messaging system for the neighbourhood.
// Each house connects as a client. Messages broadcast to all
// residents. Private messages (/msg) go point-to-point.
// Nicknames (/nick) replace boring "resident-1" labels.
// When the evening chai session ends, the pradhan (context)
// shuts everything down gracefully — no dangling connections,
// no lost messages.
// ============================================================

package main

import (
	"bufio"
	"context"
	"fmt"
	"net"
	"strings"
	"sync"
	"time"
)

// ============================================================
// SECTION 1 — Client Model
// ============================================================
// WHY: Each connected resident needs an identity (nickname), a
// send channel (outgoing messages), and a connection reference.
// The channel decouples "deciding what to send" from "actually
// writing bytes," preventing one slow resident from blocking all.

// Client represents a single connected mohalla resident.
type Client struct {
	Conn     net.Conn
	Nickname string
	Send     chan string
	JoinedAt time.Time
}

// ============================================================
// SECTION 2 — Chat Server
// ============================================================
// WHY: The server owns the client registry and routes messages.
// sync.RWMutex protects the map so broadcasts (reads) don't
// block each other, but joins/leaves (writes) are serialized.

// ChatServer manages all connected residents.
type ChatServer struct {
	mu       sync.RWMutex
	clients  map[*Client]bool
	listener net.Listener
	nextID   int
}

// NewChatServer creates a server bound to the given address.
func NewChatServer(addr string) (*ChatServer, error) {
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return nil, fmt.Errorf("listen: %w", err)
	}
	return &ChatServer{
		clients:  make(map[*Client]bool),
		listener: ln,
		nextID:   1,
	}, nil
}

// Addr returns the server's listen address (useful for :0 ports).
func (s *ChatServer) Addr() string {
	return s.listener.Addr().String()
}

// Run accepts connections until the context is cancelled.
func (s *ChatServer) Run(ctx context.Context) {
	// WHY: Closing the listener from another goroutine is the
	// idiomatic way to unblock Accept() on shutdown.
	go func() {
		<-ctx.Done()
		s.listener.Close()
	}()

	fmt.Printf("  [Server] Listening on %s\n", s.Addr())

	for {
		conn, err := s.listener.Accept()
		if err != nil {
			select {
			case <-ctx.Done():
				// Expected: context was cancelled, shut down.
				return
			default:
				fmt.Printf("  [Server] Accept error: %v\n", err)
				continue
			}
		}
		go s.handleClient(ctx, conn)
	}
}

// handleClient manages a single resident's lifecycle.
func (s *ChatServer) handleClient(ctx context.Context, conn net.Conn) {
	s.mu.Lock()
	nickname := fmt.Sprintf("resident-%d", s.nextID)
	s.nextID++
	client := &Client{
		Conn:     conn,
		Nickname: nickname,
		Send:     make(chan string, 64), // buffered to avoid blocking broadcasts
		JoinedAt: time.Now(),
	}
	s.clients[client] = true
	s.mu.Unlock()

	fmt.Printf("  [Server] %s joined (addr: %s)\n", client.Nickname, conn.RemoteAddr())
	s.broadcast(fmt.Sprintf("*** %s has joined the mohalla chat ***", client.Nickname), client)

	// Send welcome message.
	client.Send <- fmt.Sprintf("[NukkadChat] Welcome, %s! Commands: /nick <name>, /list, /msg <user> <text>, /quit",
		client.Nickname)

	// Writer goroutine: drains client.Send to the TCP connection.
	// WHY: A dedicated writer lets us decouple message production
	// (broadcasts, private messages) from the actual network write.
	var writerDone sync.WaitGroup
	writerDone.Add(1)
	go func() {
		defer writerDone.Done()
		for msg := range client.Send {
			timestamp := time.Now().Format("15:04:05")
			_, err := fmt.Fprintf(conn, "[%s] %s\n", timestamp, msg)
			if err != nil {
				return
			}
		}
	}()

	// Reader loop: reads lines from the resident and processes commands.
	scanner := bufio.NewScanner(conn)
	for scanner.Scan() {
		select {
		case <-ctx.Done():
			goto cleanup
		default:
		}

		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		if strings.HasPrefix(line, "/") {
			s.handleCommand(client, line)
			if strings.HasPrefix(line, "/quit") {
				goto cleanup
			}
		} else {
			// Regular message — broadcast to all mohalla residents.
			s.broadcast(fmt.Sprintf("%s: %s", client.Nickname, line), client)
		}
	}

cleanup:
	s.removeClient(client)
	close(client.Send) // signals the writer goroutine to exit
	writerDone.Wait()
	conn.Close()
}

// ============================================================
// SECTION 3 — Commands
// ============================================================
// WHY: Chat commands (/nick, /list, /msg, /quit) are the user
// interface. Parsing them from raw text is a micro-protocol —
// the same skill used in Redis RESP, SMTP, or IRC.

func (s *ChatServer) handleCommand(client *Client, line string) {
	parts := strings.SplitN(line, " ", 3)
	cmd := strings.ToLower(parts[0])

	switch cmd {
	case "/nick":
		if len(parts) < 2 || strings.TrimSpace(parts[1]) == "" {
			client.Send <- "[NukkadChat] Usage: /nick <new_name>"
			return
		}
		oldName := client.Nickname
		newName := strings.TrimSpace(parts[1])

		// Check for duplicate nicknames.
		s.mu.RLock()
		for c := range s.clients {
			if c != client && strings.EqualFold(c.Nickname, newName) {
				s.mu.RUnlock()
				client.Send <- fmt.Sprintf("[NukkadChat] Nickname %q is already taken", newName)
				return
			}
		}
		s.mu.RUnlock()

		s.mu.Lock()
		client.Nickname = newName
		s.mu.Unlock()

		client.Send <- fmt.Sprintf("[NukkadChat] You are now known as %s", newName)
		s.broadcast(fmt.Sprintf("*** %s is now known as %s ***", oldName, newName), client)
		fmt.Printf("  [Server] Nickname change: %s -> %s\n", oldName, newName)

	case "/list":
		s.mu.RLock()
		var names []string
		for c := range s.clients {
			tag := ""
			if c == client {
				tag = " (you)"
			}
			names = append(names, fmt.Sprintf("  - %s%s", c.Nickname, tag))
		}
		s.mu.RUnlock()
		client.Send <- fmt.Sprintf("[NukkadChat] Mohalla residents online (%d):\n%s",
			len(names), strings.Join(names, "\n"))

	case "/msg":
		if len(parts) < 3 {
			client.Send <- "[NukkadChat] Usage: /msg <nickname> <message>"
			return
		}
		targetName := parts[1]
		message := parts[2]
		s.mu.RLock()
		var target *Client
		for c := range s.clients {
			if strings.EqualFold(c.Nickname, targetName) {
				target = c
				break
			}
		}
		s.mu.RUnlock()

		if target == nil {
			client.Send <- fmt.Sprintf("[NukkadChat] Resident %q not found", targetName)
			return
		}
		if target == client {
			client.Send <- "[NukkadChat] You can't message yourself"
			return
		}
		target.Send <- fmt.Sprintf("[PM from %s] %s", client.Nickname, message)
		client.Send <- fmt.Sprintf("[PM to %s] %s", target.Nickname, message)
		fmt.Printf("  [Server] PM: %s -> %s\n", client.Nickname, target.Nickname)

	case "/quit":
		client.Send <- "[NukkadChat] Alvida! See you at the nukkad!"
		// handleClient will clean up after we return.

	default:
		client.Send <- fmt.Sprintf("[NukkadChat] Unknown command: %s", cmd)
	}
}

// ============================================================
// SECTION 4 — Broadcast & Cleanup
// ============================================================
// WHY: Broadcast is fan-out over the resident set. We use
// RLock for reads and skip the sender to avoid echo.

func (s *ChatServer) broadcast(msg string, sender *Client) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for client := range s.clients {
		if client != sender {
			// Non-blocking send: drop message if buffer full.
			// WHY: A slow resident should not block the entire server.
			select {
			case client.Send <- msg:
			default:
				fmt.Printf("  [Server] Dropped message for slow resident %s\n", client.Nickname)
			}
		}
	}
}

func (s *ChatServer) removeClient(client *Client) {
	s.mu.Lock()
	delete(s.clients, client)
	s.mu.Unlock()
	s.broadcast(fmt.Sprintf("*** %s has left the mohalla chat ***", client.Nickname), nil)
	fmt.Printf("  [Server] %s disconnected\n", client.Nickname)
}

// Shutdown gracefully closes all resident connections.
func (s *ChatServer) Shutdown() {
	s.mu.Lock()
	for client := range s.clients {
		client.Send <- "[NukkadChat] Server shutting down — good night mohalla!"
		client.Conn.Close()
	}
	s.mu.Unlock()
}

// ============================================================
// SECTION 5 — Simulated Client (for self-test)
// ============================================================
// WHY: Instead of requiring manual telnet sessions, we create
// simulated residents that connect via TCP and send scripted
// messages. This makes the demo fully self-contained.

// SimClient is a test helper that connects to the chat server.
type SimClient struct {
	conn     net.Conn
	reader   *bufio.Scanner
	name     string
	received []string
	mu       sync.Mutex
}

// NewSimClient dials the server and starts reading messages.
func NewSimClient(addr, label string) (*SimClient, error) {
	conn, err := net.Dial("tcp", addr)
	if err != nil {
		return nil, err
	}
	sc := &SimClient{
		conn:   conn,
		reader: bufio.NewScanner(conn),
		name:   label,
	}
	// Start reading in background.
	go sc.readLoop()
	return sc, nil
}

func (sc *SimClient) readLoop() {
	for sc.reader.Scan() {
		line := sc.reader.Text()
		sc.mu.Lock()
		sc.received = append(sc.received, line)
		sc.mu.Unlock()
	}
}

// Send writes a line to the server.
func (sc *SimClient) Send(msg string) {
	fmt.Fprintf(sc.conn, "%s\n", msg)
}

// PrintReceived shows all messages this resident got.
func (sc *SimClient) PrintReceived() {
	sc.mu.Lock()
	defer sc.mu.Unlock()
	fmt.Printf("    [%s] Received %d messages:\n", sc.name, len(sc.received))
	for _, msg := range sc.received {
		fmt.Printf("      %s\n", msg)
	}
}

// Close disconnects the client.
func (sc *SimClient) Close() {
	sc.conn.Close()
}

// ============================================================
// SECTION 6 — Main (Self-Test)
// ============================================================
// WHY: The self-test starts the server, creates 3 simulated
// residents, exercises every feature, and shuts down cleanly.
// No manual interaction needed.

func main() {
	fmt.Println("============================================================")
	fmt.Println("  NukkadChat — Mohalla TCP Chat Server (Self-Test Demo)")
	fmt.Println("============================================================")

	// --- Start server on a random free port ---
	server, err := NewChatServer("127.0.0.1:0")
	if err != nil {
		fmt.Printf("  [FATAL] %v\n", err)
		return
	}
	fmt.Printf("  Server address: %s\n", server.Addr())

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Run server in background.
	var serverDone sync.WaitGroup
	serverDone.Add(1)
	go func() {
		defer serverDone.Done()
		server.Run(ctx)
	}()

	// Give server time to start accepting.
	time.Sleep(50 * time.Millisecond)

	// --- Connect 3 simulated residents ---
	fmt.Println("\n  --- Connecting 3 simulated residents ---")

	amit, err := NewSimClient(server.Addr(), "Amit-sim")
	if err != nil {
		fmt.Printf("  [FATAL] Amit connect: %v\n", err)
		return
	}
	defer amit.Close()

	priya, err := NewSimClient(server.Addr(), "Priya-sim")
	if err != nil {
		fmt.Printf("  [FATAL] Priya connect: %v\n", err)
		return
	}
	defer priya.Close()

	rahul, err := NewSimClient(server.Addr(), "Rahul-sim")
	if err != nil {
		fmt.Printf("  [FATAL] Rahul connect: %v\n", err)
		return
	}
	defer rahul.Close()

	// Let welcome messages arrive.
	time.Sleep(100 * time.Millisecond)

	// --- Test /nick command ---
	fmt.Println("\n  --- Testing /nick command ---")
	amit.Send("/nick Amit")
	time.Sleep(50 * time.Millisecond)

	priya.Send("/nick Priya")
	time.Sleep(50 * time.Millisecond)

	rahul.Send("/nick Rahul")
	time.Sleep(50 * time.Millisecond)

	// --- Test broadcast messages ---
	fmt.Println("\n  --- Testing broadcast messages ---")
	amit.Send("Namaste sabko! Aaj chai ki tapri pe milte hain.")
	time.Sleep(50 * time.Millisecond)

	priya.Send("Haan Amit bhai! Main 5 baje aa rahi hoon.")
	time.Sleep(50 * time.Millisecond)

	rahul.Send("Suno sab, cricket match ke liye ground book karna hai.")
	time.Sleep(50 * time.Millisecond)

	// --- Test /list command ---
	fmt.Println("\n  --- Testing /list command ---")
	amit.Send("/list")
	time.Sleep(50 * time.Millisecond)

	// --- Test /msg (private message) ---
	fmt.Println("\n  --- Testing /msg (private message) ---")
	amit.Send("/msg Priya Priya ji, samosa leke aana!")
	time.Sleep(50 * time.Millisecond)

	priya.Send("/msg Amit Zaroor, kitne chahiye?")
	time.Sleep(50 * time.Millisecond)

	// --- Test /msg to non-existent user ---
	fmt.Println("\n  --- Testing /msg to unknown user ---")
	rahul.Send("/msg Neha Kya haal hai?")
	time.Sleep(50 * time.Millisecond)

	// --- Test unknown command ---
	fmt.Println("\n  --- Testing unknown command ---")
	priya.Send("/dance")
	time.Sleep(50 * time.Millisecond)

	// --- Test duplicate nickname ---
	fmt.Println("\n  --- Testing duplicate nickname ---")
	rahul.Send("/nick Amit")
	time.Sleep(50 * time.Millisecond)

	// --- More broadcast to show conversation flow ---
	fmt.Println("\n  --- More conversation ---")
	amit.Send("Kal subah park mein yoga class hai, sab aana!")
	time.Sleep(50 * time.Millisecond)

	priya.Send("Bilkul, main aa rahi hoon.")
	time.Sleep(50 * time.Millisecond)

	// --- Test /quit ---
	fmt.Println("\n  --- Testing /quit (Rahul leaves) ---")
	rahul.Send("/quit")
	time.Sleep(100 * time.Millisecond)

	// --- Post-quit messages ---
	amit.Send("Lagta hai Rahul ko jaana pada.")
	time.Sleep(50 * time.Millisecond)

	// Let remaining messages arrive.
	time.Sleep(100 * time.Millisecond)

	// --- Print received messages per resident ---
	fmt.Println("\n  ======================================")
	fmt.Println("       Resident Message Logs")
	fmt.Println("  ======================================")
	amit.PrintReceived()
	fmt.Println()
	priya.PrintReceived()
	fmt.Println()
	rahul.PrintReceived()

	// --- Graceful shutdown ---
	fmt.Println("\n  --- Shutting down server ---")
	server.Shutdown()
	cancel()
	serverDone.Wait()

	fmt.Println("\n============================================================")
	fmt.Println("  NukkadChat self-test complete.")
	fmt.Println("============================================================")
}

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. net.Listen + Accept loop is the foundation of all TCP
//    servers in Go — each connection gets its own goroutine.
// 2. Buffered channels (Send chan string, 64) decouple message
//    production from network writes, preventing slow residents
//    from blocking the server.
// 3. A separate writer goroutine per resident drains the Send
//    channel, while the reader goroutine processes input.
//    This two-goroutine-per-client pattern is standard Go.
// 4. sync.RWMutex on the client map lets broadcasts (RLock)
//    run concurrently while joins/leaves (Lock) are exclusive.
// 5. Non-blocking select on the Send channel drops messages for
//    slow residents rather than blocking the broadcaster.
// 6. Closing the listener from a goroutine watching ctx.Done()
//    is the idiomatic way to unblock Accept() for shutdown.
// 7. Simulated residents prove the protocol works end-to-end
//    without needing telnet or external tools.
// 8. Message timestamps give every line a temporal anchor,
//    essential for debugging and audit trails.
// ============================================================
