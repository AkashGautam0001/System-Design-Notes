/** ============================================================
 *  FILE 23: Performance Patterns — Optimize Every Millisecond
 *  WHY THIS MATTERS: Express makes it easy to build APIs, but
 *  default settings leave performance on the table. Compression
 *  can cut response sizes by 70%, ETags prevent redundant data
 *  transfer, caching headers reduce server load, and streaming
 *  handles large payloads without blowing up memory. These are
 *  the patterns production apps use.
 *  ============================================================ */

// ─── The F1 Pit Crew at Buddh Circuit ────────────────────────
//
// Pit Crew Chief Vikram knows that races aren't won only on the
// track — they're won in the pit. Every millisecond saved during
// a tyre change, every gram of weight shaved off the car, every
// fuel calculation optimized adds up to victory at the former
// Buddh International Circuit in Greater Noida.
//
// Express performance is the same: compress responses to reduce
// network time (lightweight car parts), use ETags to skip
// unchanged data (pre-warmed tyres), set cache headers to avoid
// hits entirely (fuel lines ready), and stream large files
// instead of buffering them in memory. Individually small,
// collectively transformative.
//
// (See nodejs-notes/11 for Node.js streams fundamentals)
// (See nodejs-notes/08 for HTTP server fundamentals)

const express = require('express');
const http = require('http');
const zlib = require('zlib');
const crypto = require('crypto');
const { Readable } = require('stream');

// ════════════════════════════════════════════════════════════════
// BLOCK 1 — Compression Middleware from Scratch, ETag Handling
// ════════════════════════════════════════════════════════════════

// ─── Why build compression from scratch? ──────────────────────
//
// The `compression` npm package is great, but understanding
// HOW it works teaches you about:
//   - Content negotiation (Accept-Encoding)
//   - Node.js zlib streams (gzip, deflate, brotli)
//   - Response stream piping
//   - When NOT to compress (images, small responses)

function createCompressionMiddleware(options = {}) {
  const threshold = options.threshold || 1024; // skip if < 1KB
  // WHY: Compressing tiny responses adds CPU overhead for
  // negligible size savings. 1KB is a common threshold.

  return function compressionMiddleware(req, res, next) {
    const acceptEncoding = req.get('accept-encoding') || '';
    // WHY: The client tells us what compression it supports via
    // the Accept-Encoding header. We pick the best match.

    // ─── Skip if client doesn't accept compression ────────────
    if (!acceptEncoding.includes('gzip') && !acceptEncoding.includes('deflate')) {
      return next();
    }

    // ─── Intercept res.end() and res.write() ──────────────────
    const originalEnd = res.end;
    const originalWrite = res.write;
    const chunks = [];

    res.write = function patchedWrite(chunk, encoding) {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      }
      // WHY: We buffer chunks instead of writing immediately
      // because we need the full body to decide whether to
      // compress (size check) and to compress it all at once.
      return true;
    };

    res.end = function patchedEnd(chunk, encoding) {
      // Restore originals
      res.write = originalWrite;
      res.end = originalEnd;

      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      }

      const body = Buffer.concat(chunks);

      // ─── Skip compression for small responses ──────────────
      if (body.length < threshold) {
        // WHY: Below threshold, send uncompressed — the CPU cost
        // of compression exceeds the bandwidth savings.
        if (body.length > 0) {
          res.set('Content-Length', body.length.toString());
        }
        return res.end(body);
      }

      // ─── Skip if response type shouldn't be compressed ──────
      const contentType = res.get('content-type') || '';
      if (contentType.includes('image/') || contentType.includes('video/')) {
        // WHY: Images and videos are already compressed (JPEG, PNG,
        // MP4). Re-compressing wastes CPU and might increase size.
        res.set('Content-Length', body.length.toString());
        return res.end(body);
      }

      // ─── Choose compression algorithm ───────────────────────
      let algorithm, encodingName;
      if (acceptEncoding.includes('gzip')) {
        algorithm = zlib.gzipSync;
        encodingName = 'gzip';
      } else {
        algorithm = zlib.deflateSync;
        encodingName = 'deflate';
      }
      // WHY: gzip is the most widely supported. Brotli (br) offers
      // better ratios but higher CPU cost — good for static assets.

      const compressed = algorithm(body);

      // ─── Set compression headers ────────────────────────────
      res.set('Content-Encoding', encodingName);
      res.set('Content-Length', compressed.length.toString());
      res.set('Vary', 'Accept-Encoding');
      // WHY: Vary: Accept-Encoding tells CDNs/proxies to cache
      // separate versions for different Accept-Encoding values.
      // Without it, a CDN might serve gzipped content to a client
      // that doesn't support gzip.

      res.removeHeader('content-length');
      // Remove original content-length since we changed the body size
      res.set('Content-Length', compressed.length.toString());

      return res.end(compressed);
    };

    next();
  };
}

