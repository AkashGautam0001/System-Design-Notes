/**
 * ============================================================
 *  FILE 13 : The Bridge Pattern
 *  Topic   : Bridge, Abstraction/Implementation Separation
 *  WHY THIS MATTERS:
 *    When you have two independent dimensions of variation
 *    (e.g., notification type vs delivery channel), inheritance
 *    explodes into MxN subclasses. The Bridge decouples the
 *    abstraction from its implementation so both can evolve
 *    independently, turning MxN into M+N.
 * ============================================================
 */

// STORY: UIDAI runs the Aadhaar notification system. The
// *notification types* (KYC Update, OTP, Scheme Alert) are
// completely separate from the *delivery channels* (SMS, Email,
// WhatsApp, DigiLocker). Operator Mehra can swap either side
// without touching the other.

// ────────────────────────────────────────────────────────────
// BLOCK 1 — Notification Type + Delivery Channel Bridge
// ────────────────────────────────────────────────────────────

// WHY: Without Bridge we need SMSKyc, SMSOTP, EmailKyc, EmailOTP,
// WhatsAppKyc, etc. — 3x4 = 12 classes. With Bridge: 3 types + 4 channels.

class SMSChannel {
  deliver(to, subject, body) { return `SMS to ${to}: [${subject}] ${body}`; }
}

class EmailChannel {
  deliver(to, subject, body) { return `EMAIL to ${to}: [${subject}] ${body}`; }
}

class WhatsAppChannel {
  deliver(to, subject, body) { return `WHATSAPP to ${to}: [${subject}] ${body}`; }
}

class DigiLockerChannel {
  deliver(to, subject, body) { return `DIGILOCKER to ${to}: ${subject} - ${body}`; }
}

// WHY: The AadhaarNotification holds a reference to a Channel — this IS
// the bridge. The abstraction (Notification) delegates to the
// implementation (Channel) without knowing which concrete channel it has.
class KYCUpdate {
  constructor(channel) {
    this.channel = channel;
  }
  send(to, details) {
    return this.channel.deliver(to, "KYC UPDATE", `Your KYC has been updated: ${details}`);
  }
}

class OTPNotification {
  constructor(channel) {
    this.channel = channel;
  }
  send(to, otp) {
    return this.channel.deliver(to, "OTP", `Your Aadhaar OTP is ${otp}`);
  }
}

class SchemeAlert {
  constructor(channel) {
    this.channel = channel;
  }
  send(to, scheme) {
    return this.channel.deliver(to, "SCHEME ALERT", `You are eligible for: ${scheme}`);
  }
}

console.log("=== BLOCK 1: Notification Type + Delivery Channel Bridge ===");
const sms = new SMSChannel();
const email = new EmailChannel();
const whatsapp = new WhatsAppChannel();
const digilocker = new DigiLockerChannel();

const kycSms = new KYCUpdate(sms);
const kycEmail = new KYCUpdate(email);
const otpWhatsApp = new OTPNotification(whatsapp);
const schemeDigi = new SchemeAlert(digilocker);

console.log(kycSms.send("+919876543210", "address changed"));
// Output: SMS to +919876543210: [KYC UPDATE] Your KYC has been updated: address changed
console.log(kycEmail.send("mehra@uidai.gov.in", "address changed"));
// Output: EMAIL to mehra@uidai.gov.in: [KYC UPDATE] Your KYC has been updated: address changed
console.log(otpWhatsApp.send("+919876543210", "482913"));
// Output: WHATSAPP to +919876543210: [OTP] Your Aadhaar OTP is 482913
console.log(schemeDigi.send("AADH-1234-5678", "PM Kisan Yojana"));
// Output: DIGILOCKER to AADH-1234-5678: SCHEME ALERT - You are eligible for: PM Kisan Yojana

// WHY: Operator Mehra can add a fifth channel (IVR) without touching
// KYCUpdate or OTPNotification, and a new type (BiometricAlert)
// without touching any channel.

// ────────────────────────────────────────────────────────────
// BLOCK 2 — Aadhaar Service Bridge
// ────────────────────────────────────────────────────────────

// WHY: Aadhaar service types (Authentication, eKYC, Demographic)
// and delivery channels (HTTPS API, XML Gateway, SFTP) are two
// independent axes. Bridge keeps them separate so adding a channel
// does not require editing every service type.

class HTTPSAPIChannel {
  send(to, subject, body) { return `HTTPS_API to ${to}: [${subject}] ${body}`; }
}

class XMLGatewayChannel {
  send(to, subject, body) { return `XML_GATEWAY to ${to}: ${body}`; }
}

class SFTPChannel {
  send(to, subject, body) { return `SFTP to ${to}: ${subject} - ${body}`; }
}

// WHY: The Notification class accepts any channel through the
// bridge — swap channels at runtime without subclassing.
class AadhaarNotification {
  constructor(channel) {
    this.channel = channel;
  }
  send(to, subject, body) {
    return this.channel.send(to, subject, body);
  }
}

