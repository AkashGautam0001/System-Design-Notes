/** ============================================================
 *  FILE 27: DESIGN A CHAT SYSTEM
 *  ============================================================
 *  Topic: WebSocket management, message ordering, delivery receipts,
 *         presence detection, fan-out for group chats
 *
 *  WHY THIS MATTERS:
 *  Chat systems like WhatsApp handle 100+ billion messages daily.
 *  Reliable delivery, correct ordering, and real-time presence are
 *  critical. Indian family groups with 50+ members stress every
 *  part of the system from fan-out to notification delivery.
 *  ============================================================ */

// STORY: WhatsApp-style Indian Family Group
// The "Sharma Parivar" WhatsApp group has 47 members across 3 generations.
// Grandpa sends good morning images at 5 AM, aunties share festival forwards,
// and cousins debate cricket scores. The system must show single tick (sent),
// double tick (delivered), and blue tick (read) for every message. When
// Grandpa's phone goes offline on 2G, messages queue and deliver when he
// reconnects. Presence shows "last seen" so family knows who is awake.

console.log("=".repeat(70));
console.log("  FILE 27: DESIGN A CHAT SYSTEM");
console.log("=".repeat(70));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 1 — Requirements Analysis
// ════════════════════════════════════════════════════════════════

// WHY: Chat systems have strict requirements around ordering and delivery.

console.log("SECTION 1 — Requirements Analysis");
console.log("-".repeat(50));

const chatRequirements = {
  functional: [
    "1:1 private messaging",
    "Group chat (up to 256 members)",
    "Delivery receipts: sent, delivered, read",
    "Online/offline presence with last seen",
    "Offline message queuing",
    "Message ordering guarantee"
  ],
  nonFunctional: [
    "Message delivery < 100ms (online users)",
    "At-least-once delivery guarantee",
    "Messages persisted for 30 days",
    "Support 500M concurrent connections",
    "End-to-end ordering per conversation"
  ]
};

console.log("Functional Requirements:");
chatRequirements.functional.forEach(r => console.log(`  - ${r}`));
console.log("\nNon-Functional Requirements:");
chatRequirements.nonFunctional.forEach(r => console.log(`  - ${r}`));

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Connection Management (WebSocket Simulation)
// ════════════════════════════════════════════════════════════════

// WHY: WebSockets provide full-duplex communication needed for real-time chat.

console.log("SECTION 2 — Connection Management (WebSocket Simulation)");
console.log("-".repeat(50));

class ConnectionManager {
  constructor() {
    this.connections = new Map(); // userId -> connection info
    this.serverAssignments = new Map(); // userId -> serverId
    this.servers = ["chat-srv-1", "chat-srv-2", "chat-srv-3"];
    this.heartbeatInterval = 30000; // 30s
  }

  connect(userId, deviceInfo = {}) {
    const serverId = this.servers[Math.abs(this._hash(userId)) % this.servers.length];

    const conn = {
      userId,
      serverId,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      deviceInfo,
      status: "connected"
    };

    this.connections.set(userId, conn);
    this.serverAssignments.set(userId, serverId);

    return conn;
  }

  disconnect(userId) {
    const conn = this.connections.get(userId);
    if (conn) {
      conn.status = "disconnected";
      conn.disconnectedAt = Date.now();
    }
    return conn;
  }

  isConnected(userId) {
    const conn = this.connections.get(userId);
    return conn && conn.status === "connected";
  }

  heartbeat(userId) {
    const conn = this.connections.get(userId);
    if (conn && conn.status === "connected") {
      conn.lastHeartbeat = Date.now();
      return true;
    }
    return false;
  }

  getServerForUser(userId) {
    return this.serverAssignments.get(userId);
  }

  _hash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  getStats() {
    let connected = 0;
    let disconnected = 0;
    for (const conn of this.connections.values()) {
      if (conn.status === "connected") connected++;
      else disconnected++;
    }
    return { connected, disconnected, total: this.connections.size };
  }
}

const connManager = new ConnectionManager();