// ─── ETag middleware from scratch ─────────────────────────────

function createETagMiddleware() {
  return function etagMiddleware(req, res, next) {
    const originalEnd = res.end;
    const chunks = [];
    const originalWrite = res.write;

    res.write = function patchedWrite(chunk, encoding) {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      }
      return true;
    };

    res.end = function patchedEnd(chunk, encoding) {
      res.write = originalWrite;
      res.end = originalEnd;

      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      }

      const body = Buffer.concat(chunks);

      // ─── Generate ETag from body content ────────────────────
      if (body.length > 0 && res.statusCode === 200) {
        const hash = crypto.createHash('md5').update(body).digest('hex');
        const etag = `"${hash}"`;
        // WHY: ETag is a fingerprint of the response body. If the
        // client sends If-None-Match with this same ETag, we can
        // respond with 304 Not Modified instead of re-sending data.

        res.set('ETag', etag);

        // ─── Check If-None-Match header ───────────────────────
        const clientETag = req.get('if-none-match');
        if (clientETag === etag) {
          // WHY: Client already has this version — save bandwidth
          // by sending just a 304 status with no body.
          res.removeHeader('content-length');
          res.statusCode = 304;
          return res.end();
        }
      }

      return res.end(body);
    };

    next();
  };
}

function block1_compressionAndEtag() {
  return new Promise((resolve) => {
    const app = express();

    // ─── Disable Express built-in ETag to test our own ────────
    app.disable('etag');
    app.disable('x-powered-by');
    // WHY: We're building ETag handling from scratch, so we
    // disable Express's built-in weak ETag to avoid conflicts.

    // ─── Apply our custom middleware ──────────────────────────
    app.use(createETagMiddleware());
    app.use(createCompressionMiddleware({ threshold: 100 }));
    // WHY: Low threshold (100 bytes) so our test data gets compressed.

    // ─── Large JSON response — will be compressed ─────────────
    const largeData = {
      items: Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `Spare Part ${i + 1}`,
        description: `This is a detailed specification for spare part number ${i + 1} from Buddh Circuit inventory`,
        price: Math.round(Math.random() * 100000) / 100,
        category: ['tyres', 'aerodynamics', 'engine', 'suspension'][i % 4],
      })),
    };

    app.get('/api/parts', (req, res) => {
      res.json(largeData);
    });

    // ─── Small response — below compression threshold ─────────
    app.get('/api/ping', (req, res) => {
      res.json({ pong: true });
    });

    // ─── Static data for ETag testing ─────────────────────────
    app.get('/api/version', (req, res) => {
      res.json({ version: '2.5.0', build: 'abc123' });
    });

    const server = app.listen(0, async () => {
      const port = server.address().port;
      const base = `http://127.0.0.1:${port}`;
      console.log('=== BLOCK 1: Compression & ETag from Scratch ===');
      console.log(`Server running on port ${port}\n`);

      // ─── Helper: raw HTTP request (no auto-decompression) ─────
      // WHY: Node's built-in fetch() (undici) auto-decompresses
      // gzip responses, so we can't measure compressed size with
      // it. http.request gives us the raw bytes on the wire.
      function rawRequest(path, headers = {}) {
        return new Promise((res, rej) => {
          const req = http.request(
            { hostname: '127.0.0.1', port, path, headers },
            (response) => {
              const chunks = [];
              response.on('data', (c) => chunks.push(c));
              response.on('end', () => {
                res({
                  status: response.statusCode,
                  headers: response.headers,
                  body: Buffer.concat(chunks),
                });
              });
            }
          );
          req.on('error', rej);
          req.end();
        });
      }

      try {
        // ─── Test compression — large response ────────────────
        console.log('--- Compression Middleware ---');

        // First, get uncompressed size (no Accept-Encoding header)
        const rawResult = await rawRequest('/api/parts');
        const uncompressedSize = rawResult.body.length;
        console.log('Uncompressed response size:', uncompressedSize, 'bytes');
        // Output: Uncompressed response size: XXXX bytes

        // Now request with gzip — http.request does NOT auto-decompress
        const gzipResult = await rawRequest('/api/parts', {
          'Accept-Encoding': 'gzip',
        });
        const compressedSize = gzipResult.body.length;
        const encoding = gzipResult.headers['content-encoding'];
        console.log('Content-Encoding:', encoding);
        // Output: Content-Encoding: gzip
        console.log('Compressed response size:', compressedSize, 'bytes');
        // Output: Compressed response size: XXXX bytes
        const ratio = ((1 - compressedSize / uncompressedSize) * 100).toFixed(1);
        console.log(`Compression ratio: ${ratio}% smaller`);
        // Output: Compression ratio: XX.X% smaller
        // WHY: JSON compresses extremely well — typically 60-80%
        // reduction. That's huge for API responses over the network.

        // Verify the compressed body is valid gzip
        const decompressed = zlib.gunzipSync(gzipResult.body);
        const parsed = JSON.parse(decompressed.toString());
        console.log('Decompressed item count:', parsed.items.length);
        // Output: Decompressed item count: 50
        // WHY: This proves the gzip compression round-trips correctly.

        // Verify Vary header
        console.log('Vary header:', gzipResult.headers['vary']);
        // Output: Vary header: Accept-Encoding

        // ─── Test small response — NOT compressed ─────────────
        console.log('\n--- Small Response (below threshold) ---');
        const pingResult = await rawRequest('/api/ping', {
          'Accept-Encoding': 'gzip',
        });
        const pingEncoding = pingResult.headers['content-encoding'];
        console.log('Small response Content-Encoding:', pingEncoding || 'none');
        // Output: Small response Content-Encoding: none
        // WHY: Below the 100-byte threshold, no compression applied.

        // ─── Test ETag — first request gets ETag ──────────────
        console.log('\n--- ETag Handling ---');
        const vRes1 = await fetch(`${base}/api/version`);
        const vData1 = await vRes1.json();
        const etag = vRes1.headers.get('etag');
        console.log('First request status:', vRes1.status);
        // Output: First request status: 200
        console.log('First request body:', JSON.stringify(vData1));
        // Output: First request body: {"version":"2.5.0","build":"abc123"}
        console.log('ETag received:', etag);
        // Output: ETag received: "XXXXXXXX..."

        // ─── Test ETag — second request with If-None-Match ───
        const vRes2 = await fetch(`${base}/api/version`, {
          headers: { 'If-None-Match': etag },
        });
        console.log('Second request (same ETag) status:', vRes2.status);
        // Output: Second request (same ETag) status: 304
        // WHY: The server recognized the ETag matches and returned
        // 304 Not Modified — no body transferred! This saves
        // bandwidth for data that hasn't changed.

        const vBody2 = await vRes2.text();
        console.log('Second request body length:', vBody2.length);
        // Output: Second request body length: 0
        // WHY: 304 responses have empty bodies — the client uses
        // its cached copy.

        // ─── Test ETag — different ETag gets full response ────
        const vRes3 = await fetch(`${base}/api/version`, {
          headers: { 'If-None-Match': '"stale-etag-value"' },
        });
        console.log('Third request (stale ETag) status:', vRes3.status);
        // Output: Third request (stale ETag) status: 200
        // WHY: Mismatched ETag means the client's cache is outdated,
        // so the full response is sent.

        // ─── x-powered-by disabled ────────────────────────────
        console.log('\n--- x-powered-by disabled ---');
        console.log('X-Powered-By:', rawResult.headers['x-powered-by'] || 'null');
        // Output: X-Powered-By: null
        // WHY: Removing X-Powered-By hides that you're using
        // Express. Attackers scan for this header to target known
        // Express/Node.js vulnerabilities.
      } catch (err) {
        console.error('Test error:', err.message);
      }

      server.close(() => {
        console.log('\nBlock 1 server closed.\n');
        resolve();
      });
    });
  });
}

