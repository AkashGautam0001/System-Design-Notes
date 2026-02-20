/** ============================================================
    FILE 32: Mohalla Chat Server — TCP Multi-Client Chat
    ============================================================
    Topic: TCP networking with the net module
    Combines: net, events, readline, Buffer

    WHY THIS MATTERS:
    TCP is the foundation of most internet protocols. Building
    a chat server teaches connection management, message
    framing, broadcast patterns, and graceful disconnection —
    the same patterns behind Redis, MQTT, and IRC.

    FULL USAGE (interactive mode):
      node 32-project-tcp-chat.js server [port]
      node 32-project-tcp-chat.js client [host:port]

    DEMO MODE (no arguments or --demo):
      node 32-project-tcp-chat.js
      Starts a server, creates 2 simulated clients, exchanges
      messages, tests commands, then shuts down cleanly.
    ============================================================ */

'use strict';

const net = require('net');
const { EventEmitter } = require('events');
const crypto = require('crypto');

// ============================================================
// SECTION 1: Configuration & Helpers
// ============================================================
const DEMO_MODE = process.argv.length <= 2 || process.argv[2] === '--demo';

const RESET  = '\x1b[0m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED    = '\x1b[31m';
const CYAN   = '\x1b[36m';
const DIM    = '\x1b[2m';
const BOLD   = '\x1b[1m';
const MAGENTA = '\x1b[35m';

// ANSI colors for mohalla residents (cycle through these)
const USER_COLORS = [
  '\x1b[36m',  // cyan
  '\x1b[33m',  // yellow
  '\x1b[35m',  // magenta
  '\x1b[32m',  // green
  '\x1b[34m',  // blue
  '\x1b[91m',  // bright red
  '\x1b[96m',  // bright cyan
  '\x1b[93m',  // bright yellow
];

function banner(text) {
  const rule = '='.repeat(60);
  console.log(`\n${CYAN}${rule}${RESET}`);
  console.log(`${BOLD}  ${text}${RESET}`);
  console.log(`${CYAN}${rule}${RESET}`);
}

function thinRule() {
  console.log(DIM + '\u2500'.repeat(60) + RESET);
}

function shortId() {
  return crypto.randomBytes(2).toString('hex').toUpperCase();
}

// ============================================================
// SECTION 2: Message Protocol
// ============================================================

/** ──────────────────────────────────────────────────────────
    Story: TCP is a byte stream, not a message stream. We
    need to frame messages so the receiver knows where one
    ends and the next begins — like passing chits in the
    mohalla. We use newline-delimited JSON: each message is
    a JSON object followed by \n.
    ────────────────────────────────────────────────────────── */

function encodeMessage(type, data) {
  return JSON.stringify({ type, ...data }) + '\n';
}

function createMessageParser(callback) {
  let buffer = '';
  return (chunk) => {
    buffer += chunk.toString();
    const parts = buffer.split('\n');
    buffer = parts.pop(); // keep incomplete last part
    for (const part of parts) {
      if (!part.trim()) continue;
      try {
        callback(JSON.parse(part));
      } catch {
        // skip malformed messages
      }
    }
  };
}

// ============================================================
// SECTION 3: Chat Server
// ============================================================

/** ──────────────────────────────────────────────────────────
    Story: The mohalla chat server tracks every connected
    resident by socket. When a message arrives from one
    resident, it broadcasts to all others — like a
    loudspeaker announcement. It handles nicknames, the
    /list command, and graceful disconnect without crashing.
    ────────────────────────────────────────────────────────── */

class MohallaChatServer extends EventEmitter {
  constructor() {
    super();
    this.clients = new Map(); // socket -> { nick, color, id }
    this.colorIndex = 0;
    this.server = null;
  }

  start(port) {
    return new Promise((resolve) => {
      this.server = net.createServer((socket) => this._onConnection(socket));
      this.server.listen(port, '127.0.0.1', () => {
        const addr = this.server.address();
        this.emit('listening', addr);
        resolve(addr);
      });
    });
  }

  _onConnection(socket) {
    const id = shortId();
    const nick = `Resident_${id}`;
    const color = USER_COLORS[this.colorIndex % USER_COLORS.length];
    this.colorIndex++;

    this.clients.set(socket, { nick, color, id });
    this.emit('join', nick);

    // Notify everyone (loudspeaker announcement)
    this._broadcast(socket, encodeMessage('system', {
      text: `${nick} joined the mohalla chat`
    }));

    // Send welcome to the new resident
    socket.write(encodeMessage('system', {
      text: `Welcome to the mohalla! You are ${nick}. Use /nick <name>, /list, /quit`
    }));

    // Handle incoming data
    const parse = createMessageParser((msg) => {
      this._handleMessage(socket, msg);
    });
    socket.on('data', parse);

    // Handle disconnect
    socket.on('close', () => {
      const client = this.clients.get(socket);
      if (client) {
        this.emit('leave', client.nick);
        this._broadcast(socket, encodeMessage('system', {
          text: `${client.nick} left the mohalla chat`
        }));
        this.clients.delete(socket);
      }
    });

    socket.on('error', () => {
      this.clients.delete(socket);
    });
  }

  _handleMessage(socket, msg) {
    const client = this.clients.get(socket);
    if (!client) return;

    if (msg.type === 'chat') {
      const text = msg.text || '';

      // Command: /nick <name>
      if (text.startsWith('/nick ')) {
        const oldNick = client.nick;
        client.nick = text.slice(6).trim() || client.nick;
        socket.write(encodeMessage('system', {
          text: `You are now ${client.nick}`
        }));
        this._broadcast(socket, encodeMessage('system', {
          text: `${oldNick} is now known as ${client.nick}`
        }));
        this.emit('nick', oldNick, client.nick);
        return;
      }

      // Command: /list
      if (text.trim() === '/list') {
        const names = [...this.clients.values()].map(c => c.nick);
        socket.write(encodeMessage('system', {
          text: `Mohalla residents online (${names.length}): ${names.join(', ')}`
        }));
        this.emit('list', names);
        return;
      }

      // Command: /quit
      if (text.trim() === '/quit') {
        socket.write(encodeMessage('system', { text: 'Alvida! See you in the mohalla!' }));
        socket.end();
        return;
      }

      // Regular message — broadcast to others (loudspeaker)
      this._broadcast(socket, encodeMessage('chat', {
        nick: client.nick,
        color: client.color,
        text
      }));
      this.emit('message', client.nick, text);
    }
  }

  _broadcast(senderSocket, data) {
    for (const [sock] of this.clients) {
      if (sock !== senderSocket && !sock.destroyed) {
        sock.write(data);
      }
    }
  }

  getClientCount() {
    return this.clients.size;
  }

  shutdown() {
    return new Promise((resolve) => {
      // Close all resident connections
      for (const [sock] of this.clients) {
        sock.destroy();
      }
      this.clients.clear();
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}

// ============================================================
// SECTION 4: Chat Client (Simulated for Demo)
// ============================================================

/** ──────────────────────────────────────────────────────────
    Story: Each mohalla resident connects via TCP, sends
    newline-JSON messages (like passing chits), and receives
    them. In the demo we simulate residents programmatically
    instead of requiring user input.
    ────────────────────────────────────────────────────────── */

class SimulatedResident extends EventEmitter {
  constructor(name) {
    super();
    this.name = name;
    this.socket = null;
    this.messages = [];
  }

  connect(port) {
    return new Promise((resolve) => {
      this.socket = net.createConnection({ port, host: '127.0.0.1' }, () => {
        resolve();
      });

      const parse = createMessageParser((msg) => {
        this.messages.push(msg);
        this.emit('message', msg);
      });
      this.socket.on('data', parse);
      this.socket.on('error', () => {});
    });
  }

  send(text) {
    if (this.socket && !this.socket.destroyed) {
      this.socket.write(encodeMessage('chat', { text }));
    }
  }

  disconnect() {
    return new Promise((resolve) => {
      if (!this.socket || this.socket.destroyed) {
        resolve();
        return;
      }
      this.socket.on('close', () => resolve());
      this.socket.end();
    });
  }

  getLastMessages(n) {
    return this.messages.slice(-n);
  }
}

// Small delay helper for demo sequencing
function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ============================================================
// SECTION 5: Demo Mode
// ============================================================

/** ──────────────────────────────────────────────────────────
    Story: The demo starts a mohalla chat server in-process,
    connects two simulated residents (Amit and Priya), walks
    through chatting, nickname changes, and the /list command,
    then disconnects everything cleanly. Every step is logged.
    ────────────────────────────────────────────────────────── */

async function runDemo() {
  banner('Mohalla Chat Server \u2014 TCP Multi-Client Chat (DEMO MODE)');

  const server = new MohallaChatServer();
  const serverLog = [];

  // Log server events
  server.on('listening', (addr) => {
    const line = `  [SERVER] Mohalla server listening on ${addr.address}:${addr.port}`;
    console.log(`${GREEN}${line}${RESET}`);
    serverLog.push(line);
  });
  server.on('join', (nick) => {
    const line = `  [SERVER] ${nick} entered the mohalla (${server.getClientCount()} residents)`;
    console.log(`${GREEN}${line}${RESET}`);
    serverLog.push(line);
  });
  server.on('leave', (nick) => {
    const line = `  [SERVER] ${nick} left the mohalla`;
    console.log(`${YELLOW}${line}${RESET}`);
    serverLog.push(line);
  });
  server.on('message', (nick, text) => {
    const line = `  [SERVER] <${nick}> ${text}`;
    console.log(`${DIM}${line}${RESET}`);
    serverLog.push(line);
  });
  server.on('nick', (oldNick, newNick) => {
    const line = `  [SERVER] ${oldNick} -> ${newNick}`;
    console.log(`${MAGENTA}${line}${RESET}`);
    serverLog.push(line);
  });
  server.on('list', (names) => {
    const line = `  [SERVER] List requested: ${names.join(', ')}`;
    console.log(`${DIM}${line}${RESET}`);
    serverLog.push(line);
  });

  // Step 1 — Start server
  thinRule();
  console.log(`${BOLD}  Step 1: Starting mohalla TCP chat server${RESET}`);
  thinRule();
  const addr = await server.start(0); // random port
  const port = addr.port;
  // Output: [SERVER] Mohalla server listening on 127.0.0.1:XXXXX

  // Step 2 — Connect two residents
  console.log('');
  thinRule();
  console.log(`${BOLD}  Step 2: Two residents enter the mohalla${RESET}`);
  thinRule();

  const amit = new SimulatedResident('Amit');
  const priya = new SimulatedResident('Priya');

  await amit.connect(port);
  await wait(100);
  // Output: [SERVER] Resident_XXXX entered the mohalla (1 residents)

  await priya.connect(port);
  await wait(100);
  // Output: [SERVER] Resident_XXXX entered the mohalla (2 residents)

  // Show welcome messages received
  console.log(`\n  Amit received: ${DIM}${amit.messages.map(m => m.text).join('; ')}${RESET}`);
  console.log(`  Priya received: ${DIM}${priya.messages.map(m => m.text).join('; ')}${RESET}`);

  // Step 3 — Set nicknames
  console.log('');
  thinRule();
  console.log(`${BOLD}  Step 3: Setting nicknames with /nick${RESET}`);
  thinRule();

  amit.send('/nick Amit');
  await wait(100);
  // Output: [SERVER] Resident_XXXX -> Amit

  priya.send('/nick Priya');
  await wait(100);
  // Output: [SERVER] Resident_XXXX -> Priya

  console.log(`  Amit's last msg: ${DIM}${amit.getLastMessages(1).map(m => m.text).join('')}${RESET}`);
  console.log(`  Priya's last msg: ${DIM}${priya.getLastMessages(1).map(m => m.text).join('')}${RESET}`);

  // Step 4 — Exchange messages (like passing chits)
  console.log('');
  thinRule();
  console.log(`${BOLD}  Step 4: Exchanging messages in the mohalla${RESET}`);
  thinRule();

  amit.send('Priya ji, aaj chai pe milte hain?');
  await wait(100);
  // Output: [SERVER] <Amit> Priya ji, aaj chai pe milte hain?

  // Priya should have received Amit's message
  const priyaGot = priya.getLastMessages(1)[0];
  if (priyaGot && priyaGot.type === 'chat') {
    console.log(`  Priya received: ${CYAN}<${priyaGot.nick}>${RESET} ${priyaGot.text}`);
    // Output: Priya received: <Amit> Priya ji, aaj chai pe milte hain?
  }

  priya.send('Haan Amit bhai, shaam ko pakode bhi banayenge!');
  await wait(100);
  // Output: [SERVER] <Priya> Haan Amit bhai, shaam ko pakode bhi banayenge!

  const amitGot = amit.getLastMessages(1)[0];
  if (amitGot && amitGot.type === 'chat') {
    console.log(`  Amit received: ${CYAN}<${amitGot.nick}>${RESET} ${amitGot.text}`);
    // Output: Amit received: <Priya> Haan Amit bhai, shaam ko pakode bhi banayenge!
  }

  amit.send('Rahul aur Neha ko bhi bula lo, poora mohalla saath mein!');
  await wait(100);

  const priyaGot2 = priya.getLastMessages(1)[0];
  if (priyaGot2 && priyaGot2.type === 'chat') {
    console.log(`  Priya received: ${CYAN}<${priyaGot2.nick}>${RESET} ${priyaGot2.text}`);
  }

  // Step 5 — /list command
  console.log('');
  thinRule();
  console.log(`${BOLD}  Step 5: Using /list to see mohalla residents online${RESET}`);
  thinRule();

  amit.send('/list');
  await wait(100);
  const listMsg = amit.getLastMessages(1)[0];
  if (listMsg) {
    console.log(`  Amit sees: ${DIM}${listMsg.text}${RESET}`);
    // Output: Mohalla residents online (2): Amit, Priya
  }

  // Step 6 — Disconnect Priya
  console.log('');
  thinRule();
  console.log(`${BOLD}  Step 6: Priya leaves the mohalla${RESET}`);
  thinRule();

  await priya.disconnect();
  await wait(150);
  // Output: [SERVER] Priya left the mohalla

  // Amit should get "Priya left" notification
  const leaveMsg = amit.getLastMessages(1)[0];
  if (leaveMsg && leaveMsg.type === 'system') {
    console.log(`  Amit notified: ${YELLOW}${leaveMsg.text}${RESET}`);
    // Output: Amit notified: Priya left the mohalla chat
  }

  console.log(`  Mohalla residents online: ${server.getClientCount()}`);
  // Output: Mohalla residents online: 1

  // Step 7 — Disconnect Amit and shutdown
  console.log('');
  thinRule();
  console.log(`${BOLD}  Step 7: Shutting down the mohalla server${RESET}`);
  thinRule();

  await amit.disconnect();
  await wait(100);
  // Output: [SERVER] Amit left the mohalla

  await server.shutdown();
  console.log(`  ${GREEN}Mohalla server shut down cleanly.${RESET}`);
  console.log(`  Total server events logged: ${serverLog.length}`);

  // Step 8 — Full event log
  console.log('');
  thinRule();
  console.log(`${BOLD}  Full Mohalla Server Event Log:${RESET}`);
  thinRule();
  for (const entry of serverLog) {
    console.log(`  ${DIM}${entry}${RESET}`);
  }

  // ============================================================
  // KEY TAKEAWAYS
  // ============================================================
  banner('KEY TAKEAWAYS');
  console.log(`
  1. TCP is a byte stream — you must frame messages yourself (newline-JSON)
  2. net.createServer handles concurrent connections via event callbacks
  3. A Map of socket->metadata lets the server track and broadcast to clients
  4. Broadcast = iterate all sockets except the sender
  5. socket.on('close') fires even on abrupt disconnections
  6. EventEmitter on the server class decouples logging from logic
  7. Random port (port 0) lets the OS pick an available port for testing
  8. Graceful shutdown means closing all sockets then the server
`);
}

// ============================================================
// SECTION 6: Interactive Server Mode
// ============================================================

async function runServer(port) {
  const server = new MohallaChatServer();

  server.on('listening', (addr) => {
    console.log(`${GREEN}[SERVER] Mohalla listening on ${addr.address}:${addr.port}${RESET}`);
    console.log('Waiting for residents... (Ctrl+C to stop)\n');
  });
  server.on('join', (nick) => {
    console.log(`${GREEN}[+] ${nick} joined (${server.getClientCount()} online)${RESET}`);
  });
  server.on('leave', (nick) => {
    console.log(`${YELLOW}[-] ${nick} left (${server.getClientCount()} online)${RESET}`);
  });
  server.on('message', (nick, text) => {
    console.log(`<${nick}> ${text}`);
  });
  server.on('nick', (o, n) => {
    console.log(`${MAGENTA}[~] ${o} is now ${n}${RESET}`);
  });

  await server.start(port);

  process.on('SIGINT', async () => {
    console.log('\nShutting down mohalla server...');
    await server.shutdown();
    process.exit(0);
  });
}

// ============================================================
// SECTION 7: Interactive Client Mode
// ============================================================

async function runClient(hostPort) {
  const [host, portStr] = hostPort.includes(':')
    ? hostPort.split(':')
    : ['127.0.0.1', hostPort];
  const port = parseInt(portStr, 10) || 4000;

  const readline = require('readline');

  const socket = net.createConnection({ host, port }, () => {
    console.log(`${GREEN}Connected to mohalla at ${host}:${port}${RESET}`);
    console.log('Type messages, or /nick /list /quit\n');
  });

  const parse = createMessageParser((msg) => {
    if (msg.type === 'system') {
      console.log(`${DIM}[mohalla] ${msg.text}${RESET}`);
    } else if (msg.type === 'chat') {
      const color = msg.color || '';
      console.log(`${color}<${msg.nick}>${RESET} ${msg.text}`);
    }
  });
  socket.on('data', parse);

  socket.on('close', () => {
    console.log(`${YELLOW}Disconnected from mohalla.${RESET}`);
    process.exit(0);
  });

  socket.on('error', (err) => {
    console.error(`${RED}Connection error: ${err.message}${RESET}`);
    process.exit(1);
  });

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.on('line', (line) => {
    if (line.trim()) {
      socket.write(encodeMessage('chat', { text: line }));
    }
  });
  rl.on('close', () => {
    socket.end();
  });
}

// ============================================================
// SECTION 8: Entry Point
// ============================================================

async function main() {
  if (DEMO_MODE) {
    await runDemo();
    return;
  }

  const command = process.argv[2];

  switch (command) {
    case 'server': {
      const port = parseInt(process.argv[3], 10) || 4000;
      await runServer(port);
      break;
    }
    case 'client': {
      const target = process.argv[3] || '127.0.0.1:4000';
      await runClient(target);
      break;
    }
    default:
      console.log('Usage:');
      console.log('  node 32-project-tcp-chat.js               # demo mode');
      console.log('  node 32-project-tcp-chat.js server [port]  # start server');
      console.log('  node 32-project-tcp-chat.js client [host:port]  # connect');
  }
}

main().catch(err => {
  console.error(`${RED}Fatal: ${err.message}${RESET}`);
  process.exit(1);
});