// Simulate family members connecting
const familyMembers = [
  { id: "grandpa_sharma", device: "JioPhone" },
  { id: "papa_sharma", device: "Samsung M31" },
  { id: "mummy_sharma", device: "Redmi Note 10" },
  { id: "rahul_sharma", device: "iPhone 14" },
  { id: "priya_sharma", device: "OnePlus Nord" },
  { id: "chacha_sharma", device: "Vivo Y21" },
  { id: "chachi_sharma", device: "Oppo A15" },
  { id: "dadi_sharma", device: "Nokia 105" }
];

console.log("Family members connecting:");
familyMembers.forEach(m => {
  const conn = connManager.connect(m.id, { device: m.device });
  console.log(`  ${m.id.padEnd(18)} -> ${conn.serverId} (${m.device})`);
});

// Grandpa goes offline (2G dropped)
connManager.disconnect("grandpa_sharma");
console.log("\n  grandpa_sharma disconnected (2G network dropped)");

const connStats = connManager.getStats();
console.log(`\n  Connection Stats: ${connStats.connected} online, ${connStats.disconnected} offline`);

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 3 — Message Sending and Receiving
// ════════════════════════════════════════════════════════════════

// WHY: Core message flow must handle online delivery and offline queuing.

console.log("SECTION 3 — Message Sending and Receiving");
console.log("-".repeat(50));

class Message {
  constructor(senderId, recipientId, content, type = "text") {
    this.id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    this.senderId = senderId;
    this.recipientId = recipientId;
    this.content = content;
    this.type = type;
    this.timestamp = Date.now();
    this.sequenceNum = 0; // Set by the system
    this.status = "created"; // created -> sent -> delivered -> read
  }
}

class MessageStore {
  constructor() {
    this.messages = new Map(); // messageId -> Message
    this.conversationMessages = new Map(); // convKey -> [messageId]
    this.sequenceCounters = new Map(); // convKey -> counter
  }

  _convKey(user1, user2) {
    return [user1, user2].sort().join(":");
  }

  store(message) {
    const convKey = this._convKey(message.senderId, message.recipientId);

    if (!this.sequenceCounters.has(convKey)) {
      this.sequenceCounters.set(convKey, 0);
    }
    const seq = this.sequenceCounters.get(convKey) + 1;
    this.sequenceCounters.set(convKey, seq);
    message.sequenceNum = seq;

    this.messages.set(message.id, message);

    if (!this.conversationMessages.has(convKey)) {
      this.conversationMessages.set(convKey, []);
    }
    this.conversationMessages.get(convKey).push(message.id);

    return message;
  }

  getMessage(messageId) {
    return this.messages.get(messageId);
  }

  getConversation(user1, user2, limit = 20) {
    const convKey = this._convKey(user1, user2);
    const msgIds = this.conversationMessages.get(convKey) || [];
    return msgIds.slice(-limit).map(id => this.messages.get(id));
  }
}

const messageStore = new MessageStore();

// Simulate a conversation
const msgs = [
  new Message("mummy_sharma", "papa_sharma", "Aaj dinner kya banana hai?"),
  new Message("papa_sharma", "mummy_sharma", "Dal chawal bana do"),
  new Message("mummy_sharma", "papa_sharma", "Theek hai, sabzi bhi banaungi"),
  new Message("papa_sharma", "mummy_sharma", "Ok, main 8 baje aaunga")
];

console.log("1:1 Conversation (Mummy <-> Papa):");
msgs.forEach(msg => {
  const stored = messageStore.store(msg);
  console.log(`  [Seq ${stored.sequenceNum}] ${stored.senderId.split("_")[0]}: ${stored.content}`);
});

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Message Ordering (Sequence Numbers + Timestamps)
// ════════════════════════════════════════════════════════════════

// WHY: Network delays can cause messages to arrive out of order — sequence numbers fix this.

console.log("SECTION 4 — Message Ordering");
console.log("-".repeat(50));

class MessageOrderer {
  constructor() {
    this.buffers = new Map(); // convKey -> { expected, buffer }
  }

  _getBuffer(convKey) {
    if (!this.buffers.has(convKey)) {
      this.buffers.set(convKey, {
        expectedSeq: 1,
        buffer: new Map(), // seq -> message
        delivered: []
      });
    }
    return this.buffers.get(convKey);
  }

