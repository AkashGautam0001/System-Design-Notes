/** ============================================================
 *  FILE 30: DESIGN A NOTIFICATION SYSTEM
 *  ============================================================
 *  Topic: Multi-channel delivery (push/SMS/email), priority queues,
 *         template engine, user preferences, rate limiting
 *
 *  WHY THIS MATTERS:
 *  Notification systems are the bridge between services and users.
 *  Swiggy sends 100M+ notifications daily across push, SMS, and
 *  email. Too many notifications cause opt-outs, too few cause
 *  missed orders. Smart routing, rate limiting, and prioritization
 *  determine if users stay engaged or uninstall the app.
 *  ============================================================ */

// STORY: Swiggy Order Notifications
// When Rahul orders biryani on Swiggy, the notification system fires
// a carefully orchestrated sequence: push notification "Order Confirmed",
// SMS backup if push fails (because Rahul might have notifications off),
// push "Delivery partner assigned — Raju is on the way", push "Arriving
// in 5 minutes", and finally an email receipt after delivery. Each
// notification uses templates, respects Rahul's channel preferences,
// and never exceeds rate limits even during IPL final night when
// 10 million orders flood in simultaneously.

console.log("=".repeat(70));
console.log("  FILE 30: DESIGN A NOTIFICATION SYSTEM");
console.log("=".repeat(70));
console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 1 — Requirements Analysis
// ════════════════════════════════════════════════════════════════

// WHY: Notification systems must balance urgency, relevance, and user tolerance.

console.log("SECTION 1 — Requirements Analysis");
console.log("-".repeat(50));

const notifRequirements = {
  functional: [
    "Support push notification, SMS, and email channels",
    "Template-based notification content",
    "User preference management (opt-in/opt-out per channel)",
    "Priority levels (critical, high, medium, low)",
    "Delivery tracking and status",
    "Batch notifications for digests"
  ],
  nonFunctional: [
    "Critical notifications delivered within 1 second",
    "Support 100M+ notifications per day",
    "Rate limit per user to prevent spam",
    "99.9% delivery rate for critical notifications",
    "Fallback channels if primary fails"
  ],
  channels: {
    push:  { latency: "100ms",  cost: "Free",     reach: "App installed" },
    sms:   { latency: "2-5s",   cost: "Rs 0.15/msg", reach: "Any phone" },
    email: { latency: "5-30s",  cost: "Rs 0.01/msg", reach: "Has email" }
  }
};

console.log("Channel Comparison:");
console.log(`  ${"Channel".padEnd(10)} ${"Latency".padEnd(12)} ${"Cost".padEnd(15)} ${"Reach"}`);
console.log("  " + "-".repeat(50));
Object.entries(notifRequirements.channels).forEach(([ch, info]) => {
  console.log(`  ${ch.padEnd(10)} ${info.latency.padEnd(12)} ${info.cost.padEnd(15)} ${info.reach}`);
});

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 2 — Notification Types and Channels
// ════════════════════════════════════════════════════════════════

// WHY: Different events need different channels and urgency levels.

console.log("SECTION 2 — Notification Types and Channels");
console.log("-".repeat(50));

class NotificationType {
  constructor(type, defaultChannels, priority, category) {
    this.type = type;
    this.defaultChannels = defaultChannels;
    this.priority = priority; // 1=critical, 2=high, 3=medium, 4=low
    this.category = category;
  }
}

const notificationTypes = {
  ORDER_CONFIRMED: new NotificationType(
    "ORDER_CONFIRMED", ["push", "sms"], 1, "order"
  ),
  DELIVERY_ASSIGNED: new NotificationType(
    "DELIVERY_ASSIGNED", ["push"], 2, "order"
  ),
  DELIVERY_ARRIVING: new NotificationType(
    "DELIVERY_ARRIVING", ["push"], 1, "order"
  ),
  ORDER_DELIVERED: new NotificationType(
    "ORDER_DELIVERED", ["push", "email"], 2, "order"
  ),
  PAYMENT_RECEIVED: new NotificationType(
    "PAYMENT_RECEIVED", ["push", "sms"], 1, "payment"
  ),
  PAYMENT_FAILED: new NotificationType(
    "PAYMENT_FAILED", ["push", "sms", "email"], 1, "payment"
  ),
  PROMO_OFFER: new NotificationType(
    "PROMO_OFFER", ["push", "email"], 4, "marketing"
  ),
  DAILY_DIGEST: new NotificationType(
    "DAILY_DIGEST", ["email"], 4, "digest"
  ),
  OTP_CODE: new NotificationType(
    "OTP_CODE", ["sms"], 1, "auth"
  ),
  RATING_REQUEST: new NotificationType(
    "RATING_REQUEST", ["push"], 3, "engagement"
  )
};

