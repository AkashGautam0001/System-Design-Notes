/** ============================================================
    FILE 23: Net Module — TCP Servers and Clients
    ============================================================
    Topic: The `net` module for low-level TCP networking
    WHY THIS MATTERS:
    HTTP is built on top of TCP. Understanding the net module
    gives you insight into how Node handles connections at the
    lowest networking layer — sockets, streams, and raw bytes.
    ============================================================ */

// ============================================================
// STORY: BSNL Telephone Exchange
// Operator Sharma manages phone lines at the BSNL telephone
// exchange. Each phone line is a TCP socket — raw, direct,
// reliable. Sharma creates a central exchange (server) and
// connects remote subscribers (clients) to establish trunk
// calls and exchange messages.
// ============================================================

const net = require('net');

// ============================================================
// EXAMPLE BLOCK 1 — TCP Echo Server with net.createServer()
// ============================================================

// WHY: net.createServer() creates a raw TCP server.
// Unlike HTTP, there are no headers, methods, or status codes.
// You send and receive raw buffers or strings over a socket.

function runTCPDemo() {
  return new Promise((resolve) => {
    let callsCompleted = 0;
    const totalCalls = 2;
    let server;

    // ──────────────────────────────────────────────────────────
    // Creating the TCP server — BSNL Telephone Exchange
    // ──────────────────────────────────────────────────────────

    server = net.createServer((socket) => {
      // This callback fires on each new 'connection' event.
      // `socket` is a Duplex stream — readable AND writable.
      // Each socket is a phone line at the exchange.

      const callerAddr = `${socket.remoteAddress}:${socket.remotePort}`;
      // WHY: remoteAddress and remotePort identify the caller.
      console.log(`[Exchange] New trunk call from ${callerAddr}`);

      // ──────────────────────────────────────────────────────────
      // Socket events: 'data', 'end', 'close', 'error'
      // ──────────────────────────────────────────────────────────

      socket.setEncoding('utf8');
      // WHY: Without setEncoding, 'data' events deliver Buffer objects.
      // With 'utf8', we get strings directly.

      socket.on('data', (data) => {
        console.log(`[Exchange] Received from ${callerAddr}: ${data.trim()}`);
        // Output: [Exchange] Received from 127.0.0.1:<port>: Namaste from subscriber N

        // Echo server pattern — relay the message right back
        socket.write(`RELAY: ${data.trim()}\n`);
        // WHY: socket.write() sends data to the caller.
        // It does NOT disconnect the line.
      });

      socket.on('end', () => {
        // WHY: 'end' fires when the caller hangs up (calls socket.end()).
        // The caller signals "I'm done talking."
        console.log(`[Exchange] Caller ${callerAddr} hung up`);
      });

      socket.on('close', (hadError) => {
        // WHY: 'close' fires after the line is fully disconnected.
        // hadError is true if the line dropped due to an error.
        console.log(`[Exchange] Line disconnected (error: ${hadError})`);
        // Output: [Exchange] Line disconnected (error: false)
      });

      socket.on('error', (err) => {
        // WHY: Always handle socket errors to prevent exchange crashes.
        console.log(`[Exchange] Line error: ${err.message}`);
      });
    });

    // ──────────────────────────────────────────────────────────
    // Server events and listening
    // ──────────────────────────────────────────────────────────

    server.on('error', (err) => {
      console.log(`[Exchange] Exchange error: ${err.message}`);
      // Common: EADDRINUSE — line already taken
    });

    // Listen on a random available port (port 0)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      console.log(`[Exchange] BSNL telephone exchange open on port ${port}`);
      // Output: [Exchange] BSNL telephone exchange open on port <random>

      // Now that the exchange is up, connect subscribers
      connectSubscribers(port);
    });

    // ============================================================
    // EXAMPLE BLOCK 2 — TCP Client with net.createConnection()
    // ============================================================

    // WHY: net.createConnection() (alias: net.connect()) creates
    // a client socket that connects to a TCP server (the exchange).

    function connectSubscribers(port) {
      for (let i = 1; i <= totalCalls; i++) {
        createSubscriber(i, port);
      }
    }

    function createSubscriber(id, port) {
      // ──────────────────────────────────────────────────────────
      // Creating a TCP client — a remote subscriber dialing in
      // ──────────────────────────────────────────────────────────

      const client = net.createConnection({ port, host: '127.0.0.1' }, () => {
        // WHY: The callback fires once the trunk call is established.
        // This is equivalent to the 'connect' event.
        console.log(`[Subscriber ${id}] Connected to exchange`);
        // Output: [Subscriber 1] Connected to exchange

        // Send a message through the trunk line
        client.write(`Namaste from subscriber ${id}\n`);
      });

      client.setEncoding('utf8');
      // WHY: setEncoding on the subscriber side too, so 'data' gives strings.

      client.on('data', (data) => {
        console.log(`[Subscriber ${id}] Exchange relayed: ${data.trim()}`);
        // Output: [Subscriber 1] Exchange relayed: RELAY: Namaste from subscriber 1

        // After receiving the relay, hang up
        client.end();
        // WHY: socket.end() sends a FIN packet — "I'm done talking."
        // The socket can still receive data until the exchange ends too.
      });

      client.on('end', () => {
        console.log(`[Subscriber ${id}] Call ended`);
      });

      client.on('close', () => {
        console.log(`[Subscriber ${id}] Line disconnected`);
        callsCompleted++;

        // ──────────────────────────────────────────────────────────
        // Event-driven shutdown — close exchange after all calls done
        // ──────────────────────────────────────────────────────────
        if (callsCompleted === totalCalls) {
          console.log('\n[Shutdown] All calls done, closing exchange...');
          server.close(() => {
            console.log('[Shutdown] Exchange closed. BSNL office closed for the night.');
            resolve();
          });
        }
      });

      client.on('error', (err) => {
        console.log(`[Subscriber ${id}] Error: ${err.message}`);
      });
    }
  });
}

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. net.createServer() creates a raw TCP server — no HTTP
//    framing, just raw bytes over a reliable connection.
// 2. Each connection gives you a socket (Duplex stream) with
//    events: 'data', 'end', 'close', 'error'.
// 3. socket.write() sends data; socket.end() signals
//    "I'm done sending" (half-close).
// 4. socket.remoteAddress and socket.remotePort identify clients.
// 5. socket.setEncoding('utf8') converts Buffers to strings.
// 6. net.createConnection() creates a TCP client socket.
// 7. Always handle 'error' on both server and socket to
//    prevent crashes (unhandled errors kill the process).
// 8. Use port 0 to let the OS pick an available port — great
//    for tests and demos.
// 9. Clean shutdown: wait for clients, then server.close().
// ============================================================

runTCPDemo().then(() => {
  console.log('\nAll done. Sharma sahab clocks out of the BSNL exchange.');
});