  // Messages may arrive out of order. Buffer and deliver in sequence.
  receiveMessage(convKey, message) {
    const state = this._getBuffer(convKey);
    const seq = message.sequenceNum;

    if (seq === state.expectedSeq) {
      // In order — deliver immediately
      state.delivered.push(message);
      state.expectedSeq++;

      // Check if buffered messages can now be delivered
      while (state.buffer.has(state.expectedSeq)) {
        const buffered = state.buffer.get(state.expectedSeq);
        state.buffer.delete(state.expectedSeq);
        state.delivered.push(buffered);
        state.expectedSeq++;
      }
      return { action: "delivered", seq };
    } else if (seq > state.expectedSeq) {
      // Out of order — buffer it
      state.buffer.set(seq, message);
      return { action: "buffered", seq, waiting: state.expectedSeq };
    } else {
      // Duplicate
      return { action: "duplicate", seq };
    }
  }

  getDelivered(convKey) {
    const state = this._getBuffer(convKey);
    return state ? state.delivered : [];
  }
}

const orderer = new MessageOrderer();

// Simulate out-of-order arrival
console.log("Simulating out-of-order message arrival:");
const orderedMsgs = [
  { sequenceNum: 1, content: "Hey!" },
  { sequenceNum: 3, content: "How's the weather?" },  // arrives before 2
  { sequenceNum: 2, content: "What's up?" },           // arrives late
  { sequenceNum: 5, content: "Ok bye!" },              // arrives before 4
  { sequenceNum: 4, content: "Let's meet tomorrow" }   // arrives late
];

const convKey = "test_conv";
orderedMsgs.forEach(msg => {
  const result = orderer.receiveMessage(convKey, msg);
  console.log(`  Received seq=${msg.sequenceNum} "${msg.content}" -> ${result.action}${result.waiting ? ` (waiting for ${result.waiting})` : ""}`);
});

console.log("\n  Final delivered order:");
orderer.getDelivered(convKey).forEach(msg => {
  console.log(`    Seq ${msg.sequenceNum}: "${msg.content}"`);
});
// Output: Messages in correct order 1, 2, 3, 4, 5

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 5 — Delivery Receipts (Sent/Delivered/Read Ticks)
// ════════════════════════════════════════════════════════════════

// WHY: WhatsApp's tick system is the gold standard — users expect it.

console.log("SECTION 5 — Delivery Receipts (Tick System)");
console.log("-".repeat(50));

class DeliveryTracker {
  constructor(connectionManager) {
    this.receipts = new Map(); // messageId -> receipt state
    this.connManager = connectionManager;
  }

  // When sender sends a message
  markSent(messageId, senderId) {
    this.receipts.set(messageId, {
      messageId,
      senderId,
      status: "sent",
      sentAt: Date.now(),
      deliveredAt: null,
      readAt: null
    });
    return this._getTickDisplay("sent");
  }

  // When message reaches recipient's device
  markDelivered(messageId) {
    const receipt = this.receipts.get(messageId);
    if (receipt && receipt.status === "sent") {
      receipt.status = "delivered";
      receipt.deliveredAt = Date.now();
    }
    return this._getTickDisplay("delivered");
  }

  // When recipient opens the chat
  markRead(messageId) {
    const receipt = this.receipts.get(messageId);
    if (receipt) {
      receipt.status = "read";
      receipt.readAt = Date.now();
    }
    return this._getTickDisplay("read");
  }

  getReceipt(messageId) {
    return this.receipts.get(messageId);
  }

  _getTickDisplay(status) {
    switch (status) {
      case "sent":      return { symbol: "\u2713", label: "Single tick (sent to server)" };
      case "delivered":  return { symbol: "\u2713\u2713", label: "Double tick (delivered to device)" };
      case "read":       return { symbol: "\u2713\u2713 (blue)", label: "Blue double tick (read)" };
      default:           return { symbol: "?", label: "Unknown" };
    }
  }

  // For group messages: delivered when all members receive, read when all read
  getGroupReceipt(messageId, memberIds) {
    const receipt = this.receipts.get(messageId);
    if (!receipt) return null;

    // In groups, we track per-member
    if (!receipt.memberReceipts) {
      receipt.memberReceipts = {};
      memberIds.forEach(id => {
        receipt.memberReceipts[id] = { delivered: false, read: false };
      });
    }
    return receipt;
  }
}

const deliveryTracker = new DeliveryTracker(connManager);