// ════════════════════════════════════════════════════════════════
// BLOCK 2 — Caching Headers, Streaming Responses, Timeouts
// ════════════════════════════════════════════════════════════════

// ─── Caching strategy overview ────────────────────────────────
//
//  Header            Purpose
//  ───────────────── ──────────────────────────────────────────
//  Cache-Control     Primary directive — max-age, no-cache, etc.
//  Expires           Legacy — date after which cache is stale
//  ETag              Content fingerprint for conditional requests
//  Last-Modified     Date-based conditional requests
//  Vary              Cache key varies by specified headers
//
// Cache-Control is the modern standard. Expires is a fallback
// for old HTTP/1.0 clients.

function block2_cachingStreamingTimeouts() {
  return new Promise((resolve) => {
    const app = express();
    app.disable('etag');
    app.disable('x-powered-by');

    // ─── Route: immutable static asset (cache forever) ────────
    app.get('/static/bundle.js', (req, res) => {
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
      // WHY: For fingerprinted assets (bundle.abc123.js), the
      // filename changes when content changes. So we cache forever.
      // 'immutable' tells the browser not to even revalidate.
      // max-age=31536000 = 1 year (the practical maximum).
      res.type('application/javascript').send('console.log("pit telemetry v1.2.3");');
    });

    // ─── Route: API data (cache briefly, revalidate) ──────────
    app.get('/api/lap-times', (req, res) => {
      res.set('Cache-Control', 'public, max-age=60, must-revalidate');
      // WHY: API data changes periodically. Cache for 60 seconds,
      // then the client MUST revalidate (check ETag/Last-Modified).
      // Without must-revalidate, stale caches might serve old data.
      res.set('Last-Modified', new Date('2025-06-15T10:00:00Z').toUTCString());
      res.json({ gold: 91.5, silver: 93.2, updated: '2025-06-15T10:00:00Z' });
    });

    // ─── Route: private data (never cache in shared caches) ───
    app.get('/api/driver-profile', (req, res) => {
      res.set('Cache-Control', 'private, no-store');
      // WHY: 'private' means only the browser can cache, not CDNs
      // or proxies. 'no-store' means don't cache AT ALL — critical
      // for sensitive data like driver profiles and team strategy.
      res.json({ driver: 'Vikram', email: 'vikram@buddhcircuit.in', role: 'pit-crew-chief' });
    });

    // ─── Route: Expires header (legacy support) ───────────────
    app.get('/api/race-schedule', (req, res) => {
      const expires = new Date(Date.now() + 3600 * 1000); // 1 hour
      res.set('Expires', expires.toUTCString());
      res.set('Cache-Control', 'public, max-age=3600');
      // WHY: Expires is the HTTP/1.0 way. Cache-Control overrides
      // it in HTTP/1.1, but setting both ensures compatibility.
      res.json({ event: 'Indian Grand Prix', time: '14:00', track: 'Buddh International Circuit' });
    });

    // ─── Streaming large response — memory efficient ──────────
    app.get('/api/stream/large', (req, res) => {
      res.set('Content-Type', 'application/json');
      res.set('Transfer-Encoding', 'chunked');
      // WHY: For large datasets, streaming sends data in chunks
      // as it's generated — never buffering the entire response
      // in memory. This prevents OOM errors for huge payloads.

      // Simulate a large dataset — stream it row by row
      let index = 0;
      const total = 100;

      res.write('[\n');

      function sendNext() {
        while (index < total) {
          const item = JSON.stringify({
            id: index + 1,
            value: `telemetry-${index + 1}`,
            timestamp: new Date().toISOString(),
          });

          const separator = index < total - 1 ? ',\n' : '\n';
          const canContinue = res.write(item + separator);
          index++;

          if (!canContinue) {
            // WHY: res.write() returns false when the internal
            // buffer is full (backpressure). We wait for 'drain'
            // before continuing. This prevents memory blowup.
            res.once('drain', sendNext);
            return;
          }
        }
        res.end(']\n');
      }

      sendNext();
    });

    // ─── Streaming with Readable — piped approach ─────────────
    app.get('/api/stream/lines', (req, res) => {
      res.set('Content-Type', 'text/plain');
      // WHY: Piping a Readable stream into res is the idiomatic
      // Node.js pattern. Express's res IS a writable stream.

      let line = 0;
      const readable = new Readable({
        read() {
          if (line < 20) {
            this.push(`Lap ${++line}: Sector time ${Math.random().toFixed(4)}s\n`);
          } else {
            this.push(null); // signal end of stream
          }
        },
      });

      readable.pipe(res);
      // WHY: pipe() handles backpressure automatically — if the
      // client reads slowly, the readable pauses. No manual
      // drain handling needed.
    });

    // ─── Server timeout configuration ─────────────────────────
    app.get('/api/slow', (req, res) => {
      // Simulate a slow pit stop (but faster than our timeout)
      setTimeout(() => {
        res.json({ result: 'completed', note: 'This was a slow pit stop' });
      }, 200);
    });

    // ─── Route optimization — specific routes first ───────────
    // WHY: Express matches routes in registration order. Put the
    // most frequently hit routes FIRST and specific routes BEFORE
    // parameterized ones to minimize matching attempts.
    //
    // GOOD order:
    //   app.get('/api/health', ...)     ← high frequency, specific
    //   app.get('/api/parts', ...)      ← specific, common
    //   app.get('/api/parts/:id', ...)  ← parameterized
    //   app.get('/api/*path', ...)      ← wildcard last
    //
    // BAD order:
    //   app.get('/api/*path', ...)      ← catches everything!
    //   app.get('/api/parts', ...)      ← never reached

    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    const server = app.listen(0, async () => {
      const port = server.address().port;
      const base = `http://127.0.0.1:${port}`;

      // ─── Set server timeout ─────────────────────────────────
      server.setTimeout(5000);
      // WHY: server.setTimeout() kills connections that take too
      // long. Prevents slow clients or hung requests from keeping
      // connections open forever and exhausting server resources.

      console.log('=== BLOCK 2: Caching, Streaming, Timeouts ===');
      console.log(`Server running on port ${port}\n`);

      try {
        // ─── Test Cache-Control: immutable ────────────────────
        console.log('--- Caching Headers ---');
        const staticRes = await fetch(`${base}/static/bundle.js`);
        console.log('GET /static/bundle.js');
        console.log('  Cache-Control:', staticRes.headers.get('cache-control'));
        // Output:   Cache-Control: public, max-age=31536000, immutable
        console.log('  Content-Type:', staticRes.headers.get('content-type'));
        // Output:   Content-Type: application/javascript; charset=utf-8
        // WHY: Immutable caching for fingerprinted assets is the
        // single biggest performance win for web apps.

        // ─── Test Cache-Control: must-revalidate ──────────────
        const lapTimesRes = await fetch(`${base}/api/lap-times`);
        console.log('\nGET /api/lap-times');
        console.log('  Cache-Control:', lapTimesRes.headers.get('cache-control'));
        // Output:   Cache-Control: public, max-age=60, must-revalidate
        console.log('  Last-Modified:', lapTimesRes.headers.get('last-modified'));
        // Output:   Last-Modified: Sun, 15 Jun 2025 10:00:00 GMT

        // ─── Test If-Modified-Since (conditional request) ─────
        const lapTimesRes2 = await fetch(`${base}/api/lap-times`, {
          headers: {
            'If-Modified-Since': 'Sun, 15 Jun 2025 10:00:00 GMT',
          },
        });
        console.log('  Conditional request status:', lapTimesRes2.status);
        // Output:   Conditional request status: 200
        // WHY: Our simple middleware doesn't handle If-Modified-Since;
        // in production, you'd compare dates and return 304.

        // ─── Test Cache-Control: private, no-store ────────────
        const profileRes = await fetch(`${base}/api/driver-profile`);
        console.log('\nGET /api/driver-profile');
        console.log('  Cache-Control:', profileRes.headers.get('cache-control'));
        // Output:   Cache-Control: private, no-store
        // WHY: Sensitive data must never be cached in shared
        // caches (CDNs, proxies). no-store is the strictest.

        // ─── Test Expires header ──────────────────────────────
        const schedRes = await fetch(`${base}/api/race-schedule`);
        console.log('\nGET /api/race-schedule');
        console.log('  Cache-Control:', schedRes.headers.get('cache-control'));
        // Output:   Cache-Control: public, max-age=3600
        console.log('  Expires:', schedRes.headers.get('expires') ? 'set' : 'not set');
        // Output:   Expires: set

        // ─── Test streaming large response ────────────────────
        console.log('\n--- Streaming Responses ---');
        const streamRes = await fetch(`${base}/api/stream/large`);
        const streamData = await streamRes.json();
        console.log('GET /api/stream/large');
        console.log('  Total items received:', streamData.length);
        // Output:   Total items received: 100
        console.log('  First item:', JSON.stringify(streamData[0]));
        // Output:   First item: {"id":1,"value":"telemetry-1","timestamp":"..."}
        console.log('  Last item id:', streamData[streamData.length - 1].id);
        // Output:   Last item id: 100
        // WHY: All 100 items arrived, but the server never held
        // all of them in memory simultaneously. For 100K records
        // this pattern prevents out-of-memory crashes.

        // ─── Test piped stream response ───────────────────────
        const linesRes = await fetch(`${base}/api/stream/lines`);
        const linesText = await linesRes.text();
        const lineCount = linesText.trim().split('\n').length;
        console.log('\nGET /api/stream/lines');
        console.log('  Lines received:', lineCount);
        // Output:   Lines received: 20
        console.log('  First line:', linesText.split('\n')[0]);
        // Output:   First line: Lap 1: Sector time 0.XXXXs
        console.log('  Content-Type:', linesRes.headers.get('content-type'));
        // Output:   Content-Type: text/plain; charset=utf-8

        // ─── Test slow request (within timeout) ───────────────
        console.log('\n--- Timeout Configuration ---');
        console.log('Server timeout:', server.timeout + 'ms');
        // Output: Server timeout: 5000ms
        const slowStart = Date.now();
        const slowRes = await fetch(`${base}/api/slow`);
        const slowData = await slowRes.json();
        const slowElapsed = Date.now() - slowStart;
        console.log('GET /api/slow:', JSON.stringify(slowData));
        // Output: GET /api/slow: {"result":"completed","note":"This was a slow pit stop"}
        console.log(`  Completed in: ${slowElapsed}ms (within 5000ms timeout)`);
        // Output:   Completed in: ~200ms (within 5000ms timeout)

        // ─── Route optimization summary ───────────────────────
        console.log('\n--- Route Optimization Tips ---');
        console.log('1. Register high-frequency routes FIRST (Express matches in order)');
        console.log('2. Put specific routes BEFORE parameterized ones');
        console.log('3. Avoid regex in routes (Express 5 removed them; use param validation)');
        console.log('4. Use Router for route grouping — each router has its own matching scope');

        // ─── Performance checklist ────────────────────────────
        console.log('\n--- Production Performance Checklist ---');

        // Verify x-powered-by is disabled
        const healthRes = await fetch(`${base}/api/health`);
        const xpb = healthRes.headers.get('x-powered-by');
        console.log('x-powered-by hidden:', xpb === null);
        // Output: x-powered-by hidden: true

        console.log('Compression: enabled (gzip/deflate via middleware)');
        console.log('ETags: enabled (content fingerprinting)');
        console.log('Cache headers: set per route type');
        console.log('Streaming: used for large payloads');
        console.log('Timeout: configured at', server.timeout + 'ms');
      } catch (err) {
        console.error('Test error:', err.message);
      }

      server.close(() => {
        console.log('\nBlock 2 server closed.\n');
        resolve();
      });
    });
  });
}

// ════════════════════════════════════════════════════════════════
// Run all blocks sequentially, then exit
// ════════════════════════════════════════════════════════════════

async function main() {
  await block1_compressionAndEtag();
  await block2_cachingStreamingTimeouts();

  console.log('=== KEY TAKEAWAYS ===');
  console.log('1. Build compression by intercepting res.end() and piping through zlib.');
  console.log('2. Set a compression threshold — skip tiny responses to save CPU.');
  console.log('3. Always send Vary: Accept-Encoding so CDNs cache correctly.');
  console.log('4. ETags let clients cache responses and revalidate with If-None-Match.');
  console.log('5. 304 Not Modified saves bandwidth — no body transferred.');
  console.log('6. Cache-Control: immutable for fingerprinted assets (cache forever).');
  console.log('7. Cache-Control: private, no-store for sensitive data (never cache).');
  console.log('8. Stream large responses with res.write() + drain events or pipe().');
  console.log('9. server.setTimeout() prevents hung connections from exhausting resources.');
  console.log('10. app.disable("x-powered-by") hides your tech stack from attackers.');

  process.exit(0);
}

main();
