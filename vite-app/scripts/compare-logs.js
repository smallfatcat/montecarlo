#!/usr/bin/env node
/*
Compare two poker log JSON files and report the first divergence.

Usage:
  node scripts/compare-logs.js [--strict] /path/to/logA.json /path/to/logB.json

Options:
  --strict  Compare full event objects (stable-JSON) if normalized compare finds no diff.

Notes:
  - The script expects each file to contain either an array of events or an object with an `events` array.
  - It prints the index and contents of the first differing event and dumps the enclosing hand from both files.
  - If still no normalized divergence, in strict mode it attempts a full-object diff.
  - If still equal, it checks per-hand fold counts and reports hands where fold-counts differ.
*/

import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Failed to parse JSON: ${filePath}`);
    throw e;
  }
}

function extractEvents(json) {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.events)) return json.events;
  // Heuristic: if it looks like an object keyed by indices, flatten values
  const values = json && typeof json === 'object' ? Object.values(json) : [];
  if (values.length && values.every(v => v && typeof v === 'object' && ('type' in v || 'handId' in v))) {
    return values;
  }
  return [];
}

function eventKey(ev) {
  // Normalize an event for comparison – focus on fields that matter for flow
  if (!ev || typeof ev !== 'object') return JSON.stringify(ev);
  const keyObj = {};
  const fields = [
    // NOTE: omit 'ts' so timestamp differences don't count as divergence
    'type','handId','buttonIndex','seat','seatIndex','action','amount','street',
    'toCall','stack','committedThisStreet','totalCommitted','hasFolded','isAllIn',
    // common payload shorthands
    'deckRemaining','deckTotal'
  ];
  for (const f of fields) if (f in ev) keyObj[f] = ev[f];
  // Also include nested action payloads if present
  if (ev.payload && typeof ev.payload === 'object') {
    const pf = ['seat','action','amount','toCall','street','handId'];
    keyObj.payload = {};
    for (const f of pf) if (f in ev.payload) keyObj.payload[f] = ev.payload[f];
  }
  return JSON.stringify(keyObj);
}

function stableStringify(obj) {
  const seen = new WeakSet();
  const stringify = (val) => {
    if (val && typeof val === 'object') {
      if (seen.has(val)) return '"[Circular]"';
      seen.add(val);
      if (Array.isArray(val)) return '[' + val.map(stringify).join(',') + ']';
      const keys = Object.keys(val).sort();
      return '{' + keys.map(k => JSON.stringify(k) + ':' + stringify(val[k])).join(',') + '}';
    }
    return JSON.stringify(val);
  };
  return stringify(obj);
}

function stripKeysDeep(val, keys) {
  if (Array.isArray(val)) return val.map(v => stripKeysDeep(v, keys));
  if (val && typeof val === 'object') {
    const out = {};
    for (const k of Object.keys(val)) {
      if (keys.has(k)) continue;
      out[k] = stripKeysDeep(val[k], keys);
    }
    return out;
  }
  return val;
}

function findHandBounds(events, idx) {
  // Find start of current hand (walk back to last hand_setup or handId change)
  let start = idx;
  let currentHandId = events[idx] && (events[idx].handId ?? (events[idx].payload && events[idx].payload.handId));
  for (let i = idx; i >= 0; i -= 1) {
    const e = events[i];
    const hid = e && (e.handId ?? (e.payload && e.payload.handId));
    if (e && e.type === 'hand_setup') { start = i; currentHandId = e.handId ?? currentHandId; break; }
    if (currentHandId != null && hid != null && hid !== currentHandId) { start = i + 1; break; }
    start = i;
  }
  // Find end of hand (walk forward until next hand_setup or different handId)
  let end = idx;
  for (let i = idx + 1; i < events.length; i += 1) {
    const e = events[i];
    const hid = e && (e.handId ?? (e.payload && e.payload.handId));
    if (e && e.type === 'hand_setup') { end = i - 1; break; }
    if (currentHandId != null && hid != null && hid !== currentHandId) { end = i - 1; break; }
    end = i;
  }
  return { start: Math.max(0, start), end: Math.min(events.length - 1, end) };
}

function formatEvent(ev) {
  if (!ev || typeof ev !== 'object') return String(ev);
  const shallow = { ...ev };
  // Trim large blobs
  if (shallow.deck) shallow.deck = `[${shallow.deck.length} cards]`;
  return JSON.stringify(shallow);
}

function main() {
  const argv = process.argv.slice(2);
  const files = argv.filter(a => !a.startsWith('-'));
  const flags = new Set(argv.filter(a => a.startsWith('-')));
  const strict = flags.has('--strict');
  const fileA = files[0];
  const fileB = files[1];
  if (!fileA || !fileB || files.length !== 2) {
    console.error('Usage: node scripts/compare-logs.js [--strict] <logA.json> <logB.json>');
    process.exit(1);
  }
  const jsonA = readJson(path.resolve(fileA));
  const jsonB = readJson(path.resolve(fileB));
  const eventsA = extractEvents(jsonA);
  const eventsB = extractEvents(jsonB);
  if (!eventsA.length || !eventsB.length) {
    console.error('Could not extract events array from one or both files. Expected an array or object with `events`.');
    process.exit(2);
  }

  const minLen = Math.min(eventsA.length, eventsB.length);
  let divergedAt = -1;
  for (let i = 0; i < minLen; i += 1) {
    const ekA = eventKey(eventsA[i]);
    const ekB = eventKey(eventsB[i]);
    if (ekA !== ekB) { divergedAt = i; break; }
  }

  if (divergedAt === -1) {
    if (eventsA.length !== eventsB.length) {
      console.log(`No content difference in first ${minLen} events; lengths differ: A=${eventsA.length} B=${eventsB.length}`);
      console.log(`Next event in longer file:`);
      const next = eventsA.length > eventsB.length ? eventsA[minLen] : eventsB[minLen];
      console.log(formatEvent(next));
      process.exit(0);
    }
    // Optional strict comparison of raw/stable JSON
    if (strict) {
      for (let i = 0; i < minLen; i += 1) {
        // Ignore timestamps during strict comparison
        const sa = stableStringify(stripKeysDeep(eventsA[i], new Set(['ts'])));
        const sb = stableStringify(stripKeysDeep(eventsB[i], new Set(['ts'])));
        if (sa !== sb) {
          divergedAt = i;
          console.log(`[STRICT] Divergence at index ${i}`);
          console.log('A:', eventsA[i]);
          console.log('B:', eventsB[i]);
          const boundsA = findHandBounds(eventsA, i);
          const boundsB = findHandBounds(eventsB, i);
          console.log('\n--- Enclosing hand A ---');
          eventsA.slice(boundsA.start, boundsA.end + 1).forEach((e, j) => console.log(`[${boundsA.start + j}]`, formatEvent(e)));
          console.log('\n--- Enclosing hand B ---');
          eventsB.slice(boundsB.start, boundsB.end + 1).forEach((e, j) => console.log(`[${boundsB.start + j}]`, formatEvent(e)));
          process.exit(0);
        }
      }
      // As a final aid: compare fold counts per handId
      const foldCounts = (evs) => {
        const m = new Map();
        for (const e of evs) {
          const hid = (e && (e.handId ?? (e.payload && e.payload.handId))) ?? -1;
          const act = (e && (e.action ?? (e.payload && e.payload.action))) ?? null;
          if (act === 'fold') m.set(hid, (m.get(hid) ?? 0) + 1);
        }
        return m;
      };
      const fa = foldCounts(eventsA);
      const fb = foldCounts(eventsB);
      for (const hid of new Set([...fa.keys(), ...fb.keys()])) {
        const ca = fa.get(hid) ?? 0;
        const cb = fb.get(hid) ?? 0;
        if (ca !== cb) {
          console.log(`[STRICT] Fold count differs for handId=${hid}: A=${ca} B=${cb}`);
          // Dump those hands
          const idxA = eventsA.findIndex(e => (e && (e.handId ?? (e.payload && e.payload.handId))) === hid);
          const idxB = eventsB.findIndex(e => (e && (e.handId ?? (e.payload && e.payload.handId))) === hid);
          const bA = idxA >= 0 ? findHandBounds(eventsA, idxA) : { start: 0, end: -1 };
          const bB = idxB >= 0 ? findHandBounds(eventsB, idxB) : { start: 0, end: -1 };
          console.log('\n--- Hand A ---');
          eventsA.slice(bA.start, bA.end + 1).forEach((e, j) => console.log(`[${bA.start + j}]`, formatEvent(e)));
          console.log('\n--- Hand B ---');
          eventsB.slice(bB.start, bB.end + 1).forEach((e, j) => console.log(`[${bB.start + j}]`, formatEvent(e)));
          process.exit(0);
        }
      }
    }
    console.log('No divergence found. Files appear identical at the event level.');
    process.exit(0);
  }

  console.log(`First divergence at index ${divergedAt}`);
  console.log('A:', formatEvent(eventsA[divergedAt]));
  console.log('B:', formatEvent(eventsB[divergedAt]));

  // Trace the enclosing hand
  const boundsA = findHandBounds(eventsA, divergedAt);
  const boundsB = findHandBounds(eventsB, divergedAt);
  const handA = eventsA.slice(boundsA.start, boundsA.end + 1);
  const handB = eventsB.slice(boundsB.start, boundsB.end + 1);
  const title = (evs) => {
    const hs = evs.find(e => e && e.type === 'hand_setup');
    const hid = hs ? (hs.handId ?? (hs.payload && hs.payload.handId)) : (evs[0] && (evs[0].handId ?? (evs[0].payload && evs[0].payload.handId)));
    return `handId=${hid != null ? hid : 'unknown'}`;
  };

  console.log('\n--- Enclosing hand in A (' + title(handA) + ') ---');
  handA.forEach((e, i) => console.log(`[${boundsA.start + i}]`, formatEvent(e)));

  console.log('\n--- Enclosing hand in B (' + title(handB) + ') ---');
  handB.forEach((e, i) => console.log(`[${boundsB.start + i}]`, formatEvent(e)));
}

// ESM entry guard
try {
  const isMain = (pathToFileURL(process.argv[1]).href === import.meta.url)
  if (isMain) main()
} catch {
  // Fallback: just run
  main()
}