console.log("Notification Type Registry:");
console.log(`  ${"Type".padEnd(22)} ${"Priority".padEnd(10)} ${"Channels".padEnd(25)} ${"Category"}`);
console.log("  " + "-".repeat(70));
Object.entries(notificationTypes).forEach(([key, nt]) => {
  const prioLabel = ["", "CRITICAL", "HIGH", "MEDIUM", "LOW"][nt.priority];
  console.log(`  ${key.padEnd(22)} ${prioLabel.padEnd(10)} ${nt.defaultChannels.join(", ").padEnd(25)} ${nt.category}`);
});

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 3 — Priority Queue Implementation
// ════════════════════════════════════════════════════════════════

// WHY: OTP and order alerts must jump ahead of promotional notifications.

console.log("SECTION 3 — Priority Queue");
console.log("-".repeat(50));

class PriorityQueue {
  constructor() {
    this.queues = {
      1: [], // Critical
      2: [], // High
      3: [], // Medium
      4: []  // Low
    };
    this.totalEnqueued = 0;
    this.totalDequeued = 0;
  }

  enqueue(item, priority) {
    if (!this.queues[priority]) {
      this.queues[priority] = [];
    }
    this.queues[priority].push({
      ...item,
      enqueuedAt: Date.now(),
      priority
    });
    this.totalEnqueued++;
  }

  dequeue() {
    // Always process highest priority first (1 = critical)
    for (let p = 1; p <= 4; p++) {
      if (this.queues[p] && this.queues[p].length > 0) {
        this.totalDequeued++;
        return this.queues[p].shift();
      }
    }
    return null;
  }

  peek() {
    for (let p = 1; p <= 4; p++) {
      if (this.queues[p] && this.queues[p].length > 0) {
        return this.queues[p][0];
      }
    }
    return null;
  }

  size() {
    let total = 0;
    for (let p = 1; p <= 4; p++) {
      total += (this.queues[p] || []).length;
    }
    return total;
  }

  getStats() {
    const stats = {};
    for (let p = 1; p <= 4; p++) {
      const label = ["", "critical", "high", "medium", "low"][p];
      stats[label] = (this.queues[p] || []).length;
    }
    stats.total = this.size();
    stats.totalEnqueued = this.totalEnqueued;
    stats.totalDequeued = this.totalDequeued;
    return stats;
  }
}

const notifQueue = new PriorityQueue();

// Enqueue notifications in mixed order
console.log("Enqueueing notifications (mixed priorities):");
const queueItems = [
  { userId: "rahul", type: "PROMO_OFFER",      message: "50% off on biryani!", priority: 4 },
  { userId: "priya", type: "ORDER_CONFIRMED",   message: "Order #123 confirmed", priority: 1 },
  { userId: "amit",  type: "DAILY_DIGEST",      message: "Your daily summary", priority: 4 },
  { userId: "rahul", type: "OTP_CODE",          message: "OTP: 847291", priority: 1 },
  { userId: "priya", type: "DELIVERY_ASSIGNED", message: "Raju is on the way", priority: 2 },
  { userId: "rahul", type: "RATING_REQUEST",    message: "Rate your order", priority: 3 }
];

queueItems.forEach(item => {
  notifQueue.enqueue(item, item.priority);
  const label = ["", "CRITICAL", "HIGH", "MEDIUM", "LOW"][item.priority];
  console.log(`  [${label.padEnd(8)}] ${item.userId}: ${item.message}`);
});

console.log("\nDequeuing (highest priority first):");
let dequeuedItem;
let order = 1;
while ((dequeuedItem = notifQueue.dequeue()) !== null) {
  const label = ["", "CRITICAL", "HIGH", "MEDIUM", "LOW"][dequeuedItem.priority];
  console.log(`  ${order}. [${label.padEnd(8)}] ${dequeuedItem.userId}: ${dequeuedItem.message}`);
  order++;
}
// Output: Critical items first, then high, medium, low

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 4 — Template Engine
// ════════════════════════════════════════════════════════════════

// WHY: Templates ensure consistent messaging and easy localization.

console.log("SECTION 4 — Template Engine");
console.log("-".repeat(50));

class TemplateEngine {
  constructor() {
    this.templates = new Map();
  }

  register(templateId, template) {
    this.templates.set(templateId, template);
  }

  render(templateId, variables) {
    const template = this.templates.get(templateId);
    if (!template) {
      return { success: false, error: `Template ${templateId} not found` };
    }

    const rendered = {};
    for (const [channel, channelTemplate] of Object.entries(template.channels)) {
      let title = channelTemplate.title || "";
      let body = channelTemplate.body || "";

      // Replace {{variable}} placeholders
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        title = title.split(placeholder).join(String(value));
        body = body.split(placeholder).join(String(value));
      }

      rendered[channel] = { title, body };
    }