console.log("WhatsApp Tick System Simulation:");
console.log();
console.log("  Tick Legend:");
console.log('    \u2713       = Message sent to server (single tick)');
console.log('    \u2713\u2713      = Message delivered to recipient device (double tick)');
console.log('    \u2713\u2713 blue = Message read by recipient (blue double tick)');
console.log();

// Simulate message lifecycle
const testMsg = new Message("rahul_sharma", "priya_sharma", "Movie chalein kya?");
testMsg.id = "msg_test_001";

console.log(`  Rahul sends: "${testMsg.content}"`);

const sentTick = deliveryTracker.markSent(testMsg.id, testMsg.senderId);
console.log(`    ${sentTick.symbol}  ${sentTick.label}`);

const deliveredTick = deliveryTracker.markDelivered(testMsg.id);
console.log(`    ${deliveredTick.symbol}  ${deliveredTick.label}`);

const readTick = deliveryTracker.markRead(testMsg.id);
console.log(`    ${readTick.symbol}  ${readTick.label}`);

// Show offline scenario
console.log("\n  Offline Scenario (Grandpa on 2G):");
const grandpaMsg = new Message("rahul_sharma", "grandpa_sharma", "Pranam Dadaji!");
grandpaMsg.id = "msg_test_002";

const gpSent = deliveryTracker.markSent(grandpaMsg.id, grandpaMsg.senderId);
const isOnline = connManager.isConnected("grandpa_sharma");
console.log(`    Sent: ${gpSent.symbol}  ${gpSent.label}`);
console.log(`    Grandpa online? ${isOnline} -> Message stays at single tick`);
console.log(`    When Grandpa reconnects -> double tick -> opens chat -> blue tick`);

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Presence System (Online/Offline/Last Seen)
// ════════════════════════════════════════════════════════════════

// WHY: "Last seen" is how Indian families track each other's schedules.

console.log("SECTION 6 — Presence System");
console.log("-".repeat(50));

class PresenceService {
  constructor() {
    this.presence = new Map(); // userId -> presence info
    this.heartbeatTimeout = 35000; // 35 seconds
    this.subscribers = new Map(); // userId -> Set of subscriber userIds
  }

  goOnline(userId) {
    this.presence.set(userId, {
      status: "online",
      lastSeen: Date.now(),
      lastHeartbeat: Date.now()
    });
    this._notifySubscribers(userId, "online");
  }

  goOffline(userId) {
    const p = this.presence.get(userId);
    if (p) {
      p.status = "offline";
      p.lastSeen = Date.now();
    } else {
      this.presence.set(userId, {
        status: "offline",
        lastSeen: Date.now(),
        lastHeartbeat: null
      });
    }
    this._notifySubscribers(userId, "offline");
  }

  heartbeat(userId) {
    const p = this.presence.get(userId);
    if (p) {
      p.lastHeartbeat = Date.now();
      p.status = "online";
    }
  }

  getPresence(userId) {
    const p = this.presence.get(userId);
    if (!p) return { status: "unknown", lastSeen: null };

    // Check heartbeat timeout
    if (p.status === "online" && p.lastHeartbeat) {
      if (Date.now() - p.lastHeartbeat > this.heartbeatTimeout) {
        p.status = "offline";
        p.lastSeen = p.lastHeartbeat;
      }
    }

    return {
      status: p.status,
      lastSeen: p.lastSeen,
      lastSeenFormatted: this._formatLastSeen(p.lastSeen)
    };
  }

  subscribe(watcherId, targetId) {
    if (!this.subscribers.has(targetId)) {
      this.subscribers.set(targetId, new Set());
    }
    this.subscribers.get(targetId).add(watcherId);
  }

  _notifySubscribers(userId, status) {
    const subs = this.subscribers.get(userId);
    if (subs) {
      // In real system, push notification to each subscriber's WebSocket
      return Array.from(subs);
    }
    return [];
  }

  _formatLastSeen(timestamp) {
    if (!timestamp) return "Never";
    const diff = Date.now() - timestamp;
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return `${Math.floor(diff / 86400000)} days ago`;
  }
}

const presence = new PresenceService();

