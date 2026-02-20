/** ============================================================
 *  FILE 3: Route Parameters — Params, Queries, and Validation
 *  WHY THIS MATTERS: Dynamic segments and query strings are how
 *  clients specify WHICH resource they want and HOW they want
 *  it.  Every real API depends on correct parameter handling.
 *  ============================================================ */

// ─── Indian Railway PNR Lookup ────────────────────────────────
//
// IRCTC clerk Sharma manages the vast railway database.  Every
// booking has a PNR number (route parameter) and passengers can
// filter by class, date, or page through results (query strings).
//
// A passenger says: "Give me PNR 4521389076 from train 12301."
// In Express that's: GET /trains/12301/pnr/4521389076
//
// Another says: "Show me Rajdhani trains, page 2, 10 per page."
// In Express that's: GET /trains?class=rajdhani&page=2&limit=10
//
// Sharma validates every request — bad PNR numbers and missing
// IDs get turned away politely.
//
// (See nodejs-notes/08 for URL parsing fundamentals)

const express = require('express');
const http = require('http');

// ════════════════════════════════════════════════════════════════
// BLOCK 1 — Route Params and Query Strings
// ════════════════════════════════════════════════════════════════

// ─── Express 5 param changes ──────────────────────────────────
//
// 1. req.params values are DECODED by default.
//    '/trains/hello%20world' => req.params.id === 'hello world'
//    (Express 4 left them encoded unless you decoded manually.)
//
// 2. NO inline regex constraints in route strings.
//    Express 4:  '/trains/:id(\\d+)'
//    Express 5:  '/trains/:id'  (validate in the handler)
//                OR use a RegExp:  /^\/trains\/(\d+)$/
//
// WHY: Decoding by default prevents subtle bugs.  Removing
//      inline regex makes route strings simpler and pushes
//      validation into explicit, testable handler logic.