    return { success: true, rendered };
  }
}

const templateEngine = new TemplateEngine();

// Register Swiggy notification templates
templateEngine.register("ORDER_CONFIRMED", {
  channels: {
    push: {
      title: "Order Confirmed!",
      body: "Your order #{{orderId}} from {{restaurant}} is confirmed. Total: Rs {{amount}}. ETA: {{eta}} mins."
    },
    sms: {
      title: "",
      body: "Swiggy: Order #{{orderId}} confirmed. {{restaurant}} - Rs {{amount}}. Arriving in {{eta}} mins. Track: {{trackUrl}}"
    },
    email: {
      title: "Order Confirmation - #{{orderId}}",
      body: "Dear {{userName}}, your order from {{restaurant}} has been confirmed.\n\nOrder Details:\n- Order ID: {{orderId}}\n- Amount: Rs {{amount}}\n- ETA: {{eta}} minutes\n\nTrack your order: {{trackUrl}}"
    }
  }
});

templateEngine.register("DELIVERY_ARRIVING", {
  channels: {
    push: {
      title: "Almost there!",
      body: "{{deliveryPerson}} is arriving in {{eta}} minutes with your order from {{restaurant}}!"
    },
    sms: {
      title: "",
      body: "Swiggy: {{deliveryPerson}} arriving in {{eta}} mins with your {{restaurant}} order."
    }
  }
});

templateEngine.register("PROMO_OFFER", {
  channels: {
    push: {
      title: "{{offerTitle}}",
      body: "{{offerDescription}} Use code: {{promoCode}}. Valid till {{expiry}}."
    },
    email: {
      title: "Special offer for you, {{userName}}!",
      body: "Hi {{userName}},\n\n{{offerDescription}}\n\nUse promo code: {{promoCode}}\nValid until: {{expiry}}\n\nOrder now on Swiggy!"
    }
  }
});

// Render templates
console.log("Template Rendering Examples:\n");

const orderVars = {
  orderId: "SW-78934",
  restaurant: "Paradise Biryani",
  amount: "450",
  eta: "35",
  userName: "Rahul",
  trackUrl: "swgy.in/t/78934"
};

const orderRendered = templateEngine.render("ORDER_CONFIRMED", orderVars);
if (orderRendered.success) {
  console.log("  ORDER_CONFIRMED Templates:");
  Object.entries(orderRendered.rendered).forEach(([channel, content]) => {
    console.log(`\n    [${channel.toUpperCase()}]`);
    if (content.title) console.log(`    Title: ${content.title}`);
    console.log(`    Body: ${content.body.substring(0, 100)}${content.body.length > 100 ? "..." : ""}`);
  });
}

console.log("\n");

const deliveryVars = {
  deliveryPerson: "Raju",
  eta: "3",
  restaurant: "Paradise Biryani"
};
const deliveryRendered = templateEngine.render("DELIVERY_ARRIVING", deliveryVars);
if (deliveryRendered.success) {
  console.log("  DELIVERY_ARRIVING Templates:");
  Object.entries(deliveryRendered.rendered).forEach(([channel, content]) => {
    console.log(`    [${channel.toUpperCase()}] ${content.body}`);
  });
}

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 5 — User Preference Management
// ════════════════════════════════════════════════════════════════

// WHY: Users must control which notifications they receive and on which channels.

console.log("SECTION 5 — User Preference Management");
console.log("-".repeat(50));

class UserPreferences {
  constructor() {
    this.preferences = new Map(); // userId -> preferences
  }

  setDefaults(userId) {
    this.preferences.set(userId, {
      channels: {
        push: { enabled: true, quietHoursStart: 23, quietHoursEnd: 7 },
        sms: { enabled: true, quietHoursStart: 22, quietHoursEnd: 8 },
        email: { enabled: true, quietHoursStart: null, quietHoursEnd: null }
      },
      categories: {
        order: { enabled: true, channels: ["push", "sms"] },
        payment: { enabled: true, channels: ["push", "sms"] },
        marketing: { enabled: true, channels: ["push"] },
        auth: { enabled: true, channels: ["sms"] },
        digest: { enabled: true, channels: ["email"] },
        engagement: { enabled: true, channels: ["push"] }
      },
      globalOptOut: false
    });
  }

  updatePreference(userId, category, settings) {
    const prefs = this.preferences.get(userId);
    if (prefs && prefs.categories[category]) {
      Object.assign(prefs.categories[category], settings);
    }
  }

  disableChannel(userId, channel) {
    const prefs = this.preferences.get(userId);
    if (prefs && prefs.channels[channel]) {
      prefs.channels[channel].enabled = false;
    }
  }

  getPreferences(userId) {
    return this.preferences.get(userId);
  }

