/** ============================================================
 FILE 16: Crypto Module — Hashing, Passwords & Encryption
 ============================================================
 Topic: The 'crypto' module — cryptographic operations
 WHY THIS MATTERS:
   Security is non-negotiable. Hashing verifies data integrity,
   password hashing protects credentials, and encryption guards
   secrets in transit and at rest. Node's crypto module covers
   all three without external dependencies.
 ============================================================ */

const crypto = require('crypto');

// ============================================================
// STORY: RBI CURRENCY VAULT
// Chief Vault Officer Kavita guards the Reserve Bank of India
// vault. She uses hashing to verify currency note serial
// numbers haven't been tampered with, scrypt to protect vault
// access codes, and AES encryption to secure new currency
// note shipment details between branches. Every tool in her
// arsenal maps to a crypto module function.
// ============================================================

// ============================================================
// EXAMPLE BLOCK 1 — Hashing & Random Values
// ============================================================

console.log('='.repeat(60));
console.log('  BLOCK 1: Hashing & Random Values');
console.log('='.repeat(60));

// ── SHA-256 Hashing ─────────────────────────────────────────
// WHY: Hashing creates a fixed-size fingerprint of data — great for
// integrity checks, deduplication, and checksums

const currencyNote1 = 'Serial #9AA-749321 denomination Rs 2000';
const hash1 = crypto.createHash('sha256').update(currencyNote1).digest('hex');

console.log('\n--- Currency Note Verification (SHA-256) ---');
console.log(`  Note     : "${currencyNote1}"`);
console.log(`  Hash     : ${hash1}`);
// Output: Hash     : a3f2... (64 hex chars)

// WHY: Same input ALWAYS produces same hash — this is deterministic
const hash1Again = crypto.createHash('sha256').update(currencyNote1).digest('hex');
console.log(`  Same?    : ${hash1 === hash1Again}`);
// Output: Same?    : true

// Tiny change = completely different hash (avalanche effect)
const currencyNote2 = 'Serial #9AA-749322 denomination Rs 2000';
const hash2 = crypto.createHash('sha256').update(currencyNote2).digest('hex');
console.log(`  Tampered : ${hash1 === hash2}`);
// Output: Tampered : false

// ── HMAC — Hash with a secret key ──────────────────────────
// WHY: HMAC proves both integrity AND authenticity (needs the key)
const rbiSecretKey = 'rbi-vault-seal-2024';
const hmac = crypto.createHmac('sha256', rbiSecretKey)
  .update(currencyNote1)
  .digest('hex');

console.log('\n--- HMAC Authentication Seal (Keyed Hash) ---');
console.log(`  HMAC     : ${hmac}`);
// Output: HMAC     : b7c9... (64 hex chars)

// ── Random Values ───────────────────────────────────────────
// WHY: Cryptographically secure random values for tokens, salts, IDs
const randomHex = crypto.randomBytes(16).toString('hex');
const randomUuid = crypto.randomUUID();
const randomNum = crypto.randomInt(1, 100);

console.log('\n--- Random Generation ---');
console.log(`  Hex (16B)  : ${randomHex}`);
// Output: Hex (16B)  : a4f8c3... (32 hex chars)
console.log(`  UUID       : ${randomUuid}`);
// Output: UUID       : 550e8400-e29b-41d4-a716-446655440000
console.log(`  Int [1,100): ${randomNum}`);
// Output: Int [1,100): 42 (varies)

// ============================================================
// EXAMPLE BLOCK 2 — Vault Access Code Hashing with scrypt
// ============================================================

console.log('\n' + '='.repeat(60));
console.log('  BLOCK 2: Vault Access Code Hashing (scrypt)');
console.log('='.repeat(60));

// WHY: Never store plaintext access codes. scrypt is memory-hard,
// making brute-force attacks extremely expensive.

const vaultAccessCode = 'RBI-Kavita-Vault7#2024';

// ── Hashing an access code ──────────────────────────────────
// Step 1: Generate a unique random salt per officer
const salt = crypto.randomBytes(16).toString('hex');

// Step 2: Derive a 64-byte key from access code + salt
const derivedKey = crypto.scryptSync(vaultAccessCode, salt, 64);
const hashedCode = derivedKey.toString('hex');

console.log('\n--- Access Code Storage ---');
console.log(`  Code       : ${vaultAccessCode}`);
console.log(`  Salt       : ${salt}`);
console.log(`  Hash       : ${hashedCode.slice(0, 40)}...`);
// Output: Hash       : 8b2e4f... (128 hex chars, truncated)

// ── Storage format: salt:hash ───────────────────────────────
// WHY: Store salt alongside hash so you can re-derive during login
const storedValue = `${salt}:${hashedCode}`;
console.log(`  Stored     : ${storedValue.slice(0, 50)}...`);
// Output: Stored     : a1b2c3...:8b2e4f... (salt:hash format)