// Family presence simulation
console.log("Family Presence Status:");
const presenceData = [
  { id: "grandpa_sharma", action: "offline" },
  { id: "papa_sharma", action: "online" },
  { id: "mummy_sharma", action: "online" },
  { id: "rahul_sharma", action: "online" },
  { id: "priya_sharma", action: "online" },
  { id: "chacha_sharma", action: "offline" },
  { id: "chachi_sharma", action: "online" },
  { id: "dadi_sharma", action: "offline" }
];

presenceData.forEach(p => {
  if (p.action === "online") presence.goOnline(p.id);
  else presence.goOffline(p.id);
});

presenceData.forEach(p => {
  const status = presence.getPresence(p.id);
  const icon = status.status === "online" ? "[ONLINE]" : "[OFFLINE]";
  const lastSeen = status.status === "offline" ? ` (Last seen: ${status.lastSeenFormatted})` : "";
  console.log(`  ${icon.padEnd(10)} ${p.id.padEnd(18)} ${lastSeen}`);
});

console.log("\n  Privacy Settings (would add):");
console.log("    - Nobody: Hide last seen from everyone");
console.log("    - Contacts: Show only to contacts");
console.log("    - Everyone: Show to all (default)");

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 7 — Group Chat Fan-Out
// ════════════════════════════════════════════════════════════════

// WHY: Sending one group message to 47 members requires fan-out to each device.

console.log("SECTION 7 — Group Chat Fan-Out");
console.log("-".repeat(50));

class GroupChat {
  constructor(groupId, name, creatorId) {
    this.groupId = groupId;
    this.name = name;
    this.members = new Set([creatorId]);
    this.admins = new Set([creatorId]);
    this.messages = [];
    this.createdAt = Date.now();
  }

  addMember(userId, addedBy) {
    if (!this.admins.has(addedBy)) {
      return { success: false, reason: "Only admins can add members" };
    }
    this.members.add(userId);
    return { success: true };
  }

  removeMember(userId, removedBy) {
    if (!this.admins.has(removedBy) && userId !== removedBy) {
      return { success: false, reason: "Only admins can remove members" };
    }
    this.members.delete(userId);
    this.admins.delete(userId);
    return { success: true };
  }
}

class GroupChatService {
  constructor(connectionManager, presenceService) {
    this.groups = new Map();
    this.connManager = connectionManager;
    this.presenceService = presenceService;
    this.fanOutLog = [];
  }

  createGroup(groupId, name, creatorId) {
    const group = new GroupChat(groupId, name, creatorId);
    this.groups.set(groupId, group);
    return group;
  }