  // Determine which channels to use for a notification
  resolveChannels(userId, notifType) {
    const prefs = this.preferences.get(userId);
    if (!prefs || prefs.globalOptOut) {
      return { channels: [], reason: "User opted out globally" };
    }

    const typeConfig = notificationTypes[notifType];
    if (!typeConfig) {
      return { channels: [], reason: "Unknown notification type" };
    }

    const categoryPref = prefs.categories[typeConfig.category];
    if (!categoryPref || !categoryPref.enabled) {
      return { channels: [], reason: `Category '${typeConfig.category}' disabled by user` };
    }

    // Filter channels: must be enabled globally AND in category preference AND in notification type defaults
    const currentHour = new Date().getHours();
    const resolvedChannels = [];
    const blockedChannels = [];

    typeConfig.defaultChannels.forEach(ch => {
      const channelPref = prefs.channels[ch];

      if (!channelPref || !channelPref.enabled) {
        blockedChannels.push({ channel: ch, reason: "Channel disabled" });
        return;
      }

      // Check quiet hours (except for critical notifications)
      if (typeConfig.priority > 1 && channelPref.quietHoursStart !== null) {
        const inQuietHours = channelPref.quietHoursStart > channelPref.quietHoursEnd
          ? (currentHour >= channelPref.quietHoursStart || currentHour < channelPref.quietHoursEnd)
          : (currentHour >= channelPref.quietHoursStart && currentHour < channelPref.quietHoursEnd);

        if (inQuietHours) {
          blockedChannels.push({ channel: ch, reason: "Quiet hours" });
          return;
        }
      }

      if (categoryPref.channels.includes(ch)) {
        resolvedChannels.push(ch);
      } else {
        blockedChannels.push({ channel: ch, reason: "Not in category preference" });
      }
    });

    return { channels: resolvedChannels, blocked: blockedChannels };
  }
}

const userPrefs = new UserPreferences();

// Set up users
userPrefs.setDefaults("rahul");
userPrefs.setDefaults("priya");

// Rahul disables marketing push
userPrefs.updatePreference("rahul", "marketing", { enabled: false });

// Priya disables SMS
userPrefs.disableChannel("priya", "sms");

console.log("Channel Resolution Examples:\n");

const testNotifs = ["ORDER_CONFIRMED", "PROMO_OFFER", "OTP_CODE", "PAYMENT_FAILED"];

testNotifs.forEach(type => {
  console.log(`  ${type}:`);

  const rahulChannels = userPrefs.resolveChannels("rahul", type);
  console.log(`    Rahul -> Channels: [${rahulChannels.channels.join(", ") || "NONE"}]`);
  if (rahulChannels.blocked && rahulChannels.blocked.length > 0) {
    rahulChannels.blocked.forEach(b => {
      console.log(`             Blocked: ${b.channel} (${b.reason})`);
    });
  }
  if (rahulChannels.reason) {
    console.log(`             Reason: ${rahulChannels.reason}`);
  }

  const priyaChannels = userPrefs.resolveChannels("priya", type);
  console.log(`    Priya -> Channels: [${priyaChannels.channels.join(", ") || "NONE"}]`);
  if (priyaChannels.blocked && priyaChannels.blocked.length > 0) {
    priyaChannels.blocked.forEach(b => {
      console.log(`             Blocked: ${b.channel} (${b.reason})`);
    });
  }
  console.log();
});

// ════════════════════════════════════════════════════════════════
// SECTION 6 — Per-User Rate Limiting
// ════════════════════════════════════════════════════════════════

// WHY: Too many notifications = user uninstalls. Rate limiting protects user experience.

console.log("SECTION 6 — Per-User Rate Limiting");
console.log("-".repeat(50));

class RateLimiter {
  constructor() {
    this.limits = {
      push:  { perHour: 10, perDay: 30 },
      sms:   { perHour: 3,  perDay: 5 },
      email: { perHour: 2,  perDay: 10 }
    };
    this.counters = new Map(); // userId:channel -> { hourly, daily, hourReset, dayReset }
  }

  _getKey(userId, channel) {
    return `${userId}:${channel}`;
  }

  _getCounter(userId, channel) {
    const key = this._getKey(userId, channel);
    const now = Date.now();

    if (!this.counters.has(key)) {
      this.counters.set(key, {
        hourly: 0,
        daily: 0,
        hourReset: now + 3600000,
        dayReset: now + 86400000
      });
    }

    const counter = this.counters.get(key);

    // Reset if window expired
    if (now > counter.hourReset) {
      counter.hourly = 0;
      counter.hourReset = now + 3600000;
    }
    if (now > counter.dayReset) {
      counter.daily = 0;
      counter.dayReset = now + 86400000;
    }

    return counter;
  }