// ── Verifying an access code ────────────────────────────────
// WHY: To verify, re-derive from the candidate code with the same salt
function verifyAccessCode(candidateCode, stored) {
  const [storedSalt, storedHash] = stored.split(':');
  const candidateKey = crypto.scryptSync(candidateCode, storedSalt, 64);
  const candidateHash = candidateKey.toString('hex');
  // WHY: Use timingSafeEqual to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(storedHash, 'hex'),
    Buffer.from(candidateHash, 'hex')
  );
}

const correctLogin = verifyAccessCode('RBI-Kavita-Vault7#2024', storedValue);
const wrongLogin = verifyAccessCode('WrongCode!', storedValue);

console.log('\n--- Access Code Verification ---');
console.log(`  Correct Code : ${correctLogin}`);
// Output: Correct Code : true
console.log(`  Wrong Code   : ${wrongLogin}`);
// Output: Wrong Code   : false

// ============================================================
// EXAMPLE BLOCK 3 — Symmetric Encryption (AES-256-CBC)
// ============================================================

console.log('\n' + '='.repeat(60));
console.log('  BLOCK 3: Encryption (AES-256-CBC)');
console.log('='.repeat(60));

// WHY: Encryption makes data unreadable without the key.
// AES-256-CBC is a widely-used symmetric cipher.

const vaultMasterKey = 'rbi-master-key-2024';
const secretShipment = 'Gold reserves: 200 tonnes moved to Nagpur vault at midnight';

// ── Derive a 32-byte key from a master key ──────────────────
// WHY: AES-256 needs exactly 32 bytes. scrypt derives a proper key.
const encSalt = crypto.randomBytes(16);
const encKey = crypto.scryptSync(vaultMasterKey, encSalt, 32);

// ── Encrypt ─────────────────────────────────────────────────
// WHY: IV (Initialization Vector) ensures same plaintext encrypts
// differently each time — MUST be random and unique per encryption
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-cbc', encKey, iv);

let encrypted = cipher.update(secretShipment, 'utf8', 'hex');
encrypted += cipher.final('hex');

console.log('\n--- Encryption ---');
console.log(`  Plaintext  : "${secretShipment}"`);
console.log(`  IV         : ${iv.toString('hex')}`);
console.log(`  Encrypted  : ${encrypted}`);
// Output: Encrypted  : 7a3f9c... (hex string)

// ── Decrypt ─────────────────────────────────────────────────
const decipher = crypto.createDecipheriv('aes-256-cbc', encKey, iv);

let decrypted = decipher.update(encrypted, 'hex', 'utf8');
decrypted += decipher.final('utf8');

console.log('\n--- Decryption ---');
console.log(`  Decrypted  : "${decrypted}"`);
// Output: Decrypted  : "Gold reserves: 200 tonnes moved to Nagpur vault at midnight"
console.log(`  Match      : ${decrypted === secretShipment}`);
// Output: Match      : true

// ── Full encrypted package (for transmission) ───────────────
// WHY: Receiver needs salt + iv + ciphertext to decrypt
const encryptedPackage = {
  salt: encSalt.toString('hex'),
  iv: iv.toString('hex'),
  ciphertext: encrypted,
  algorithm: 'aes-256-cbc'
};
console.log('\n--- Encrypted Package ---');
console.log(`  ${JSON.stringify(encryptedPackage, null, 2).split('\n').join('\n  ')}`);

// ── Timing-Safe Comparison ──────────────────────────────────
// WHY: Regular === leaks info via timing. timingSafeEqual takes
// constant time regardless of where strings differ.
const tokenA = Buffer.from('rbi-auth-token-abc123');
const tokenB = Buffer.from('rbi-auth-token-abc123');
const tokenC = Buffer.from('rbi-auth-token-xyz789');

console.log('\n--- Timing-Safe Comparison ---');
console.log(`  A === B    : ${crypto.timingSafeEqual(tokenA, tokenB)}`);
// Output: A === B    : true
console.log(`  A === C    : ${crypto.timingSafeEqual(tokenA, tokenC)}`);
// Output: A === C    : false

console.log('\n' + '='.repeat(60));

// ============================================================
// KEY TAKEAWAYS
// ============================================================
// 1. createHash('sha256') — deterministic fingerprint of data
// 2. createHmac — hash with a secret key (proves authenticity)
// 3. randomBytes/randomUUID/randomInt — crypto-secure randoms
// 4. scryptSync — memory-hard password hashing (with salt!)
// 5. Store access codes as "salt:hash", verify by re-deriving
// 6. AES-256-CBC with createCipheriv/createDecipheriv
// 7. Always use a random IV per encryption operation
// 8. Derive encryption keys from passwords using scryptSync
// 9. timingSafeEqual prevents timing side-channel attacks
// 10. Never roll your own crypto — use the built-in module
// ============================================================