function block1_paramsAndQuery() {
  return new Promise((resolve) => {
    const app = express();

    // In-memory IRCTC train catalog
    const catalog = {
      1: { id: 1, name: 'Rajdhani Express', from: 'NDLS', to: 'BCT', class: 'rajdhani', year: 1969 },
      2: { id: 2, name: 'Shatabdi Express', from: 'NDLS', to: 'CDG', class: 'shatabdi', year: 1988 },
      3: { id: 3, name: 'Duronto Express', from: 'HWH', to: 'BCT', class: 'duronto', year: 2009 },
      4: { id: 4, name: 'Garib Rath', from: 'NDLS', to: 'MAS', class: 'garibrath', year: 2006 },
      5: { id: 5, name: 'Vande Bharat', from: 'NDLS', to: 'SVDK', class: 'vandebharat', year: 2019 },
    };

    // ─── Single route parameter — /trains/:id ──────────────────
    app.get('/trains/:id', (req, res) => {
      // WHY: :id in the path becomes req.params.id.
      // Express extracts it and (in v5) decodes it automatically.
      const { id } = req.params;
      const train = catalog[id];
      if (!train) return res.status(404).json({ error: `Train ${id} not found` });
      res.json(train);
    });

    // ─── Query strings — /trains?class=rajdhani&page=1&limit=2 ──
    app.get('/trains', (req, res) => {
      // WHY: req.query is auto-parsed from the URL query string.
      // All values are STRINGS — you must cast numbers yourself.
      const { class: trainClass, page = '1', limit = '10' } = req.query;
      let results = Object.values(catalog);

      // Filter by class if provided
      if (trainClass) {
        results = results.filter((t) => t.class === trainClass);
      }

      // Pagination
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const start = (pageNum - 1) * limitNum;
      const paged = results.slice(start, start + limitNum);

      res.json({
        total: results.length,
        page: pageNum,
        limit: limitNum,
        data: paged,
      });
    });

    // ─── Express 5 auto-decoding demo ─────────────────────────
    app.get('/search/:term', (req, res) => {
      // WHY: In Express 5, req.params.term is already decoded.
      // 'hello%20world' becomes 'hello world' — no manual
      // decodeURIComponent() needed.
      res.json({ searchTerm: req.params.term, decoded: true });
    });

    const server = app.listen(0, async () => {
      const port = server.address().port;
      const base = `http://127.0.0.1:${port}`;
      console.log('=== BLOCK 1: Route Params and Query Strings ===');
      console.log(`Server running on port ${port}\n`);

      try {
        // ─── Test single param ────────────────────────────────
        const train1Res = await fetch(`${base}/trains/1`);
        const train1 = await train1Res.json();
        console.log('GET /trains/1:', JSON.stringify(train1));
        // Output: GET /trains/1: {"id":1,"name":"Rajdhani Express","from":"NDLS","to":"BCT","class":"rajdhani","year":1969}

        // ─── Test param not found ─────────────────────────────
        const nfRes = await fetch(`${base}/trains/999`);
        const nfData = await nfRes.json();
        console.log('GET /trains/999:', nfRes.status, JSON.stringify(nfData));
        // Output: GET /trains/999: 404 {"error":"Train 999 not found"}

        // ─── Test query string — filter by class ──────────────
        const rajdhaniRes = await fetch(`${base}/trains?class=rajdhani`);
        const rajdhaniData = await rajdhaniRes.json();
        console.log('GET /trains?class=rajdhani:', JSON.stringify(rajdhaniData));
        // Output: GET /trains?class=rajdhani: {"total":1,"page":1,"limit":10,"data":[{"id":1,"name":"Rajdhani Express","from":"NDLS","to":"BCT","class":"rajdhani","year":1969}]}

        // ─── Test query string — pagination ───────────────────
        const pageRes = await fetch(`${base}/trains?class=rajdhani&page=1&limit=1`);
        const pageData = await pageRes.json();
        console.log('GET /trains?class=rajdhani&page=1&limit=1:', JSON.stringify(pageData));
        // Output: GET /trains?class=rajdhani&page=1&limit=1: {"total":1,"page":1,"limit":1,"data":[{"id":1,"name":"Rajdhani Express","from":"NDLS","to":"BCT","class":"rajdhani","year":1969}]}

        // ─── Test Express 5 auto-decoding ─────────────────────
        const decodeRes = await fetch(`${base}/search/hello%20world`);
        const decodeData = await decodeRes.json();
        console.log('GET /search/hello%20world:', JSON.stringify(decodeData));
        // Output: GET /search/hello%20world: {"searchTerm":"hello world","decoded":true}
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
// BLOCK 2 — Param Validation, Multiple Params, Combining Both
// ════════════════════════════════════════════════════════════════

function block2_validationAndMultipleParams() {
  return new Promise((resolve) => {
    const app = express();

    // In-memory data — stations containing trains
    const stations = {
      NDLS: {
        name: 'New Delhi',
        trains: {
          '12301': { code: '12301', name: 'Rajdhani Express' },
          '12002': { code: '12002', name: 'Shatabdi Express' },
        },
      },
      BCT: {
        name: 'Mumbai Central',
        trains: {
          '12951': { code: '12951', name: 'Mumbai Rajdhani' },
          '12903': { code: '12903', name: 'Golden Temple Mail' },
        },
      },
    };

    // ─── Multiple route parameters ────────────────────────────
    app.get('/stations/:stationCode/trains/:trainCode', (req, res) => {
      // WHY: Multiple params capture multiple dynamic segments.
      // Each :name becomes a key in req.params.
      const { stationCode, trainCode } = req.params;

      const station = stations[stationCode];
      if (!station) {
        return res.status(404).json({ error: `Station '${stationCode}' not found` });
      }
      const train = station.trains[trainCode];
      if (!train) {
        return res.status(404).json({ error: `Train '${trainCode}' not at station '${stationCode}'` });
      }

      res.json({ station: station.name, train });
    });

    // ─── Parameter validation pattern ─────────────────────────
    //
    // Express 5 removed inline regex from route strings, so we
    // validate inside the handler (or use middleware).

    // Helper: validate that a string looks like a positive integer
    function isPositiveInt(str) {
      return /^\d+$/.test(str) && parseInt(str, 10) > 0;
    }

    app.get('/pnr/:pnrNumber', (req, res) => {
      const { pnrNumber } = req.params;

      // WHY: Always validate params before using them.  This
      // prevents garbage data from reaching your business logic.
      if (!isPositiveInt(pnrNumber)) {
        return res.status(400).json({
          error: 'pnrNumber must be a positive integer',
          received: pnrNumber,
        });
      }

      res.json({ pnrNumber: parseInt(pnrNumber, 10), status: `PNR #${pnrNumber} confirmed` });
    });

    // ─── Combining params + query strings ─────────────────────
    app.get('/stations/:stationCode/trains', (req, res) => {
      // WHY: Params identify the RESOURCE (which station).
      // Query strings configure the VIEW (sort, filter, paginate).
      // They serve different purposes and combine naturally.
      const { stationCode } = req.params;
      const { sort = 'name', order = 'asc' } = req.query;

      const station = stations[stationCode];
      if (!station) {
        return res.status(404).json({ error: `Station '${stationCode}' not found` });
      }

      let trains = Object.values(station.trains);

      // Sort trains
      trains.sort((a, b) => {
        const cmp = a[sort] < b[sort] ? -1 : a[sort] > b[sort] ? 1 : 0;
        return order === 'desc' ? -cmp : cmp;
      });

      res.json({
        station: station.name,
        sort,
        order,
        count: trains.length,
        trains,
      });
    });

    // ─── Param with special characters — Express 5 decoding ──
    app.get('/passengers/:name', (req, res) => {
      // WHY: Express 5 auto-decodes, so 'Amit%20Sharma'
      // becomes 'Amit Sharma' in req.params.name.
      res.json({ passenger: req.params.name });
    });

    // ─── Listing all stations (no params) ──────────────────────
    app.get('/stations', (req, res) => {
      res.json(Object.keys(stations).map((k) => ({ code: k, name: stations[k].name })));
    });

    const server = app.listen(0, async () => {
      const port = server.address().port;
      const base = `http://127.0.0.1:${port}`;
      console.log('=== BLOCK 2: Param Validation, Multiple Params, Combining ===');
      console.log(`Server running on port ${port}\n`);

      try {
        // ─── Test multiple params ─────────────────────────────
        const multiRes = await fetch(`${base}/stations/NDLS/trains/12301`);
        const multiData = await multiRes.json();
        console.log('GET /stations/NDLS/trains/12301:', JSON.stringify(multiData));
        // Output: GET /stations/NDLS/trains/12301: {"station":"New Delhi","train":{"code":"12301","name":"Rajdhani Express"}}

        // ─── Test multiple params — station not found ───────────
        const noStationRes = await fetch(`${base}/stations/XYZ/trains/12301`);
        const noStationData = await noStationRes.json();
        console.log('GET /stations/XYZ/trains/12301:', noStationRes.status, JSON.stringify(noStationData));
        // Output: GET /stations/XYZ/trains/12301: 404 {"error":"Station 'XYZ' not found"}

        // ─── Test multiple params — train not found ────────────
        const noTrainRes = await fetch(`${base}/stations/NDLS/trains/99999`);
        const noTrainData = await noTrainRes.json();
        console.log('GET /stations/NDLS/trains/99999:', noTrainRes.status, JSON.stringify(noTrainData));
        // Output: GET /stations/NDLS/trains/99999: 404 {"error":"Train '99999' not at station 'NDLS'"}

        // ─── Test param validation — valid ────────────────────
        const validRes = await fetch(`${base}/pnr/4521389076`);
        const validData = await validRes.json();
        console.log('GET /pnr/4521389076:', JSON.stringify(validData));
        // Output: GET /pnr/4521389076: {"pnrNumber":4521389076,"status":"PNR #4521389076 confirmed"}

        // ─── Test param validation — invalid ──────────────────
        const invalidRes = await fetch(`${base}/pnr/abc`);
        const invalidData = await invalidRes.json();
        console.log('GET /pnr/abc:', invalidRes.status, JSON.stringify(invalidData));
        // Output: GET /pnr/abc: 400 {"error":"pnrNumber must be a positive integer","received":"abc"}

        // ─── Test param validation — negative ─────────────────
        const negRes = await fetch(`${base}/pnr/-5`);
        const negData = await negRes.json();
        console.log('GET /pnr/-5:', negRes.status, JSON.stringify(negData));
        // Output: GET /pnr/-5: 400 {"error":"pnrNumber must be a positive integer","received":"-5"}

        // ─── Test combining params + query ────────────────────
        const comboRes = await fetch(`${base}/stations/NDLS/trains?sort=name&order=desc`);
        const comboData = await comboRes.json();
        console.log('GET /stations/NDLS/trains?sort=name&order=desc:', JSON.stringify(comboData));
        // Output: GET /stations/NDLS/trains?sort=name&order=desc: {"station":"New Delhi","sort":"name","order":"desc","count":2,"trains":[{"code":"12002","name":"Shatabdi Express"},{"code":"12301","name":"Rajdhani Express"}]}

        // ─── Test Express 5 auto-decoding with special chars ──
        const encodedRes = await fetch(`${base}/passengers/Amit%20Sharma`);
        const encodedData = await encodedRes.json();
        console.log('GET /passengers/Amit%20Sharma:', JSON.stringify(encodedData));
        // Output: GET /passengers/Amit%20Sharma: {"passenger":"Amit Sharma"}
      } catch (err) {
        console.error('Test error:', err.message);
      }

      server.close(() => {
        console.log('\nBlock 2 server closed.');
        resolve();
      });
    });
  });
}

// ════════════════════════════════════════════════════════════════
// Run all blocks sequentially, then exit
// ════════════════════════════════════════════════════════════════

async function main() {
  await block1_paramsAndQuery();
  await block2_validationAndMultipleParams();

  console.log('\n=== KEY TAKEAWAYS ===');
  console.log('1. req.params holds named :segments from the URL path — they identify WHICH resource.');
  console.log('2. req.query holds ?key=value pairs — they configure HOW the resource is returned.');
  console.log('3. Multiple params (/a/:x/b/:y) capture multiple dynamic segments into req.params.');
  console.log('4. All query values are strings — always parseInt/parseFloat when you need numbers.');
  console.log('5. Express 5 auto-decodes params: %20 becomes a space without manual decoding.');
  console.log('6. Express 5 removed inline regex from paths — validate in handlers or use RegExp objects.');
  console.log('7. Params = resource identity, Query = resource presentation — keep them separate.');

  process.exit(0);
}

main();