  // Returns true if notification is allowed, false if rate limited
  checkAndIncrement(userId, channel, priority) {
    // Critical notifications bypass rate limiting
    if (priority === 1) {
      return { allowed: true, reason: "Critical priority bypasses rate limit" };
    }

    const counter = this._getCounter(userId, channel);
    const limits = this.limits[channel];

    if (!limits) {
      return { allowed: true, reason: "No limits configured for channel" };
    }

    if (counter.hourly >= limits.perHour) {
      return {
        allowed: false,
        reason: `Hourly limit reached (${counter.hourly}/${limits.perHour})`,
        retryAfter: "Next hour window"
      };
    }

    if (counter.daily >= limits.perDay) {
      return {
        allowed: false,
        reason: `Daily limit reached (${counter.daily}/${limits.perDay})`,
        retryAfter: "Next day"
      };
    }

    counter.hourly++;
    counter.daily++;

    return {
      allowed: true,
      remaining: {
        hourly: limits.perHour - counter.hourly,
        daily: limits.perDay - counter.daily
      }
    };
  }

  getStatus(userId, channel) {
    const counter = this._getCounter(userId, channel);
    const limits = this.limits[channel];
    return {
      hourly: `${counter.hourly}/${limits.perHour}`,
      daily: `${counter.daily}/${limits.perDay}`
    };
  }
}

const rateLimiter = new RateLimiter();

console.log("Rate limits per channel:");
Object.entries(rateLimiter.limits).forEach(([ch, limits]) => {
  console.log(`  ${ch.padEnd(8)} ${limits.perHour}/hour, ${limits.perDay}/day`);
});

// Simulate Swiggy IPL night — lots of promos
console.log("\nIPL final night: Swiggy sends many promos to Rahul:");
for (let i = 1; i <= 15; i++) {
  const result = rateLimiter.checkAndIncrement("rahul", "push", 4); // Low priority promo
  if (i <= 5 || i >= 10) {
    const status = result.allowed ? "ALLOWED" : "BLOCKED";
    const detail = result.allowed
      ? `(remaining: ${result.remaining.hourly}/hr)`
      : `(${result.reason})`;
    console.log(`  Push #${String(i).padStart(2)}: ${status} ${detail}`);
  } else if (i === 6) {
    console.log("  ... (pushes 6-9) ...");
  }
}

// Critical notification always goes through
console.log("\nCritical OTP bypasses rate limit:");
const otpResult = rateLimiter.checkAndIncrement("rahul", "sms", 1);
console.log(`  OTP SMS: ${otpResult.allowed ? "ALLOWED" : "BLOCKED"} (${otpResult.reason})`);

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 7 — Notification Routing Logic
// ════════════════════════════════════════════════════════════════

// WHY: Routing decides which channel to use based on preferences, limits, and fallback.

console.log("SECTION 7 — Notification Routing Logic");
console.log("-".repeat(50));

class NotificationRouter {
  constructor(preferences, rateLimiter, templateEngine) {
    this.preferences = preferences;
    this.rateLimiter = rateLimiter;
    this.templateEngine = templateEngine;
    this.deliveryLog = [];
  }

  route(userId, notifType, variables) {
    const routingResult = {
      userId,
      notifType,
      timestamp: Date.now(),
      deliveries: [],
      skipped: []
    };

    // Step 1: Resolve channels based on user preferences
    const channelResolution = this.preferences.resolveChannels(userId, notifType);

    if (channelResolution.channels.length === 0) {
      routingResult.skipped.push({
        reason: channelResolution.reason || "No channels available"
      });
      this.deliveryLog.push(routingResult);
      return routingResult;
    }

    // Step 2: Get notification type config for priority
    const typeConfig = notificationTypes[notifType];

    // Step 3: For each resolved channel, check rate limit and render
    channelResolution.channels.forEach(channel => {
      // Rate limit check
      const rateCheck = this.rateLimiter.checkAndIncrement(userId, channel, typeConfig.priority);

      if (!rateCheck.allowed) {
        routingResult.skipped.push({
          channel,
          reason: rateCheck.reason
        });
        return;
      }

      // Render template
      const rendered = this.templateEngine.render(notifType, variables);
      const content = rendered.success && rendered.rendered[channel]
        ? rendered.rendered[channel]
        : { title: notifType, body: JSON.stringify(variables) };

      routingResult.deliveries.push({
        channel,
        title: content.title,
        body: content.body,
        priority: typeConfig.priority,
        status: "delivered",
        deliveredAt: Date.now()
      });
    });

    // Step 4: If primary channel failed, try fallback
    if (routingResult.deliveries.length === 0 && routingResult.skipped.length > 0) {
      // Fallback to email (least restricted)
      const fallbackCheck = this.rateLimiter.checkAndIncrement(userId, "email", typeConfig.priority);
      if (fallbackCheck.allowed) {
        routingResult.deliveries.push({
          channel: "email",
          title: notifType,
          body: `Notification: ${notifType}`,
          priority: typeConfig.priority,
          status: "delivered_fallback",
          deliveredAt: Date.now()
        });
      }
    }

    this.deliveryLog.push(routingResult);
    return routingResult;
  }