  sendGroupMessage(groupId, senderId, content) {
    const group = this.groups.get(groupId);
    if (!group || !group.members.has(senderId)) {
      return { success: false, reason: "Not a member" };
    }

    const message = {
      id: `gmsg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      groupId,
      senderId,
      content,
      timestamp: Date.now(),
      deliveredTo: new Set(),
      readBy: new Set()
    };

    group.messages.push(message);

    // Fan-out: send to each member (except sender)
    const fanOutResults = { online: [], offline: [], total: 0 };

    for (const memberId of group.members) {
      if (memberId === senderId) continue;
      fanOutResults.total++;

      const memberPresence = this.presenceService.getPresence(memberId);
      if (memberPresence.status === "online") {
        // Deliver immediately via WebSocket
        message.deliveredTo.add(memberId);
        fanOutResults.online.push(memberId);
      } else {
        // Queue for offline delivery
        fanOutResults.offline.push(memberId);
      }
    }

    this.fanOutLog.push({
      messageId: message.id,
      groupId,
      fanOutCount: fanOutResults.total,
      onlineDelivered: fanOutResults.online.length,
      offlineQueued: fanOutResults.offline.length
    });

    return { success: true, message, fanOutResults };
  }
}

const groupService = new GroupChatService(connManager, presence);

// Create Sharma Parivar group
const sharmaParivar = groupService.createGroup("sharma_family", "Sharma Parivar", "papa_sharma");

// Add family members
const groupMembers = ["mummy_sharma", "grandpa_sharma", "dadi_sharma", "rahul_sharma",
                      "priya_sharma", "chacha_sharma", "chachi_sharma"];
groupMembers.forEach(m => sharmaParivar.addMember(m, "papa_sharma"));

console.log(`Group "${sharmaParivar.name}" created with ${sharmaParivar.members.size} members`);

// Send messages and observe fan-out
const groupMessages = [
  { sender: "mummy_sharma", content: "Kal Diwali ki shopping chalein?" },
  { sender: "rahul_sharma", content: "Main bhi aaunga!" },
  { sender: "chacha_sharma", content: "Hum bhi aa rahe hain" }
];

console.log("\nGroup messages with fan-out:");
groupMessages.forEach(gm => {
  const result = groupService.sendGroupMessage("sharma_family", gm.sender, gm.content);
  if (result.success) {
    const fr = result.fanOutResults;
    console.log(`  ${gm.sender.split("_")[0]}: "${gm.content}"`);
    console.log(`    Fan-out: ${fr.total} members | ${fr.online.length} online (instant) | ${fr.offline.length} offline (queued)`);
  }
});

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Message Storage and Retrieval
// ════════════════════════════════════════════════════════════════

// WHY: Efficient storage and retrieval patterns determine chat history load times.

console.log("SECTION 8 — Message Storage and Retrieval");
console.log("-".repeat(50));

class ChatStorage {
  constructor() {
    this.messages = []; // In production: partitioned by conversation + time
    this.indexes = {
      byConversation: new Map(), // convId -> [indices]
      bySender: new Map(),       // senderId -> [indices]
      byTimestamp: []             // sorted by time
    };
  }

  store(msg) {
    const idx = this.messages.length;
    this.messages.push(msg);

    // Index by conversation
    const convId = msg.groupId || [msg.senderId, msg.recipientId].sort().join(":");
    if (!this.indexes.byConversation.has(convId)) {
      this.indexes.byConversation.set(convId, []);
    }
    this.indexes.byConversation.get(convId).push(idx);

    // Index by sender
    if (!this.indexes.bySender.has(msg.senderId)) {
      this.indexes.bySender.set(msg.senderId, []);
    }
    this.indexes.bySender.get(msg.senderId).push(idx);

    return idx;
  }

  // Cursor-based pagination for chat history
  getHistory(convId, cursor = null, limit = 10) {
    const indices = this.indexes.byConversation.get(convId) || [];

    let startIdx = indices.length; // Start from end (newest)
    if (cursor !== null) {
      startIdx = indices.indexOf(cursor);
      if (startIdx === -1) startIdx = indices.length;
    }

    const from = Math.max(0, startIdx - limit);
    const slice = indices.slice(from, startIdx);

    return {
      messages: slice.map(i => this.messages[i]),
      nextCursor: from > 0 ? indices[from] : null,
      hasMore: from > 0
    };
  }

  getStorageStats() {
    return {
      totalMessages: this.messages.length,
      conversations: this.indexes.byConversation.size,
      uniqueSenders: this.indexes.bySender.size
    };
  }
}

const chatStorage = new ChatStorage();

// Store a series of messages
const chatHistory = [
  { senderId: "rahul_sharma", recipientId: "priya_sharma", content: "Kal exam hai?", groupId: null, timestamp: Date.now() - 5000 },
  { senderId: "priya_sharma", recipientId: "rahul_sharma", content: "Haan, physics", groupId: null, timestamp: Date.now() - 4000 },
  { senderId: "rahul_sharma", recipientId: "priya_sharma", content: "Notes bhej do", groupId: null, timestamp: Date.now() - 3000 },
  { senderId: "priya_sharma", recipientId: "rahul_sharma", content: "WhatsApp pe bhejti hoon", groupId: null, timestamp: Date.now() - 2000 },
  { senderId: "rahul_sharma", recipientId: "priya_sharma", content: "Thanks!", groupId: null, timestamp: Date.now() - 1000 }
];

chatHistory.forEach(m => chatStorage.store(m));

const convId = "priya_sharma:rahul_sharma";
console.log(`Chat history for "${convId}":`);
const history = chatStorage.getHistory(convId, null, 3);
console.log(`  Latest 3 messages (cursor pagination):`);
history.messages.forEach(m => {
  console.log(`    ${m.senderId.split("_")[0]}: ${m.content}`);
});
console.log(`  Has more: ${history.hasMore}, Next cursor: ${history.nextCursor}`);

if (history.hasMore) {
  const older = chatStorage.getHistory(convId, history.nextCursor, 3);
  console.log(`\n  Older messages:`);
  older.messages.forEach(m => {
    console.log(`    ${m.senderId.split("_")[0]}: ${m.content}`);
  });
}

const storageStats = chatStorage.getStorageStats();
console.log(`\n  Storage Stats: ${storageStats.totalMessages} messages, ${storageStats.conversations} conversations`);

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 9 — Offline Message Queue
// ════════════════════════════════════════════════════════════════

// WHY: Grandpa's JioPhone drops 2G often. Messages must queue and deliver later.

console.log("SECTION 9 — Offline Message Queue");
console.log("-".repeat(50));

class OfflineQueue {
  constructor() {
    this.queues = new Map(); // userId -> [messages]
    this.maxQueueSize = 1000;
  }

  enqueue(userId, message) {
    if (!this.queues.has(userId)) {
      this.queues.set(userId, []);
    }
    const queue = this.queues.get(userId);

    if (queue.length >= this.maxQueueSize) {
      // Remove oldest if full
      queue.shift();
    }
    queue.push({
      ...message,
      queuedAt: Date.now()
    });
    return queue.length;
  }

  // Drain queue when user comes online
  drain(userId) {
    const queue = this.queues.get(userId) || [];
    this.queues.set(userId, []);
    return {
      messages: queue,
      count: queue.length,
      oldestAge: queue.length > 0 ? Date.now() - queue[0].queuedAt : 0
    };
  }

  getQueueSize(userId) {
    return (this.queues.get(userId) || []).length;
  }

  getTotalQueued() {
    let total = 0;
    for (const q of this.queues.values()) total += q.length;
    return total;
  }
}

const offlineQueue = new OfflineQueue();

// Grandpa is offline — queue messages for him
console.log("Grandpa is offline. Messages being queued:");
const messagesForGrandpa = [
  { senderId: "mummy_sharma", content: "Dadaji, aapne dawai li?", timestamp: Date.now() - 60000 },
  { senderId: "rahul_sharma", content: "Dadaji pranam!", timestamp: Date.now() - 45000 },
  { senderId: "papa_sharma", content: "Papa, main aaj aaunga", timestamp: Date.now() - 30000 },
  { senderId: "chachi_sharma", content: "Babuji, Navratri ki badhai!", timestamp: Date.now() - 15000 },
  { senderId: "priya_sharma", content: "Dadaji ko meri taraf se namaste", timestamp: Date.now() - 5000 }
];

messagesForGrandpa.forEach(m => {
  const size = offlineQueue.enqueue("grandpa_sharma", m);
  console.log(`  [Queue: ${size}] ${m.senderId.split("_")[0]}: "${m.content}"`);
});

// Grandpa reconnects
console.log("\nGrandpa reconnects (2G restored):");
const drained = offlineQueue.drain("grandpa_sharma");
console.log(`  Delivering ${drained.count} queued messages:`);
drained.messages.forEach((m, i) => {
  const age = Math.round((Date.now() - m.timestamp) / 1000);
  console.log(`    ${i + 1}. ${m.senderId.split("_")[0]}: "${m.content}" (${age}s ago)`);
});
console.log(`  Queue now empty: ${offlineQueue.getQueueSize("grandpa_sharma")} messages`);

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 10 — Full Chat System Simulation
// ════════════════════════════════════════════════════════════════

// WHY: Integration test showing all components working together.

console.log("SECTION 10 — Full Chat System Simulation");
console.log("-".repeat(50));

class ChatServer {
  constructor() {
    this.connManager = new ConnectionManager();
    this.presence = new PresenceService();
    this.messageStore = new MessageStore();
    this.deliveryTracker = new DeliveryTracker(this.connManager);
    this.offlineQueue = new OfflineQueue();
    this.groupService = new GroupChatService(this.connManager, this.presence);
    this.eventLog = [];
  }

  userConnect(userId, device) {
    this.connManager.connect(userId, { device });
    this.presence.goOnline(userId);

    // Deliver queued messages
    const queued = this.offlineQueue.drain(userId);
    this.eventLog.push({ type: "connect", userId, queuedMessages: queued.count });
    return queued;
  }

  userDisconnect(userId) {
    this.connManager.disconnect(userId);
    this.presence.goOffline(userId);
    this.eventLog.push({ type: "disconnect", userId });
  }

  sendMessage(senderId, recipientId, content) {
    const msg = new Message(senderId, recipientId, content);
    this.messageStore.store(msg);

    // Mark sent
    this.deliveryTracker.markSent(msg.id, senderId);
    let status = "sent";

    // Check if recipient is online
    const recipientPresence = this.presence.getPresence(recipientId);
    if (recipientPresence.status === "online") {
      this.deliveryTracker.markDelivered(msg.id);
      status = "delivered";
    } else {
      this.offlineQueue.enqueue(recipientId, {
        messageId: msg.id,
        senderId,
        content,
        timestamp: msg.timestamp
      });
      status = "queued";
    }

    this.eventLog.push({ type: "message", senderId, recipientId, status, messageId: msg.id });
    return { msg, status };
  }

  getEventSummary() {
    const summary = { connects: 0, disconnects: 0, messages: 0, delivered: 0, queued: 0 };
    this.eventLog.forEach(e => {
      if (e.type === "connect") summary.connects++;
      else if (e.type === "disconnect") summary.disconnects++;
      else if (e.type === "message") {
        summary.messages++;
        if (e.status === "delivered") summary.delivered++;
        if (e.status === "queued") summary.queued++;
      }
    });
    return summary;
  }
}

const server = new ChatServer();

console.log("=== Sharma Family Evening Chat Simulation ===\n");

// Everyone comes online except grandpa
console.log("Phase 1: Family members come online");
["papa_sharma", "mummy_sharma", "rahul_sharma", "priya_sharma", "chachi_sharma"].forEach(id => {
  const queued = server.userConnect(id, "Android");
  console.log(`  ${id.split("_")[0]} connected (${queued.count} queued msgs)`);
});
console.log("  grandpa_sharma stays OFFLINE (charging phone)");

// Messages fly
console.log("\nPhase 2: Messages exchanged");
const chatMessages = [
  ["mummy_sharma", "papa_sharma", "Ghar aate waqt doodh le aana"],
  ["papa_sharma", "mummy_sharma", "Ok, aur kuch chahiye?"],
  ["rahul_sharma", "priya_sharma", "IPL ka score dekha?"],
  ["priya_sharma", "rahul_sharma", "Haan! CSK jeet rahi hai!"],
  ["mummy_sharma", "grandpa_sharma", "Dadaji dinner ready hai"],
  ["rahul_sharma", "grandpa_sharma", "Dadaji IPL dekho!"]
];

chatMessages.forEach(([from, to, content]) => {
  const result = server.sendMessage(from, to, content);
  const tick = result.status === "delivered" ? "\u2713\u2713" : "\u2713";
  console.log(`  ${tick} ${from.split("_")[0]} -> ${to.split("_")[0]}: "${content}" [${result.status}]`);
});

// Grandpa comes online
console.log("\nPhase 3: Grandpa comes online");
const grandpaQueued = server.userConnect("grandpa_sharma", "JioPhone");
console.log(`  grandpa_sharma connected! ${grandpaQueued.count} messages waiting:`);
grandpaQueued.messages.forEach(m => {
  console.log(`    From ${m.senderId.split("_")[0]}: "${m.content}"`);
});

const eventSummary = server.getEventSummary();
console.log("\nEvent Summary:");
console.log(`  Connections: ${eventSummary.connects}`);
console.log(`  Messages: ${eventSummary.messages} (${eventSummary.delivered} delivered, ${eventSummary.queued} queued)`);

console.log();

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════

console.log("=".repeat(70));
console.log("  KEY TAKEAWAYS");
console.log("=".repeat(70));
console.log();
console.log("  1. WebSocket connections require heartbeat to detect stale connections");
console.log("  2. Sequence numbers guarantee message ordering despite network reordering");
console.log("  3. Delivery receipts (sent/delivered/read) need per-message state tracking");
console.log("  4. Presence uses heartbeat with timeout — no heartbeat = offline");
console.log("  5. Group fan-out sends one message to N members — O(N) per group message");
console.log("  6. Offline queues hold messages until user reconnects and drains");
console.log("  7. Cursor-based pagination loads chat history efficiently");
console.log("  8. Indian family groups (50+ members) stress fan-out and notification systems");
console.log();
console.log('  "In an Indian family group, the real scaling challenge is not');
console.log('   messages per second — it is good morning images per sunrise."');
console.log('   — Sharma Parivar Group Admin');
console.log();