class AuthNotification extends AadhaarNotification {
  send(to, body) {
    return super.send(to, "AUTH", `[BIOMETRIC VERIFIED] ${body}`);
  }
}

class EKYCNotification extends AadhaarNotification {
  send(to, body) {
    return super.send(to, "eKYC", body);
  }
}

class DemographicNotification extends AadhaarNotification {
  send(to, body) {
    return super.send(to, "DEMOGRAPHIC", `Update: ${body}`);
  }
}

console.log("\n=== BLOCK 2: Aadhaar Service Bridge ===");

const httpsAuth = new AuthNotification(new HTTPSAPIChannel());
const xmlEkyc = new EKYCNotification(new XMLGatewayChannel());
const sftpDemo = new DemographicNotification(new SFTPChannel());

console.log(httpsAuth.send("mehra@uidai.gov.in", "Fingerprint match successful"));
// Output: HTTPS_API to mehra@uidai.gov.in: [AUTH] [BIOMETRIC VERIFIED] Fingerprint match successful

console.log(xmlEkyc.send("+919876543210", "eKYC data shared with SBI"));
// Output: XML_GATEWAY to +919876543210: eKYC data shared with SBI

console.log(sftpDemo.send("uidai-batch", "50,000 records updated in Maharashtra"));
// Output: SFTP to uidai-batch: DEMOGRAPHIC - Update: 50,000 records updated in Maharashtra

// WHY: 3 types x 3 channels = 9 combos but only 6 classes (3+3).
// Without Bridge we would need 9 subclasses.
console.log(`Combos possible: ${3 * 3}, Classes written: ${3 + 3}`);
// Output: Combos possible: 9, Classes written: 6

// ────────────────────────────────────────────────────────────
// BLOCK 3 — Data Persistence Bridge
// ────────────────────────────────────────────────────────────

// WHY: Models (Citizen, Enrollment) should not care whether they
// are persisted via REST, GraphQL, or localStorage. The Bridge
// separates the domain model from the storage backend.

class RESTBackend {
  save(col, data) { return `REST POST /${col} ${JSON.stringify(data)}`; }
  load(col, id) { return `REST GET /${col}/${id}`; }
}

class GraphQLBackend {
  save(col, data) {
    return `mutation { create${col}(${Object.keys(data).join(", ")}) }`;
  }
  load(col, id) { return `query { ${col}(id: "${id}") { ...fields } }`; }
}

class LocalStorageBackend {
  save(col, data) { return `localStorage.setItem("${col}", '${JSON.stringify(data)}')`; }
  load(col, id) { return `localStorage.getItem("${col}:${id}")`; }
}

// WHY: The Model class holds the bridge to any backend.
class Model {
  constructor(collection, backend) {
    this.collection = collection;
    this.backend = backend;
  }

  save(data) {
    return this.backend.save(this.collection, data);
  }

  findById(id) {
    return this.backend.load(this.collection, id);
  }
}

class CitizenModel extends Model {
  constructor(backend) {
    super("Citizen", backend);
  }
}

class EnrollmentModel extends Model {
  constructor(backend) {
    super("Enrollment", backend);
  }
}

console.log("\n=== BLOCK 3: Data Persistence Bridge ===");

const rest = new RESTBackend();
const gql = new GraphQLBackend();
const local = new LocalStorageBackend();

const citizenRest = new CitizenModel(rest);
const citizenGql = new CitizenModel(gql);
const enrollLocal = new EnrollmentModel(local);

console.log(citizenRest.save({ name: "Mehra", role: "operator" }));
// Output: REST POST /Citizen {"name":"Mehra","role":"operator"}

console.log(citizenGql.findById("c1"));
// Output: query { Citizen(id: "c1") { ...fields } }

console.log(enrollLocal.save({ title: "Aadhaar Enrollment" }));
// Output: localStorage.setItem("Enrollment", '{"title":"Aadhaar Enrollment"}')

console.log(enrollLocal.findById("e7"));
// Output: localStorage.getItem("Enrollment:e7")

// WHY: Operator Mehra swaps delivery channel (backend) without changing
// the notification type (model) — that is the Bridge in action.
console.log("Mehra swaps backend at runtime:");
const citizenLocal = new CitizenModel(local);
console.log(citizenLocal.save({ name: "Mehra" }));
// Output: localStorage.setItem("Citizen", '{"name":"Mehra"}')

// ────────────────────────────────────────────────────────────
// KEY TAKEAWAYS
// ────────────────────────────────────────────────────────────
// 1. Bridge separates abstraction from implementation so both
//    sides can vary independently.
// 2. It avoids class-explosion: MxN combos become M+N classes.
// 3. The bridge is the reference the abstraction holds to its
//    implementation object.
// 4. Common uses: cross-platform rendering, notification
//    channels, persistence backends, device drivers.
// 5. UIDAI's Aadhaar system: notification type (abstraction) is
//    independent of delivery channel (impl). Swap either freely.