  getDeliveryStats() {
    let total = 0;
    let delivered = 0;
    let skipped = 0;
    const byChannel = {};

    this.deliveryLog.forEach(log => {
      total++;
      log.deliveries.forEach(d => {
        delivered++;
        byChannel[d.channel] = (byChannel[d.channel] || 0) + 1;
      });
      skipped += log.skipped.length;
    });

    return { total, delivered, skipped, byChannel };
  }
}

// Reset rate limiter for fresh demo
const routerRateLimiter = new RateLimiter();

const router = new NotificationRouter(userPrefs, routerRateLimiter, templateEngine);

console.log("Routing Swiggy order notifications for Rahul:\n");

const orderFlow = [
  {
    type: "ORDER_CONFIRMED",
    vars: { orderId: "SW-78934", restaurant: "Paradise Biryani", amount: "450", eta: "35", userName: "Rahul", trackUrl: "swgy.in/t/78934" }
  },
  {
    type: "DELIVERY_ASSIGNED",
    vars: { deliveryPerson: "Raju", eta: "30", restaurant: "Paradise Biryani" }
  },
  {
    type: "DELIVERY_ARRIVING",
    vars: { deliveryPerson: "Raju", eta: "3", restaurant: "Paradise Biryani" }
  },
  {
    type: "ORDER_DELIVERED",
    vars: { orderId: "SW-78934", restaurant: "Paradise Biryani", userName: "Rahul" }
  },
  {
    type: "RATING_REQUEST",
    vars: { restaurant: "Paradise Biryani", orderId: "SW-78934" }
  }
];

orderFlow.forEach(notif => {
  const result = router.route("rahul", notif.type, notif.vars);
  console.log(`  ${notif.type}:`);
  result.deliveries.forEach(d => {
    console.log(`    [${d.channel.toUpperCase()}] ${d.title || "(no title)"}: ${(d.body || "").substring(0, 60)}...`);
  });
  result.skipped.forEach(s => {
    console.log(`    [SKIPPED] ${s.channel || "all"}: ${s.reason}`);
  });
});

const routerStats = router.getDeliveryStats();
console.log(`\n  Routing Stats: ${routerStats.delivered} delivered, ${routerStats.skipped} skipped`);
console.log(`  By channel:`, routerStats.byChannel);

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 8 — Delivery Tracking
// ════════════════════════════════════════════════════════════════

// WHY: We must know if notifications actually reached the user.

console.log("SECTION 8 — Delivery Tracking");
console.log("-".repeat(50));

class DeliveryTracker {
  constructor() {
    this.deliveries = new Map(); // notifId -> tracking info
  }

  track(notifId, channel, userId) {
    this.deliveries.set(notifId, {
      notifId,
      channel,
      userId,
      states: [{ state: "QUEUED", timestamp: Date.now() }],
      currentState: "QUEUED"
    });
  }

  updateState(notifId, state) {
    const delivery = this.deliveries.get(notifId);
    if (delivery) {
      delivery.states.push({ state, timestamp: Date.now() });
      delivery.currentState = state;
    }
  }

  getDeliveryReport() {
    const report = {
      total: this.deliveries.size,
      byState: {},
      avgDeliveryTime: 0,
      channelStats: {}
    };

    let totalDeliveryTime = 0;
    let deliveredCount = 0;

    for (const [, delivery] of this.deliveries) {
      report.byState[delivery.currentState] = (report.byState[delivery.currentState] || 0) + 1;

      if (!report.channelStats[delivery.channel]) {
        report.channelStats[delivery.channel] = { total: 0, delivered: 0, failed: 0 };
      }
      report.channelStats[delivery.channel].total++;

      if (delivery.currentState === "DELIVERED" || delivery.currentState === "READ") {
        report.channelStats[delivery.channel].delivered++;
        const queuedAt = delivery.states[0].timestamp;
        const deliveredAt = delivery.states.find(s => s.state === "DELIVERED")?.timestamp || Date.now();
        totalDeliveryTime += (deliveredAt - queuedAt);
        deliveredCount++;
      } else if (delivery.currentState === "FAILED") {
        report.channelStats[delivery.channel].failed++;
      }
    }

    report.avgDeliveryTime = deliveredCount > 0 ? Math.round(totalDeliveryTime / deliveredCount) : 0;
    return report;
  }
}

const deliveryTracker = new DeliveryTracker();

