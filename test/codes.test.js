import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeCode, newCode, CODE_RE, codeStatus, checkSpeech, dailyCap } from "../worker/codes.js";

const fakeKV = () => {
  const m = new Map();
  return { m, get: async (k, t) => (m.has(k) ? (t === "json" ? JSON.parse(m.get(k)) : m.get(k)) : null), put: async (k, v) => { m.set(k, v); } };
};
const req = (code, ip = "1.2.3.4") => new Request("https://x/api/transcribe", { method: "POST", headers: { "cf-connecting-ip": ip, ...(code ? { "x-angelio-code": code } : {}) } });
const NOW = new Date("2026-11-12T10:00:00Z");

test("codes: made readable, typed loosely", () => {
  for (let i = 0; i < 200; i++) assert.match(newCode(), CODE_RE);
  assert.equal(normalizeCode(" k7qm 4xpa-2nwd "), "K7QM-4XPA-2NWD");
  assert.equal(normalizeCode("short"), null);
});

test("speech checks are open unless REQUIRE_CODE is on", async () => {
  const r = await checkSpeech(req(), {});
  assert.equal(r.ok, true);
});

test("free tries, then a code is needed", async () => {
  const env = { REQUIRE_CODE: "true", FREE_PER_DAY: "2", CODES: fakeKV() };
  for (let i = 0; i < 2; i++) { const r = await checkSpeech(req(), env, NOW); assert.equal(r.ok, true); await r.charge(); }
  const r = await checkSpeech(req(), env, NOW);
  assert.equal(r.ok, false); assert.equal(r.status, 402); assert.equal(r.body.reason, "need-code");
  // another family's network still has its free tries
  assert.equal((await checkSpeech(req(null, "5.6.7.8"), env, NOW)).ok, true);
});

test("a family code works up to its monthly limit; bad and revoked codes don't", async () => {
  const env = { REQUIRE_CODE: "true", CODES: fakeKV() };
  await env.CODES.put("code:K7QM-4XPA-2NWD", JSON.stringify({ name: "Smith", limit: 2 }));
  await env.CODES.put("code:AAAA-BBBB-CCCC", JSON.stringify({ name: "Old", limit: 9, revoked: true }));
  for (let i = 0; i < 2; i++) { const r = await checkSpeech(req("k7qm4xpa2nwd"), env, NOW); assert.equal(r.ok, true); await r.charge(); }
  assert.equal((await checkSpeech(req("K7QM-4XPA-2NWD"), env, NOW)).body.reason, "limit");
  assert.equal((await codeStatus(env, "K7QM-4XPA-2NWD", NOW)).left, 0);
  assert.equal((await codeStatus(env, "K7QM-4XPA-2NWD", new Date("2026-12-01T00:00:00Z"))).left, 2, "a new month starts fresh");
  assert.equal((await checkSpeech(req("ZZZZ-ZZZZ-ZZZZ"), env, NOW)).body.reason, "bad-code");
  assert.equal((await checkSpeech(req("AAAA-BBBB-CCCC"), env, NOW)).body.reason, "revoked");
});

test("the site-wide daily cap stops everything for the day", async () => {
  const env = { REQUIRE_CODE: "true", SPEECH_DAILY_CAP: "1", CODES: fakeKV() };
  const r = await checkSpeech(req(), env, NOW); await r.charge();
  assert.equal((await checkSpeech(req(null, "9.9.9.9"), env, NOW)).body.reason, "busy");
  const cap = { CODES: fakeKV() };
  let c = await dailyCap(cap, "tts", 1, NOW); assert.equal(c.ok, true); await c.charge();
  assert.equal((await dailyCap(cap, "tts", 1, NOW)).ok, false);
  assert.equal((await dailyCap({}, "tts", 1, NOW)).ok, true, "no KV: no limit");
});