// Simulate notification delivery tracking
const notifIds = [];
for (let i = 0; i < 50; i++) {
  const notifId = `notif_${i}`;
  const channels = ["push", "sms", "email"];
  const channel = channels[i % 3];
  notifIds.push(notifId);

  deliveryTracker.track(notifId, channel, `user_${i % 10}`);
  deliveryTracker.updateState(notifId, "SENT");

  // Simulate delivery success/failure
  const rand = Math.random();
  if (rand > 0.15) {
    deliveryTracker.updateState(notifId, "DELIVERED");
    if (rand > 0.4) {
      deliveryTracker.updateState(notifId, "READ");
    }
  } else {
    deliveryTracker.updateState(notifId, "FAILED");
  }
}

const deliveryReport = deliveryTracker.getDeliveryReport();
console.log("Delivery Report (50 notifications):\n");
console.log(`  Total tracked: ${deliveryReport.total}`);
console.log(`  Avg delivery time: ${deliveryReport.avgDeliveryTime}ms`);
console.log("\n  By State:");
Object.entries(deliveryReport.byState).forEach(([state, count]) => {
  const pct = ((count / deliveryReport.total) * 100).toFixed(1);
  console.log(`    ${state.padEnd(12)} ${String(count).padStart(3)} (${pct}%)`);
});

console.log("\n  By Channel:");
Object.entries(deliveryReport.channelStats).forEach(([channel, stats]) => {
  const successRate = ((stats.delivered / stats.total) * 100).toFixed(1);
  console.log(`    ${channel.padEnd(8)} Total: ${stats.total}, Delivered: ${stats.delivered}, Failed: ${stats.failed} (${successRate}% success)`);
});

console.log();

// ════════════════════════════════════════════════════════════════
// SECTION 9 — Batch Notifications and Full System Simulation
// ════════════════════════════════════════════════════════════════

// WHY: End-to-end shows how all components work during a Swiggy order lifecycle.

console.log("SECTION 9 — Full Notification System Simulation");
console.log("-".repeat(50));

class NotificationService {
  constructor() {
    this.queue = new PriorityQueue();
    this.templateEngine = new TemplateEngine();
    this.preferences = new UserPreferences();
    this.rateLimiter = new RateLimiter();
    this.deliveryTracker = new DeliveryTracker();
    this.router = new NotificationRouter(this.preferences, this.rateLimiter, this.templateEngine);
    this.processedCount = 0;
    this.log = [];
  }

  registerUser(userId) {
    this.preferences.setDefaults(userId);
  }

  registerTemplate(id, template) {
    this.templateEngine.register(id, template);
  }

  send(userId, notifType, variables) {
    const typeConfig = notificationTypes[notifType];
    if (!typeConfig) {
      return { success: false, error: "Unknown notification type" };
    }

    // Enqueue with priority
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    this.queue.enqueue({
      notifId,
      userId,
      notifType,
      variables,
      createdAt: Date.now()
    }, typeConfig.priority);

    return { success: true, notifId, queued: true };
  }

  // Process all queued notifications
  processQueue() {
    const results = [];
    let item;

    while ((item = this.queue.dequeue()) !== null) {
      // Route the notification
      const routeResult = this.router.route(item.userId, item.notifType, item.variables);

      // Track delivery
      routeResult.deliveries.forEach(d => {
        const trackId = `${item.notifId}_${d.channel}`;
        this.deliveryTracker.track(trackId, d.channel, item.userId);
        this.deliveryTracker.updateState(trackId, "SENT");
        // Simulate delivery success
        if (Math.random() > 0.05) {
          this.deliveryTracker.updateState(trackId, "DELIVERED");
        }
      });

      this.processedCount++;
      results.push({
        notifId: item.notifId,
        userId: item.userId,
        type: item.notifType,
        priority: item.priority,
        deliveries: routeResult.deliveries.length,
        skipped: routeResult.skipped.length
      });
    }

    return results;
  }

  sendBatch(notifications) {
    const results = [];
    notifications.forEach(n => {
      const result = this.send(n.userId, n.type, n.variables);
      results.push(result);
    });
    return results;
  }

  getSystemStats() {
    const deliveryStats = this.deliveryTracker.getDeliveryReport();
    const routerStats = this.router.getDeliveryStats();
    return {
      processed: this.processedCount,
      queueSize: this.queue.size(),
      deliveryReport: deliveryStats,
      routerStats
    };
  }
}

const notifService = new NotificationService();

// Register users
["rahul", "priya", "amit", "neha", "vikram"].forEach(u => {
  notifService.registerUser(u);
});

// Register templates
notifService.registerTemplate("ORDER_CONFIRMED", {
  channels: {
    push: {
      title: "Order Confirmed!",
      body: "Order #{{orderId}} from {{restaurant}} confirmed. Rs {{amount}}. ETA: {{eta}} min."
    },
    sms: {
      title: "",
      body: "Swiggy: Order #{{orderId}} confirmed from {{restaurant}}. Rs {{amount}}. ETA: {{eta}} min."
    }
  }
});

notifService.registerTemplate("DELIVERY_ARRIVING", {
  channels: {
    push: {
      title: "Food arriving!",
      body: "{{deliveryPerson}} arriving in {{eta}} min with your {{restaurant}} order!"
    }
  }
});

console.log("=== Swiggy IPL Night Simulation ===\n");
console.log("Scenario: IPL final night, massive order surge\n");

// Simulate order notifications for multiple users
const iplOrders = [
  { userId: "rahul", type: "ORDER_CONFIRMED", variables: { orderId: "SW-001", restaurant: "Behrouz Biryani", amount: "599", eta: "40" } },
  { userId: "priya", type: "ORDER_CONFIRMED", variables: { orderId: "SW-002", restaurant: "Dominos", amount: "449", eta: "30" } },
  { userId: "amit", type: "ORDER_CONFIRMED", variables: { orderId: "SW-003", restaurant: "McDonald's", amount: "299", eta: "25" } },
  { userId: "neha", type: "ORDER_CONFIRMED", variables: { orderId: "SW-004", restaurant: "KFC", amount: "699", eta: "35" } },
  { userId: "vikram", type: "ORDER_CONFIRMED", variables: { orderId: "SW-005", restaurant: "Haldirams", amount: "350", eta: "20" } },
  { userId: "rahul", type: "DELIVERY_ARRIVING", variables: { deliveryPerson: "Raju", eta: "3", restaurant: "Behrouz Biryani" } },
  { userId: "priya", type: "DELIVERY_ARRIVING", variables: { deliveryPerson: "Suresh", eta: "5", restaurant: "Dominos" } },
  { userId: "rahul", type: "RATING_REQUEST", variables: { restaurant: "Behrouz Biryani", orderId: "SW-001" } },
  { userId: "rahul", type: "PROMO_OFFER", variables: { offerTitle: "IPL Special!", offerDescription: "Flat 60% off", promoCode: "IPL60", expiry: "Tonight", userName: "Rahul" } },
  { userId: "priya", type: "PROMO_OFFER", variables: { offerTitle: "Match Day Deal", offerDescription: "Buy 1 Get 1", promoCode: "MATCH2", expiry: "Tonight", userName: "Priya" } }
];

// Send all notifications
console.log(`Queuing ${iplOrders.length} notifications...\n`);
notifService.sendBatch(iplOrders);

console.log(`Queue status: ${notifService.queue.size()} notifications queued`);
const queueStats = notifService.queue.getStats();
console.log(`  Critical: ${queueStats.critical}, High: ${queueStats.high}, Medium: ${queueStats.medium}, Low: ${queueStats.low}\n`);

// Process queue
console.log("Processing queue (priority order):\n");
const processResults = notifService.processQueue();

processResults.forEach((r, i) => {
  const prioLabel = ["", "CRIT", "HIGH", "MED", "LOW"][r.priority];
  console.log(`  ${(i + 1).toString().padStart(2)}. [${prioLabel}] ${r.userId.padEnd(8)} ${r.type.padEnd(22)} -> ${r.deliveries} delivered, ${r.skipped} skipped`);
});

// System stats
const sysStats = notifService.getSystemStats();
console.log(`\nSystem Stats:`);
console.log(`  Processed: ${sysStats.processed}`);
console.log(`  Queue remaining: ${sysStats.queueSize}`);
console.log(`  Router stats: ${sysStats.routerStats.delivered} delivered, ${sysStats.routerStats.skipped} skipped`);

console.log();

// ════════════════════════════════════════════════════════════════
// KEY TAKEAWAYS
// ════════════════════════════════════════════════════════════════

console.log("=".repeat(70));
console.log("  KEY TAKEAWAYS");
console.log("=".repeat(70));
console.log();
console.log("  1. Priority queues ensure OTP and order alerts are sent before promos");
console.log("  2. Template engines enable consistent messaging across channels and languages");
console.log("  3. User preferences must be respected — wrong channel = uninstall");
console.log("  4. Rate limiting prevents notification fatigue (10 push/hr, 5 SMS/day)");
console.log("  5. Critical notifications (OTP, payment) bypass rate limits and quiet hours");
console.log("  6. Fallback channels (push fails -> SMS) ensure delivery reliability");
console.log("  7. Delivery tracking measures actual reach, not just send count");
console.log("  8. During surge events (IPL nights), the queue absorbs load spikes gracefully");
console.log();
console.log('  "The best notification is one the user wanted, on the channel');
console.log('   they prefer, at the time they expected it. Everything else');
console.log('   is spam." — Swiggy Notifications Team');
console.log();
